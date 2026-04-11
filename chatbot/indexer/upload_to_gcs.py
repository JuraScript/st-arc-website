#!/usr/bin/env python3
"""
Upload PDFs to Google Cloud Storage bucket
"""

import sys
from pathlib import Path
from google.cloud import storage

# Configuration
BUCKET_NAME = "st-arc-pdfs"
PDF_DIR = Path(__file__).parent / "pdfs"
PROJECT_ID = "default-gemini-project"  # Change if needed

def upload_pdfs():
    """Upload all PDFs from indexer/pdfs/ to GCS bucket"""

    # Initialize GCS client
    try:
        # Try using Application Default Credentials first
        client = storage.Client()
        print("[OK] Connected to GCS with default credentials")
    except Exception as e:
        print(f"[ERROR] Error connecting to GCS: {e}")
        print("Make sure you've run: gcloud auth application-default login")
        sys.exit(1)

    # Get bucket
    try:
        bucket = client.bucket(BUCKET_NAME)
        print(f"[OK] Using bucket: {BUCKET_NAME}")
    except Exception as e:
        print(f"[ERROR] Error accessing bucket: {e}")
        sys.exit(1)

    # Find all PDFs
    pdf_files = list(PDF_DIR.glob("*.pdf"))

    if not pdf_files:
        print(f"[ERROR] No PDF files found in {PDF_DIR}")
        sys.exit(1)

    print(f"[INFO] Found {len(pdf_files)} PDF(s) to upload:")
    for pdf in sorted(pdf_files):
        print(f"   - {pdf.name}")

    # Upload PDFs
    uploaded = 0
    for pdf_path in sorted(pdf_files):
        pdf_name = pdf_path.name
        blob = bucket.blob(pdf_name)

        try:
            blob.upload_from_filename(str(pdf_path))
            print(f"[OK] Uploaded: {pdf_name}")
            uploaded += 1
        except Exception as e:
            print(f"[ERROR] Failed to upload {pdf_name}: {e}")

    print(f"\n[DONE] Uploaded {uploaded}/{len(pdf_files)} PDFs")
    return uploaded == len(pdf_files)

if __name__ == "__main__":
    success = upload_pdfs()
    sys.exit(0 if success else 1)
