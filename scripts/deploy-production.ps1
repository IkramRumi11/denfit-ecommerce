# ==============================================================================
# DENFiT Production Deployment & Verification Script (PowerShell)
# ==============================================================================

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "🚀 DENFiT Production Deployment & Verification" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan

# 1. Check if backend/.env exists
if (-not (Test-Path "backend\.env")) {
    Write-Host "❌ Error: backend\.env not found!" -ForegroundColor Red
    Write-Host "👉 Please copy backend\.env.example to backend\.env and populate secrets." -ForegroundColor Yellow
    exit 1
}

# 2. Check for placeholder secrets
if (Select-String -Path "backend\.env" -Pattern "CHANGE_ME" -Quiet) {
    Write-Host "⚠️ Warning: Found 'CHANGE_ME' placeholders in backend\.env." -ForegroundColor Yellow
    Write-Host "👉 Please ensure all production secrets (JWT, SMTP, Cloudinary) are configured." -ForegroundColor Yellow
}

# 3. Validate Docker Compose configuration
Write-Host "`n📦 Step 1: Validating Docker Compose configuration..." -ForegroundColor Cyan
docker compose -f docker-compose.yml -f docker-compose.prod.yml config | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Docker Compose configuration is valid." -ForegroundColor Green
} else {
    Write-Host "❌ Docker Compose configuration failed validation." -ForegroundColor Red
    exit 1
}

# 4. Build and start the container stack
Write-Host "`n🏗️ Step 2: Building and launching containers..." -ForegroundColor Cyan
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 5. Wait for containers and healthchecks
Write-Host "`n⏳ Step 3: Waiting 30 seconds for services and replica-set initialization..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# 6. Verify container statuses
Write-Host "`n🔍 Step 4: Checking container health statuses..." -ForegroundColor Cyan
docker compose ps

# 7. Check Nginx to Backend API routing
Write-Host "`n🌐 Step 5: Testing Nginx → Backend API routing..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost/api/v1/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Nginx reverse proxy to Backend API is working (HTTP 200 OK)." -ForegroundColor Green
    } else {
        Write-Host "⚠️ Health check returned HTTP $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Could not connect to http://localhost/api/v1/health. Check backend logs:" -ForegroundColor Yellow
    docker compose logs backend --tail=30
}

# 8. Check MongoDB Replica Set status
Write-Host "`n🗄️ Step 6: Checking MongoDB replica set status..." -ForegroundColor Cyan
docker compose exec mongo mongosh --eval "rs.status().ok" --quiet

# 9. Check Background Workers
Write-Host "`n⚙️ Step 7: Checking background worker logs..." -ForegroundColor Cyan
Write-Host "--- Email Worker ---" -ForegroundColor DarkCyan
docker compose logs email-worker --tail=10
Write-Host "--- Notification Worker ---" -ForegroundColor DarkCyan
docker compose logs notification-worker --tail=10

Write-Host "`n====================================================================" -ForegroundColor Cyan
Write-Host "🎉 Deployment sequence complete. Next steps:" -ForegroundColor Green
Write-Host "1. Seed database: docker compose exec backend npm run seed-admin" -ForegroundColor White
Write-Host "2. Seed categories/filters: docker compose exec backend npm run seed:all" -ForegroundColor White
Write-Host "3. Configure SSL/TLS reverse proxy (Certbot / Let's Encrypt / Cloudflare)" -ForegroundColor White
Write-Host "====================================================================" -ForegroundColor Cyan
