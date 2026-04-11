#!/usr/bin/env python3
"""
Process PDFs with Document AI + Gemini Vision
1. Extract PDFs to images using pymupdf
2. Use Gemini Vision to analyze each image
3. Combine text + image descriptions
4. Chunk and embed with Gemini
5. Index in Vectorize
"""

import sys
import json
import time
import base64
import os
from pathlib import Path
from google.cloud import storage
import fitz  # pymupdf
import google.generativeai as genai

# Configuration
PDF_DIR = Path(__file__).parent / "pdfs"
BUCKET_NAME = "st-arc-pdfs"
VECTORIZE_URL = "https://st-arc-chatbot.profes-xa.workers.dev/api/ingest"
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GEMINI_API_KEY:
    print("ERROR: GOOGLE_API_KEY environment variable not set!")
    sys.exit(1)

genai.configure(api_key=GEMINI_API_KEY)

def extract_pdf_images(pdf_path):
    """Extract all images and text from PDF"""
    print(f"[INFO] Processing {pdf_path.name}...")
    doc = fitz.open(pdf_path)

    pages_data = []
    for page_num in range(len(doc)):
        page = doc[page_num]

        # Extract text
        text = page.get_text()

        # Extract images
        images = []
        image_list = page.get_images()
        for img_index, img in enumerate(image_list):
            xref = img[0]
            pix = fitz.Pixmap(doc, xref)
            img_data = pix.tobytes("png")
            images.append({
                "index": img_index,
                "data": base64.b64encode(img_data).decode(),
                "format": "png"
            })

        pages_data.append({
            "page": page_num + 1,
            "text": text,
            "images": images
        })

    doc.close()
    return pages_data

def analyze_image_with_vision(image_data_b64):
    """Use Gemini Vision to describe image"""
    try:
        prompt = """Describe this image in detail. If it shows products, installations,
        technical diagrams, or any visual information, explain what you see clearly.
        Be specific about colors, materials, layout, and any technical details."""

        model = genai.GenerativeModel("gemini-2.0-flash")

        response = model.generate_content([
            {
                "mime_type": "image/png",
                "data": image_data_b64
            },
            prompt
        ])

        return response.text
    except Exception as e:
        print(f"[ERROR] Vision analysis failed: {e}")
        return ""

def process_pdf(pdf_path, catalog_name, year):
    """Process PDF and return structured data"""
    print(f"[INFO] Extracting PDF: {pdf_path.name}")
    pages_data = extract_pdf_images(pdf_path)

    chunks = []
    for page_data in pages_data:
        page_num = page_data["page"]
        text = page_data["text"].strip()
        images = page_data["images"]

        # Build content from text + image descriptions
        content = text

        # Analyze each image
        for img in images:
            print(f"[INFO] Analyzing image on page {page_num}...")
            vision_desc = analyze_image_with_vision(img["data"])
            if vision_desc:
                content += f"\n\n[IMAGE DESCRIPTION]: {vision_desc}"
            time.sleep(0.5)  # Rate limiting

        if content.strip():
            chunks.append({
                "text": content,
                "page": page_num,
                "catalog_name": catalog_name,
                "year": year,
                "source_type": "pdf"
            })

    return chunks

def main():
    """Process all PDFs"""
    pdf_files = list(PDF_DIR.glob("*.pdf"))

    if not pdf_files:
        print(f"[ERROR] No PDFs found in {PDF_DIR}")
        return

    print(f"[INFO] Found {len(pdf_files)} PDFs")

    for pdf_path in sorted(pdf_files):
        # Parse catalog and year from filename
        name_parts = pdf_path.stem.split("-")
        year = name_parts[0]
        catalog = "-".join(name_parts[1:]).replace("-", " ").title()

        try:
            chunks = process_pdf(pdf_path, catalog, year)
            print(f"[OK] {pdf_path.name}: {len(chunks)} chunks extracted")

            # TODO: Embed and send to Vectorize

        except Exception as e:
            print(f"[ERROR] Failed to process {pdf_path.name}: {e}")

if __name__ == "__main__":
    main()
