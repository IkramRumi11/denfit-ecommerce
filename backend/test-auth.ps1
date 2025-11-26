# Complete JWT Authentication Test Script

Write-Host "=== DENFIT JWT AUTHENTICATION TEST ===" -ForegroundColor Green

# Step 1: Register a new user
Write-Host "`n1. Testing Registration..." -ForegroundColor Yellow
$registerBody = @{
    name = "Test User"
    email = "test@example.com"
    password = "123456"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
    $token = $registerResponse.token
    Write-Host "✅ Registration Successful!" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 50))..." -ForegroundColor Gray
    Write-Host "   User: $($registerResponse.user.name)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Registration Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 2: Test Login
Write-Host "`n2. Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    email = "test@example.com"
    password = "123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Login Successful!" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 50))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Login Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Test Protected Routes
Write-Host "`n3. Testing Protected Routes..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $profileResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/profile" -Method Get -Headers $headers
    Write-Host "✅ Profile Access Successful!" -ForegroundColor Green
    Write-Host "   User: $($profileResponse.user.name)" -ForegroundColor Gray
    Write-Host "   Email: $($profileResponse.user.email)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Profile Access Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Test Users Route (Protected)
Write-Host "`n4. Testing Users Route..." -ForegroundColor Yellow
try {
    $usersResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/users" -Method Get -Headers $headers
    Write-Host "✅ Users Route Access Successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Users Route Failed (Expected for non-admin): $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n=== AUTHENTICATION TEST COMPLETE ===" -ForegroundColor Green
