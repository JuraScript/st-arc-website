#!/usr/bin/env python3
"""
ST-ARC PDF indexer v2 — REGEX-DRIVEN, ne koristi pdfplumber.extract_tables().

Razlog: pdfplumber.extract_tables() na InDesign PDF-ovima ovog kataloga
fragmentira tablice (svaka ćelija postaje "tablica od 1 reda") i propušta
redove. Sirov tekst iz extract_text() je strukturno čist — koristimo regex.

Output: chunks_v2.json + opcionalno upload u Vectorize.

TESTIRANO na ST-ARC_SvjetlosneDekoracije katalogu (128 stranica, 341 šifra).
"""

import re
import os
import sys
import json
import time
import base64
import argparse
from pathlib import Path
from dataclasses import dataclass, asdict, field
from typing import Optional

import pdfplumber
import fitz  # PyMuPDF za rasterizaciju lookbook stranica
import google.generativeai as genai

# === KONFIGURACIJA ===
SCRIPT_DIR = Path(__file__).parent
PDF_DIR = SCRIPT_DIR / "pdfs"  # PDFs su u indexer/pdfs/
OUTPUT_JSON = SCRIPT_DIR / "chunks_v2.json"

GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
EMBED_DIM = 1536  # MORA biti isto kao u worker/src/gemini.js
EMBED_MODEL = "models/gemini-embedding-001"
VISION_MODEL = "gemini-2.5-flash"

# Threshold-ovi za detekciju tipa stranice
LOOKBOOK_TEXT_THRESHOLD = 80  # < ovog = lookbook stranica -> vision

# === REGEX ===
PRODUCT_CODE_RE = re.compile(r'\bST\s*[-–—]\s*[A-Z]?\d{2,4}\b', re.IGNORECASE)
DIMENSION_RE = re.compile(
    r'\d+(?:[,.]\d+)?\s*[x×]\s*\d+(?:[,.]\d+)?(?:\s*x\s*\d+(?:[,.]\d+)?)?(?:\s*cm)?',
    re.IGNORECASE
)
TABLE_ROW_WITH_CODE_RE = re.compile(
    r'^(ST\s*[-–—]?\s*[A-Z]?\d{2,4})\s+(.+)$', re.IGNORECASE
)

TABLE_HEADER_KEYWORDS = ['Šifra', 'Snaga', 'Napon', 'Duljina', 'Promjer',
                          'dioda', 'Težina', 'segmenata']
HEADER_LINE_TOKENS = {
    'duljina', 'broj', 'težina', 'promjer', 'snaga', 'napon', 'dioda',
    '(m)', '(kg)', 'segmenata', 'segmentu', 'efekti', 'opcija',
    'bljeskanja', 'ukupno', 'ukupna', 'po', 'max.', 'posebni'
}
SUBSECTION_KEYWORDS = ['model', 'upotreb', 'serij', 'tip', 'verzij', 'za ']


@dataclass
class Chunk:
    text: str
    page: int
    catalog_name: str
    year: str
    source_type: str
    product_code: Optional[str] = None
    product_name: Optional[str] = None
    dimensions: Optional[str] = None


# === UTILS ===

def normalize_code(code: str) -> str:
    return re.sub(r'\s*[-–—]\s*', '-', code.strip().upper())


def is_numeric_row(line: str) -> bool:
    tokens = line.split()
    if len(tokens) < 4:
        return False
    numeric = sum(1 for t in tokens if re.match(r'^\d+(?:[,.]\d+)?[a-zA-Z]*$', t))
    return numeric >= 3


def is_header_line(line: str) -> bool:
    tokens = [t.lower().strip('()') for t in line.split()]
    if not tokens:
        return False
    matches = sum(1 for t in tokens if t in HEADER_LINE_TOKENS)
    return matches >= len(tokens) * 0.6


def detect_page_type(text: str) -> str:
    char_count = len(text.strip())
    if char_count < LOOKBOOK_TEXT_THRESHOLD:
        return "lookbookC"

    code_count = len(PRODUCT_CODE_RE.findall(text))
    table_signal = sum(1 for s in TABLE_HEADER_KEYWORDS if s in text)
    has_numeric_rows = any(is_numeric_row(l.strip()) for l in text.split('\n'))

    if table_signal >= 3 and code_count >= 1:
        return "tableA_coded"
    if table_signal >= 3 and has_numeric_rows:
        return "tableA_uncoded"
    if code_count >= 1:
        return "galleryB"
    return "narrativeD"


# === EXTRACTORS ===

