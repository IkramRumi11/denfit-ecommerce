# scripts/start-https.ps1
# Helper to start backend and frontend with local HTTPS env vars using mkcert-generated certs.
# Usage: adjust $certPath/$keyPath as needed, then run in PowerShell:
#    .\scripts\start-https.ps1

$repo = Split-Path -Parent $MyInvocation.MyCommand.Definition
$certPath = Join-Path $repo "localhost+2.pem"
$keyPath = Join-Path $repo "localhost+2-key.pem"

if (!(Test-Path $certPath) -or !(Test-Path $keyPath)) {
    Write-Error "Certificate files not found at $certPath and $keyPath. Generate them with mkcert in the repo root: mkcert localhost 127.0.0.1 ::1"
    exit 1
}

Write-Host "Using cert: $certPath" -ForegroundColor Green
Write-Host "Using key: $keyPath" -ForegroundColor Green

# Set env vars for child processes
$env:SSL_CERT_PATH = $certPath
$env:SSL_KEY_PATH = $keyPath
$env:ALLOWED_ORIGINS = "https://localhost:3000,https://localhost:5173,http://localhost:3000"
$env:COOKIE_SAMESITE = "none"

# Start backend
Write-Host "Starting backend..." -ForegroundColor Cyan
Start-Process -NoNewWindow -WorkingDirectory (Join-Path $repo "backend") -FilePath "npm" -ArgumentList "run","dev"

Start-Sleep -Seconds 2

# Start frontend
Write-Host "Starting frontend..." -ForegroundColor Cyan
Start-Process -NoNewWindow -WorkingDirectory (Join-Path $repo "frontend") -FilePath "npm" -ArgumentList "run","dev"

Write-Host "Started backend and frontend (check terminals for output)." -ForegroundColor Green
