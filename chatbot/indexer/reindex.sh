#!/bin/bash
# Helper script to index PDFs (Mac/Linux)
# Usage: ./reindex.sh

set -e

# Edit these:
WORKER_URL="https://st-arc-chatbot.YOUR-USERNAME.workers.dev"
ADMIN_PASSWORD="YOUR_PASSWORD"
GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY"

export GOOGLE_API_KEY

echo "🔄 Indexing PDFs..."
python index_pdfs.py --worker-url "$WORKER_URL" --admin-password "$ADMIN_PASSWORD"

echo ""
echo "🌐 Indexing website..."
python index_website.py --worker-url "$WORKER_URL" --admin-password "$ADMIN_PASSWORD"

echo ""
echo "✅ Done. Check admin panel."