def extract_table_coded(text: str, page_num: int, catalog: str, year: str) -> list[Chunk]:
    """Tablica gdje svaki red ima šifru (npr. stranica 5 u katalogu)."""
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    section_title = lines[0] if lines else ""
    chunks = []
    current_subsection = ""

    for i, line in enumerate(lines):
        # Detekcija pod-sekcije ("Posebni svjetleći...", "Za unutrašnju upotrebu")
        if (not PRODUCT_CODE_RE.search(line)
                and 5 < len(line) < 60
                and not is_header_line(line)
                and not is_numeric_row(line)
                and i > 0
                and any(w in line.lower() for w in SUBSECTION_KEYWORDS)):
            current_subsection = line
            continue

        m = TABLE_ROW_WITH_CODE_RE.match(line)
        if not m:
            continue

        sifra = normalize_code(m.group(1))
        rest = m.group(2)

        parts = [section_title]
        if current_subsection:
            parts.append(current_subsection)
        parts.append(f"Šifra {sifra}")
        parts.append(rest)

        chunks.append(Chunk(
            text=". ".join(p for p in parts if p),
            page=page_num,
            catalog_name=catalog,
            year=year,
            source_type="table_row_coded",
            product_code=sifra,
        ))
    return chunks


def extract_table_uncoded(text: str, page_num: int, catalog: str, year: str) -> list[Chunk]:
    """
    Tablica BEZ šifri po retku (npr. stranica 20: 'Premium girlanda G' s 3 varijante).
    Naziv proizvoda iznad tablice, svaki numeric row = svoja varijanta.
    Stranica može imati više sub-tablica -> razdvajamo po nazivu.
    """
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    section_title = lines[0] if lines else ""
    chunks = []

    current_product = ""
    current_header_lines = []
    in_header = False

    for line in lines[1:]:
        if line.startswith('*') or line == str(page_num):
            continue

        if is_header_line(line):
            current_header_lines.append(line)
            in_header = True
            continue

        if is_numeric_row(line):
            in_header = False
            parts = [section_title]
            if current_product:
                parts.append(current_product)
            if current_header_lines:
                parts.append(f"Kolone: {' | '.join(current_header_lines)}")
            parts.append(f"Vrijednosti: {line}")
            chunks.append(Chunk(
                text=". ".join(p for p in parts if p),
                page=page_num,
                catalog_name=catalog,
                year=year,
                source_type="table_row_uncoded",
                product_name=current_product or None,
            ))
            continue

        # Naziv proizvoda (resetira sub-tablicu)
        if not in_header and 3 < len(line) < 60:
            current_product = line
            current_header_lines = []

    return chunks


def extract_gallery(text: str, page_num: int, catalog: str, year: str) -> list[Chunk]:
    """
    Galerija proizvoda (npr. stranica 60). 4-6 proizvoda na stranici, svaki sa
    nazivom (SVE VELIKO), šifrom i dimenzijama. Više naziva može biti u istoj
    liniji ('ASTERO STRING PALES') — split po broju šifri u sljedećoj liniji.
    """
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    chunks = []

    # Je li prva linija section title ili već naziv proizvoda?
    first_line = lines[0] if lines else ""
    looks_like_section = (
        first_line and not first_line.isupper()
        and any(w in first_line.lower() for w in [' i ', ' za ', ' u ', ' sa '])
    )
    section_title = first_line if looks_like_section else ""
    start_idx = 1 if looks_like_section else 0

    name_buffer = []

    for i in range(start_idx, len(lines)):
        line = lines[i]
        codes_in_line = PRODUCT_CODE_RE.findall(line)

        if not codes_in_line:
            # Možda naziv (jedan ili više)
            if line.isupper() and len(line) > 2 and not any(c.isdigit() for c in line):
                potential = re.split(r'\s{2,}', line)
                if len(potential) >= 2:
                    name_buffer = [n.strip() for n in potential if n.strip()]
                else:
                    # Jedan razmak - možda više naziva, gledaj broj šifri u sljedećoj liniji
                    words = line.split()
                    next_codes = 0
                    if i + 1 < len(lines):
                        next_codes = len(PRODUCT_CODE_RE.findall(lines[i + 1]))

                    if next_codes >= 2 and len(words) >= 2:
                        if next_codes == 2 and len(words) == 3:
                            name_buffer = [' '.join(words[:-1]), words[-1]]
                        elif next_codes == 2 and len(words) == 4:
                            name_buffer = [' '.join(words[:2]), ' '.join(words[2:])]
                        else:
                            mid = len(words) // 2
                            name_buffer = [' '.join(words[:mid]), ' '.join(words[mid:])]
                    else:
                        name_buffer = [line.strip()]
            continue

        # Linija ima šifre — extract dimenzije iz nje i (po potrebi) sljedeće
        dims = DIMENSION_RE.findall(line)
        if len(dims) < len(codes_in_line) and i + 1 < len(lines):
            next_line = lines[i + 1]
            if not PRODUCT_CODE_RE.search(next_line):
                dims.extend(DIMENSION_RE.findall(next_line))

        for j, raw_code in enumerate(codes_in_line):
            sifra = normalize_code(raw_code)
            dim = dims[j] if j < len(dims) else ""
            name = name_buffer[j] if j < len(name_buffer) else (
                name_buffer[-1] if name_buffer else ""
            )

            text_parts = []
            if section_title:
                text_parts.append(section_title)
            if name:
                text_parts.append(name)
            text_parts.append(f"Šifra {sifra}")
            if dim:
                text_parts.append(f"Dimenzije {dim}")

            chunks.append(Chunk(
                text=". ".join(text_parts),
                page=page_num,
                catalog_name=catalog,
                year=year,
                source_type="product_card",
                product_code=sifra,
                product_name=name or None,
                dimensions=dim or None,
            ))

    return chunks


