"""
Website Indexer for ST Arc Chatbot
Crawls the ST Arc website and indexes all text content per section.

Since the site is a hash-routed SPA on GitHub Pages, we fetch the source files
directly from GitHub raw content, plus the rendered HTML for the main page.

Usage:
    python index_website.py --worker-url ... --admin-password ...
"""

import argparse
import os
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from google import genai
from google.genai import types

EMBED_MODEL = "gemini-embedding-001"

# Sections to crawl. We use the rendered HTML which contains all SPA content
# (the build inlines all sections in the HTML for SEO/SPA hydration).
SITE_BASE = "https://jurascript.github.io/st-arc-website/"

# Section markers in the rendered HTML
SECTIONS = [
    {"id": "home", "title": "Naslovna", "url": SITE_BASE},
    {"id": "projekti", "title": "Projekti", "url": SITE_BASE + "#/svi-projekti"},
    {"id": "o-nama", "title": "O nama", "url": SITE_BASE + "#/o-nama"},
    {"id": "usluge", "title": "Usluge", "url": SITE_BASE + "#/usluge"},
    {"id": "katalozi", "title": "Katalozi", "url": SITE_BASE + "#/katalozi"},
    {"id": "kontakt", "title": "Kontakt", "url": SITE_BASE + "#/kontakt"},
]


def fetch_html(url):
    res = requests.get(url, timeout=30)
    res.raise_for_status()
    return res.text


def extract_text_sections(html):
    """Extract meaningful text blocks from the rendered HTML, grouped by visible section."""
    soup = BeautifulSoup(html, "html.parser")
    # Remove scripts/styles
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    sections = []
    # Try to find <section> elements first
    section_elems = soup.find_all(["section", "main", "article"])
    if section_elems:
        for elem in section_elems:
            text = elem.get_text(separator=" ", strip=True)
            text = re.sub(r"\s+", " ", text)
            if len(text) > 100:
                # Try to get a title for the section
                heading = elem.find(["h1", "h2", "h3"])
                title = heading.get_text(strip=True) if heading else "Section"
                sections.append({"title": title, "text": text})
    else:
        # Fallback: split by headings
        body_text = soup.body.get_text(separator="\n", strip=True) if soup.body else ""
        if body_text:
            sections.append({"title": "Page", "text": re.sub(r"\s+", " ", body_text)})

    return sections


def chunk_text(text, chunk_size=600, overlap=100):
    char_chunk = chunk_size * 4
    char_overlap = overlap * 4
    chunks = []
    start = 0
    while start < len(text):
        end = start + char_chunk
        chunk = text[start:end]
        if end < len(text):
            last_period = chunk.rfind(". ")
            if last_period > char_chunk * 0.6:
                chunk = chunk[: last_period + 1]
                end = start + last_period + 1
        chunks.append(chunk.strip())
        start = end - char_overlap
        if start >= len(text):
            break
    return [c for c in chunks if len(c) > 50]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--worker-url", required=True)
    parser.add_argument("--admin-password", required=True)
    parser.add_argument("--google-api-key", default=os.getenv("GOOGLE_API_KEY"))
    args = parser.parse_args()

    if not args.google_api_key:
        print("❌ Google API key required")
        sys.exit(1)

    client = genai.Client(api_key=args.google_api_key)

    all_chunks = []

    # Crawl all sections
    for page_section in SECTIONS:
        print(f"🌐 Fetching {page_section['title']} ({page_section['url']})")
        try:
            html = fetch_html(page_section['url'])
            sections = extract_text_sections(html)
            print(f"   ↳ found {len(sections)} text sections")

            for section in sections:
                for chunk in chunk_text(section["text"]):
                    all_chunks.append({
                        "text": chunk,
                        "metadata": {
                            "page_title": f"{page_section['title']} - {section['title']}",
                            "url": page_section['url'],
                            "section_id": page_section['id'],
                        },
                    })
        except Exception as e:
            print(f"   ❌ Error fetching {page_section['title']}: {e}")

    print(f"📝 Total {len(all_chunks)} chunks")

    # Embed
    embedded = []
    for i, c in enumerate(all_chunks):
        result = client.models.embed_content(
            model=EMBED_MODEL,
            contents=c["text"],
            config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
        )
        # Reduce 3072 dims to 1536 by averaging pairs
        full_vector = result.embeddings[0].values
        reduced = []
        for j in range(0, len(full_vector), 2):
            reduced.append((full_vector[j] + (full_vector[j + 1] if j + 1 < len(full_vector) else 0)) / 2)

        embedded.append({
            "text": c["text"],
            "embedding": reduced,
            "metadata": c["metadata"],
        })
        if (i + 1) % 10 == 0:
            print(f"   ↳ embedded {i + 1}/{len(all_chunks)}")
        time.sleep(0.05)

    # Ship to worker
    payload = {
        "doc_id": "website-main",
        "doc_metadata": {
            "source_type": "website",
            "site_name": "ST Arc Website",
            "year": 2025,  # treat as current
        },
        "chunks": embedded,
    }
    res = requests.post(
        f"{args.worker_url}/api/ingest",
        json=payload,
        headers={"X-Admin-Password": args.admin_password},
        timeout=120,
    )
    if res.status_code == 200:
        print(f"✅ {res.json()}")
    else:
        print(f"❌ {res.status_code} {res.text}")


if __name__ == "__main__":
    main()
