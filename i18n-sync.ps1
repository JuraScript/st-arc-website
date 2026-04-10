# i18n-sync.ps1
# 
# Ovaj skript sinkronizira albume iz 'js/projects-data.js' s prijevodima u 'js/lang.js'.
# Pokrenite ovo svaki put kad dodate nove albume: 
# .\i18n-sync.ps1

Write-Host "--- Sinkronizacija prijevoda započeta ---" -ForegroundColor Cyan

$projectsPath = Join-Path $PSScriptRoot "js/projects-data.js"
$langPath = Join-Path $PSScriptRoot "js/lang.js"

if (!(Test-Path $projectsPath)) {
    Write-Error "Greška: Nije moguće pronaći $projectsPath"
    return
}

# 1. Pročitaj projekte (vađenje JSON dijela pomoću regexa)
$projectsContent = Get-Content $projectsPath -Raw
$match = [regex]::Match($projectsContent, 'const PROJECT_ALBUMS = (\[[\s\S]*?\]);')

if (!$match.Success) {
    Write-Error "Greška: Nije moguće pronaći PROJECT_ALBUMS u $projectsPath"
    return
}

$albumsJson = $match.Groups[1].Value
$albums = $albumsJson | ConvertFrom-Json
Write-Host "Pronađeno $($albums.Count) albuma u projektu."

# 2. Pročitaj lang.js
$langContent = Get-Content $langPath -Raw
$languages = @('hr', 'en', 'de', 'fr', 'it', 'ru', 'zh', 'ar')
$updated = $false

foreach ($lang in $languages) {
    # Pronađi sekciju za jezik: lang: { ... }
    $langRegex = [regex]::new("$lang:\s*{([\s\S]*?)}")
    $langMatch = $langRegex.Match($langContent)
    
    if (!$langMatch.Success) {
        Write-Warning "Upozorenje: Nije moguće pronaći sekciju za jezik '$lang'"
        continue
    }

    $sectionContent = $langMatch.Groups[0].Value
    $innerContent = $langMatch.Groups[1].Value
    $modifiedSection = $sectionContent

    foreach ($album in $albums) {
        $keys = @(
            @{ key = "album_$($album.slug)_title"; val = $album.title },
            @{ key = "album_$($album.slug)_title_em"; val = "<em>$($album.title)</em>" },
            @{ key = "album_$($album.slug)_subtitle"; val = $album.subtitle }
        )

        foreach ($k in $keys) {
            # Provjeri postoji li ključ već u cijelom lang.js sekciji
            if ($sectionContent -notmatch ["'"] + $k.key + ["'"] -and $sectionContent -notmatch ['"'] + $k.key + ['"'] -and $sectionContent -notmatch $k.key + ':') {
                Write-Host "Dodajem ključ [$($k.key)] za jezik [$lang]..." -ForegroundColor Yellow
                
                # Umetni novi redak nakon početka '{'
                $insertIdx = $modifiedSection.IndexOf('{') + 1
                $cleanVal = $k.val.Replace('"', '\"')
                $newKeyLine = "`n    ""$($k.key)"": ""$cleanVal"","
                
                $modifiedSection = $modifiedSection.Insert($insertIdx, $newKeyLine)
                $updated = $true
            }
        }
    }

    if ($modifiedSection -ne $langMatch.Groups[0].Value) {
        $langContent = $langContent.Replace($langMatch.Groups[0].Value, $modifiedSection)
    }
}

if ($updated) {
    [System.IO.File]::WriteAllText($langPath, $langContent, [System.Text.Encoding]::UTF8)
    Write-Host "Uspješno ažuriran lang.js novim ključevima." -ForegroundColor Green
    Write-Host "NAPOMENA: Novi albumi su dodani s hrvatskim tekstom kao placeholderom (u svim jezicima). Prevedite ih ručno ili pomoću AI alata." -ForegroundColor Yellow
} else {
    Write-Host "Svi ključevi su već sinkronizirani. Nije potrebno ažuriranje." -ForegroundColor Green
}

Write-Host "--- Sinkronizacija završena ---" -ForegroundColor Cyan
