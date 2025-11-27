# backend/test-features.ps1
# Quick test that GETs the /api/v1/features endpoint and prints the JSON result.
try {
  $uri = 'http://localhost:3002/api/v1/features'
  if ($env:PORT) { $uri = "http://localhost:$($env:PORT)/api/v1/features" }
  Write-Host "Requesting $uri"
  $res = Invoke-RestMethod -Method Get -Uri $uri -UseBasicParsing -ErrorAction Stop
  Write-Host "Response:`n" (ConvertTo-Json $res -Depth 5)
  if ($res.flags.raptorMini) { Write-Host "RAPTOR_MINI is enabled." -ForegroundColor Green } else { Write-Host "RAPTOR_MINI is disabled." -ForegroundColor Yellow }
} catch {
  Write-Host "Request failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
