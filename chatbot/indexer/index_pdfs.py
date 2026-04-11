"""
Document Indexer for ST Arc Chatbot
Reads PDFs and TXT files from ./pdfs/, extracts text, chunks, embeds, and ships to the Worker.

Filename convention:
- PDFs: YYYY-name.pdf (e.g. 2025-uskrs.pdf, 2024-premium.pdf)
- TXT: name.txt (e.g. home.txt, o-nama.txt, usluge.txt - web content)
The year is parsed from the filename and used for recency boosting in search.

Usage:
    python index_pdfs.py --worker-url https://your-worker.workers.dev --admin-password YOUR_PASS
    python index_pdfs.py --worker-url ... --admin-password ... --only home.txt
"""

import argparse
import os
import re
import sys
import time
from pathlib import Path

import pdfplumber
import requests
import google.generativeai as genai
import numpy as np
from sklearn.random_projection import GaussianRandomProjection

PDFS_DIR = Path(__file__).parent / "pdfs"
CHUNK_SIZE = 600       # tokens (~ characters / 4)
CHUNK_OVERLAP = 100
EMBED_MODEL = "gemini-embedding-001"
TARGET_DIMENSIONS = 1536  # Cloudflare Vectorize max

# Global projector for dimension reduction (initialized on first use)
_projector = None

def get_projector(input_dim):
    """Create or return a random projection matrix."""
    global _projector
    if _projector is None:
        _projector = GaussianRandomProjection(n_components=TARGET_DIMENSIONS, random_state=42)
        # Fit with a dummy array
        _projector.fit(np.zeros((1, input_dim)))
    return _projector

def reduce_dimensions(vectors):
    """Reduce 3072-dim vectors to 1536-dim using random projection."""
    if not vectors:
        return vectors
    # Convert to numpy array
    arr = np.array(vectors)
    # If already small enough, return as is
    if arr.shape[1] <= TARGET_DIMENSIONS:
        return vectors
    # Otherwise, reduce dimensions
    projector = get_projector(arr.shape[1])
    reduced = projector.transform(arr)
    return reduced.tolist()


def parse_filename(filename: str):
    """Extract year and clean name from filename like '2025-uskrs.pdf'."""
    stem = Path(filename).stem
    match = re.match(r"^(\d{4})[-_](.+)$", stem)
    if match:
        year = int(match.group(1))
        name = match.group(2).replace("-", " ").replace("_", " ").title()
    else:
        year = 0
        name = stem.replace("-", " ").replace("_", " ").title()
    return year, name, stem


def extract_pages(pdf_path: Path):
    """Extract text from each page using pdfplumber, with pypdf fallback."""
    import pypdf

    pages = []
    # Try pdfplumber first (better for complex layouts)
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            try:
                text = page.extract_text() or ""
                text = text.strip()
                if text:
                    pages.append({"page": i, "text": text})
            except Exception as e:
                print(f"   [WARN]  Page {i} extract failed: {e}")

    # If pdfplumber didn't extract much, try pypdf as fallback
    if len(pages) < 2:
        print("   [->] Trying pypdf fallback...")
        pages = []
        with open(pdf_path, 'rb') as f:
            try:
                pdf = pypdf.PdfReader(f)
                for i, page in enumerate(pdf.pages, start=1):
                    try:
                        text = page.extract_text() or ""
                        text = text.strip()
                        if text:
                            pages.append({"page": i, "text": text})
                    except Exception as e:
                        print(f"   [WARN]  Page {i} fallback failed: {e}")
            except Exception as e:
                print(f"   [WARN]  pypdf failed: {e}")

    return pages


def extract_text_file(txt_path: Path):
    """Extract text from a .txt file, treating entire file as one 'page'."""
    pages = []
    try:
        with open(txt_path, 'r', encoding='utf-8') as f:
            text = f.read().strip()
            if text:
                pages.append({"page": 1, "text": text})
    except Exception as e:
        print(f"   [WARN]  Text file read failed: {e}")
    return pages


