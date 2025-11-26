$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$headers=@{'Content-Type'='application/json'}
$ts=Get-Date -UFormat %s
$email = "smoketest$ts@example.com"
$body = @{ name='Smoke Tester'; email=$email; password='Password123!' } | ConvertTo-Json -Depth 3
Write-Host "Registering: $email"
try {
    # Backend currently listening on http://localhost:3002 in this workspace. Use http to avoid TLS errors.
    $reg=Invoke-RestMethod -Method Post -Uri 'http://localhost:3002/api/v1/auth/register' -Body $body -Headers $headers -WebSession $session
    Write-Host 'Register response:'
    $reg | ConvertTo-Json -Depth 5
} catch {
    Write-Host 'Register failed:' $_.Exception.Message
    exit 2
}

Write-Host 'GET /me:'
try {
    $me = Invoke-RestMethod -Method Get -Uri 'http://localhost:3002/api/v1/auth/me' -WebSession $session
    $me | ConvertTo-Json -Depth 5
} catch {
    Write-Host 'GET /me failed:' $_.Exception.Message
    exit 3
}

Write-Host 'Logging out'
try {
    $lo = Invoke-RestMethod -Method Post -Uri 'http://localhost:3002/api/v1/auth/logout' -WebSession $session
    $lo | ConvertTo-Json -Depth 5
} catch {
    Write-Host 'Logout failed:' $_.Exception.Message
    exit 4
}

Write-Host 'GET /me (after logout):'
try {
    $me2 = Invoke-RestMethod -Method Get -Uri 'http://localhost:3002/api/v1/auth/me' -WebSession $session
    $me2 | ConvertTo-Json -Depth 5
    Write-Host 'Unexpected: still authenticated after logout'
    exit 5
} catch {
    Write-Host 'Expected not authenticated or error:' $_.Exception.Message
    exit 0
}