def extract_narrative(text: str, page_num: int, catalog: str, year: str) -> list[Chunk]:
    """Uvod, sadržaj, kontakti — cijela stranica jedan chunk."""
    return [Chunk(
        text=text.strip(),
        page=page_num,
        catalog_name=catalog,
        year=year,
        source_type="narrative",
    )]


def extract_lookbook(pdf_path: Path, page_num: int, catalog: str, year: str) -> list[Chunk]:
    """Rasteriziraj cijelu stranicu i pošalji vision-u za opis."""
    doc = fitz.open(pdf_path)
    page = doc[page_num - 1]
    pix = page.get_pixmap(dpi=120)
    img_bytes = pix.tobytes("png")
    doc.close()

    img_b64 = base64.b64encode(img_bytes).decode()

    prompt = f"""Ovo je stranica {page_num} iz kataloga svjetlosnih dekoracija "{catalog}".
Opiši što vidiš u 2-3 rečenice na hrvatskom. Fokusiraj se na:
- Tip okruženja (drvo u parku, grad, jedrenjak, fasada, interijer, dvorište...)
- Vrstu dekoracija (svjetleće kugle, zvijezde, girlande, projektori...)
- Karakteristične vizualne elemente koje bi netko mogao tražiti

VAŽNO: NEMOJ izmišljati nazive proizvoda, šifre ili dimenzije. Samo vizualni opis."""

    try:
        model = genai.GenerativeModel(VISION_MODEL)
        response = model.generate_content([
            {"mime_type": "image/png", "data": img_b64},
            prompt
        ])
        description = (response.text or "").strip()
    except Exception as e:
        print(f"  [VISION ERROR p{page_num}]: {e}")
        return []

    if not description:
        return []

    return [Chunk(
        text=f"Ambijentalna fotografija (stranica {page_num}): {description}",
        page=page_num,
        catalog_name=catalog,
        year=year,
        source_type="vision_lookbook",
    )]


# === MAIN ===

def process_pdf(pdf_path: Path, catalog: str, year: str, skip_vision: bool = False) -> list[Chunk]:
    all_chunks = []
    type_counts = {}
    print(f"\n[PDF] {pdf_path.name}")

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            ptype = detect_page_type(text)
            type_counts[ptype] = type_counts.get(ptype, 0) + 1

            if ptype == "tableA_coded":
                chunks = extract_table_coded(text, page_num, catalog, year)
            elif ptype == "tableA_uncoded":
                chunks = extract_table_uncoded(text, page_num, catalog, year)
            elif ptype == "galleryB":
                chunks = extract_gallery(text, page_num, catalog, year)
            elif ptype == "narrativeD":
                chunks = extract_narrative(text, page_num, catalog, year)
            elif ptype == "lookbookC":
                if skip_vision:
                    chunks = []
                else:
                    chunks = extract_lookbook(pdf_path, page_num, catalog, year)
                    time.sleep(0.5)  # rate limit
            else:
                chunks = []

            all_chunks.extend(chunks)
            print(f"  p{page_num:3d} [{ptype:18s}] -> {len(chunks):2d} chunks")

    print(f"\n  Type distribution: {type_counts}")
    print(f"  Total chunks: {len(all_chunks)}")
    return all_chunks


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--skip-vision', action='store_true',
                        help='Preskoči vision pozive (za brzi dry run)')
    parser.add_argument('--pdf-dir', type=Path, default=PDF_DIR)
    parser.add_argument('--output', type=Path, default=OUTPUT_JSON)
    args = parser.parse_args()

    if not GEMINI_API_KEY:
        print("ERROR: GOOGLE_API_KEY not set")
        sys.exit(1)
    genai.configure(api_key=GEMINI_API_KEY)

    pdfs = sorted(args.pdf_dir.glob("*.pdf"))
    if not pdfs:
        print(f"No PDFs in {args.pdf_dir}")
        sys.exit(1)

    all_chunks = []
    for pdf_path in pdfs:
        stem = pdf_path.stem
        year_match = re.search(r'(20\d{2})', stem)
        year = year_match.group(1) if year_match else "unknown"
        catalog = re.sub(r'[_\-]+', ' ', stem).strip()

        chunks = process_pdf(pdf_path, catalog, year, skip_vision=args.skip_vision)
        all_chunks.extend(chunks)

    args.output.write_text(
        json.dumps([asdict(c) for c in all_chunks], ensure_ascii=False, indent=2),
        encoding='utf-8'
    )
    print(f"\n[OK] {len(all_chunks)} total chunks -> {args.output}")
    print("\nSljedeći koraci:")
    print("1. Pregledaj chunks_v2.json ručno (provjeri 5-10 chunkova)")
    print("2. Pokreni embed_and_upload.py (treba ga još napisati) za upload u Vectorize")
    print("3. Provjeri da je novi index popunjen prije nego prebaciš binding u Workeru")


if __name__ == "__main__":
    main()
