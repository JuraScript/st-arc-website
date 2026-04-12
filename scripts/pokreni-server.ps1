$port = 3000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Server pokrenut na adresi: http://localhost:$port/" -ForegroundColor Green
Write-Host "Pritisnite CTRL+C za gašenje web servera." -ForegroundColor Yellow

Start-Process "http://localhost:$port/" # Auto-opens browser on start

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $path = $request.Url.LocalPath.Replace('/', '\')
        if ($path -eq '\') { $path = '\index.html' }

        # Since script is in /scripts, we need to go up one level to root
        $rootDir = Split-Path -Parent $PSScriptRoot
        $filePath = Join-Path $rootDir $path
        
        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = 'application/octet-stream'
            
            switch ($ext) {
                '.html' { $mime = 'text/html; charset=utf-8' }
                '.css'  { $mime = 'text/css; charset=utf-8' }
                '.js'   { $mime = 'application/javascript; charset=utf-8' }
                '.pdf'  { $mime = 'application/pdf' }
                '.png'  { $mime = 'image/png' }
                '.svg'  { $mime = 'image/svg+xml' }
                '.jpg'  { $mime = 'image/jpeg' }
                '.jpeg' { $mime = 'image/jpeg' }
                '.woff2'{ $mime = 'font/woff2' }
                '.json' { $mime = 'application/json' }
                '.mp4'  { $mime = 'video/mp4' }
            }
            
            $response.ContentType = $mime
            # Add cache control to speed up subsequent loads
            $response.AddHeader("Cache-Control", "public, max-age=3600")
            
            # Streaming instead of reading all into memory
            $fileStream = [System.IO.File]::OpenRead($filePath)
            $response.ContentLength64 = $fileStream.Length
            
            $buffer = New-Object byte[] 65536 # 64KB buffer
            while (($bytesRead = $fileStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
                $response.OutputStream.Write($buffer, 0, $bytesRead)
            }
            $fileStream.Close()
            $fileStream.Dispose()
        } else {
            $response.StatusCode = 404
            Write-Host "404 Not Found: $path" -ForegroundColor Red
        }
        $response.Close()
    } catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($null -ne $response) { $response.Close() }
    }
}

