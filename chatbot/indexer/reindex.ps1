# Helper script to index PDFs (Windows PowerShell)
# Usage: .\reindex.ps1

# Edit these:
$WORKER_URL = "https://st-arc-chatbot.YOUR-USERNAME.workers.dev"
$ADMIN_PASSWORD = "YOUR_PASSWORD"
$env:GOOGLE_API_KEY = "YOUR_GOOGLE_API_KEY"

Write-Host "Indexing PDFs..." -ForegroundColor Cyan
python index_pdfs.py --worker-url $WORKER_URL --admin-password $ADMIN_PASSWORD

Write-Host ""
Write-Host "Indexing website..." -ForegroundColor Cyan
python index_website.py --worker-url $WORKER_URL --admin-password $ADMIN_PASSWORD

Write-Host ""
Write-Host "Done. Check admin panel." -ForegroundColor Green
