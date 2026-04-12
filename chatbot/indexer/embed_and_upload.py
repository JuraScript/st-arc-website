#!/usr/bin/env python3
"""
Embed chunks_v2.json sa Gemini embedding-001 i uploaduj u Vectorize.

Workflow:
1. Učita chunks_v2.json
2. Za svaki chunk embedira sa Gemini embedding-001 (output_dimensionality=1536, task_type="retrieval_document")
3. Uploaduje u Cloudflare Vectorize via `/api/ingest` endpoint
"""

import os
import json
import time
from pathlib import Path
from typing import Optional

import google.generativeai as genai
import requests

# === KONFIGURACIJA ===
SCRIPT_DIR = Path(__file__).parent
CHUNKS_FILE = SCRIPT_DIR / "chunks_v2.json"

GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
WORKER_URL = os.getenv("WORKER_URL", "https://st-arc-chatbot.profes-xa.workers.dev")

EMBED_MODEL = "models/gemini-embedding-001"
EMBED_DIM = 1536
TASK_TYPE_DOC = "retrieval_document"

BATCH_SIZE = 3  # Uploaduj po 3 chunka odjednom (manji payload = brži upload)


def embed_text(text: str, api_key: str) -> list[float]:
    """Embedira tekst sa Gemini embedding-001."""
    try:
        genai.configure(api_key=api_key)
        result = genai.embed_content(
            model=EMBED_MODEL,
            content=text,
            task_type=TASK_TYPE_DOC,
            output_dimensionality=EMBED_DIM,
        )
        # Pravi format: result["embedding"]["values"]
        embedding = result["embedding"]["values"] if "values" in result.get("embedding", {}) else result["embedding"]
        return embedding
    except Exception as e:
        print(f"[EMBED ERROR]: {e}")
        raise


def upload_batch(chunks_with_embeddings: list[dict], doc_id: str, doc_metadata: dict) -> bool:
    """Uploaduje batch chunkova u Vectorize."""
    payload = {
        "doc_id": doc_id,
        "doc_metadata": doc_metadata,
        "chunks": chunks_with_embeddings,
    }

    headers = {
        "Content-Type": "application/json",
        "X-Admin-Password": ADMIN_PASSWORD,
    }

    endpoint = f"{WORKER_URL}/api/ingest"

    try:
        resp = requests.post(endpoint, json=payload, headers=headers, timeout=60)
        print(f"    Response: {resp.status_code} - {resp.text[:200]}")  # DEBUG
        if resp.status_code == 200:
            result = resp.json()
            print(f"  [OK] Uploaded {result.get('chunks_indexed', 0)} chunks")
            return True
        else:
            print(f"  [ERROR] {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        print(f"  [ERROR] Upload failed: {e}")
        return False


def main():
    if not GEMINI_API_KEY:
        print("ERROR: GOOGLE_API_KEY not set")
        return

    if not ADMIN_PASSWORD:
        print("ERROR: ADMIN_PASSWORD not set")
        return

    if not CHUNKS_FILE.exists():
        print(f"ERROR: {CHUNKS_FILE} not found")
        return

    print(f"Loading {CHUNKS_FILE}...")
    with open(CHUNKS_FILE, encoding="utf-8") as f:
        all_chunks = json.load(f)

    print(f"Total chunks: {len(all_chunks)}")

    # Skupi po katalogu
    by_catalog = {}
    for chunk in all_chunks:
        catalog = chunk["catalog_name"]
        if catalog not in by_catalog:
            by_catalog[catalog] = []
        by_catalog[catalog].append(chunk)

    # Procesira svaki katalog
    for catalog_name, chunks in sorted(by_catalog.items()):
        print(f"\n[CATALOG] {catalog_name} ({len(chunks)} chunks)")

        # Document ID = catalog name normalized
        doc_id = catalog_name.lower().replace(" ", "-").replace("ž", "z").replace("š", "s").replace("č", "c")
        doc_metadata = {
            "source_type": "pdf",
            "catalog_name": catalog_name,
            "year": chunks[0].get("year", "unknown") if chunks else "unknown",
        }

        # Embed all chunks for this catalog
        chunks_with_embeddings = []
        for i, chunk in enumerate(chunks, 1):
            chunk_text = chunk["text"]

            print(f"  [{i}/{len(chunks)}] Embedding... ", end="", flush=True)
            try:
                embedding = embed_text(chunk_text, GEMINI_API_KEY)
                chunk_for_upload = {
                    "text": chunk_text,
                    "embedding": embedding,
                    "metadata": {
                        "page": chunk.get("page"),
                        "source_type": chunk.get("source_type"),
                        "product_code": chunk.get("product_code"),
                        "product_name": chunk.get("product_name"),
                        "dimensions": chunk.get("dimensions"),
                    }
                }
                chunks_with_embeddings.append(chunk_for_upload)
                print("[DONE]")

                # Rate limit
                time.sleep(0.5)

            except Exception as e:
                print(f"[SKIP] {e}")
                continue

        # Upload all chunks for this catalog at once (not in batches to avoid overwriting)
        if chunks_with_embeddings:
            print(f"  Uploading all {len(chunks_with_embeddings)} chunks for {catalog_name}...")
            if not upload_batch(chunks_with_embeddings, doc_id, doc_metadata):
                print("  [ABORT] Upload failed, stopping")
                return

    print("\n[OK] All chunks embedded and uploaded!")


if __name__ == "__main__":
    main()