def chunk_text(text: str, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """Split text into overlapping chunks (character-based approximation of tokens)."""
    char_chunk = chunk_size * 4
    char_overlap = overlap * 4
    chunks = []
    start = 0
    while start < len(text):
        end = start + char_chunk
        chunk = text[start:end]
        # Try to break on sentence boundary
        if end < len(text):
            last_period = chunk.rfind(". ")
            if last_period > char_chunk * 0.6:
                chunk = chunk[: last_period + 1]
                end = start + last_period + 1
        chunks.append(chunk.strip())
        start = end - char_overlap
        if start >= len(text):
            break
    return [c for c in chunks if len(c) > 5]


def embed_batch(texts):
    """Embed multiple texts via Google API. Returns list of vectors."""
    embeddings = []
    for text in texts:
        result = genai.embed_content(
            model=EMBED_MODEL,
            content=text,
            task_type="retrieval_document"
        )
        embeddings.append(result['embedding'])
        time.sleep(0.6)  # Rate limit: 100 requests/min = 1 every 0.6s
    return embeddings


def index_document(doc_path: Path, worker_url: str, admin_password: str):
    year, catalog_name, doc_id = parse_filename(doc_path.name)
    file_ext = doc_path.suffix.lower()

    if file_ext == ".pdf":
        print(f"\n[PDF] {doc_path.name}")
        pages = extract_pages(doc_path)
        source_type = "pdf"
    elif file_ext == ".txt":
        print(f"\n[WEB] {doc_path.name}")
        pages = extract_text_file(doc_path)
        source_type = "webpage"
    else:
        print(f"\n[SKIP] {doc_path.name} - unsupported format")
        return

    print(f"   [->] catalog: {catalog_name}, year: {year}")
    print(f"   [->] extracted {len(pages)} pages with text")

    if not pages:
        print("   [WARN]  No text extracted, skipping")
        return

    # Build chunks per page (so each chunk knows its source page)
    all_chunks = []
    for page_data in pages:
        page_num = page_data["page"]
        for chunk_text_str in chunk_text(page_data["text"]):
            all_chunks.append({
                "text": chunk_text_str,
                "page": page_num,
            })

    print(f"   [->] {len(all_chunks)} chunks to embed")

    # Embed in batches
    batch_size = 10
    embedded = []
    for i in range(0, len(all_chunks), batch_size):
        batch = all_chunks[i : i + batch_size]
        texts = [c["text"] for c in batch]
        vectors = embed_batch(texts)
        for j, vec in enumerate(vectors):
            embedded.append({
                "text": batch[j]["text"],
                "embedding": vec,
                "metadata": {"page": batch[j]["page"]},
            })
        print(f"   [->] embedded {len(embedded)}/{len(all_chunks)}")

    # Reduce dimensions from 3072 to 1536 for Cloudflare Vectorize
    if embedded:
        vectors = [e["embedding"] for e in embedded]
        reduced_vectors = reduce_dimensions(vectors)
        for j, vec in enumerate(reduced_vectors):
            embedded[j]["embedding"] = vec

    # Send to Worker
    payload = {
        "doc_id": doc_id,
        "doc_metadata": {
            "source_type": source_type,
            "catalog_name": catalog_name,
            "year": year,
            "filename": doc_path.name,
        },
        "chunks": embedded,
    }

    res = requests.post(
        f"{worker_url}/api/ingest",
        json=payload,
        headers={"X-Admin-Password": admin_password},
        timeout=120,
    )
    if res.status_code == 200:
        print(f"   [OK] Indexed: {res.json()}")
    else:
        print(f"   [ERROR] Ingest failed: {res.status_code} {res.text}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--worker-url", required=True, help="Worker URL")
    parser.add_argument("--admin-password", required=True, help="Admin password")
    parser.add_argument("--google-api-key", default=os.getenv("GOOGLE_API_KEY"), help="Google API key (or set GOOGLE_API_KEY env)")
    parser.add_argument("--only", help="Index only this filename")
    args = parser.parse_args()

    if not args.google_api_key:
        print("[ERROR] Google API key required (--google-api-key or GOOGLE_API_KEY env)")
        sys.exit(1)

    if not PDFS_DIR.exists():
        PDFS_DIR.mkdir()
        print(f"[DIR] Created {PDFS_DIR} — drop your PDFs and TXT files here and re-run")
        sys.exit(0)

    genai.configure(api_key=args.google_api_key)

    # Get both PDF and TXT files
    documents = sorted(PDFS_DIR.glob("*.pdf")) + sorted(PDFS_DIR.glob("*.txt"))
    if args.only:
        documents = [d for d in documents if d.name == args.only]

    if not documents:
        print("[DIR] No PDFs or TXT files found in ./pdfs/")
        sys.exit(0)

    print(f"[INFO] Indexing {len(documents)} document(s)...")
    for doc in documents:
        try:
            index_document(doc, args.worker_url, args.admin_password)
        except Exception as e:
            print(f"   [ERROR] Failed: {e}")
    print("\n[DONE] Done!")


if __name__ == "__main__":
    main()
