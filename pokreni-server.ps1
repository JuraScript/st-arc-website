$port = 8081
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Server pokrenut na adresi: http://localhost:$port/" -ForegroundColor Green
Write-Host "Pritisnite CTRL+C za gašenje web servera." -ForegroundColor Yellow

Start-Process "http://localhost:$port/"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $path = $request.Url.LocalPath.Replace('/', '\')
        if ($path -eq '\') { $path = '\index.html' }
        
        $filePath = Join-Path (Get-Location).Path $path
        
        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = 'application/octet-stream'
            
            switch ($ext) {
                '.html' { $mime = 'text/html' }
                '.css'  { $mime = 'text/css' }
                '.js'   { $mime = 'application/javascript' }
                '.pdf'  { $mime = 'application/pdf' }
                '.png'  { $mime = 'image/png' }
                '.svg'  { $mime = 'image/svg+xml' }
                '.jpg'  { $mime = 'image/jpeg' }
                '.woff2'{ $mime = 'font/woff2' }
                '.json' { $mime = 'application/json' }
            }
            
            $response.ContentType = $mime
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    } catch {
        # Ignore errors
    }
}
