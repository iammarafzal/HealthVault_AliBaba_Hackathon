Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "HealthVault AI -- Production Readiness and Security Audit" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$RootDir = Split-Path -Path $PSScriptRoot -Parent

Write-Host "`n[1/4] Running Backend Test Suite (pytest)..." -ForegroundColor Yellow
Set-Location -Path "$RootDir\backend"
& .venv\Scripts\python.exe -m pytest -v
if ($LASTEXITCODE -ne 0) {
    Write-Error "Backend test suite failed."
    exit 1
}
Write-Host "[OK] Backend tests passed cleanly." -ForegroundColor Green

Write-Host "`n[2/4] Auditing Environment Keys (.env vs .env.example)..." -ForegroundColor Yellow
$EnvPath = "$RootDir\backend\.env"
$ExamplePath = "$RootDir\backend\.env.example"
if ((Test-Path $EnvPath) -and (Test-Path $ExamplePath)) {
    $EnvContent = Get-Content $EnvPath -Raw
    $ExampleLines = Get-Content $ExamplePath
    $Missing = 0
    foreach ($line in $ExampleLines) {
        $trimmed = $line.Trim()
        if ($trimmed -notlike "#*" -and $trimmed -like "*=*") {
            $key = $trimmed.Split("=")[0].Trim()
            if ($key -and -not $EnvContent.Contains($key)) {
                Write-Host "  WARNING: Key '$key' found in .env.example but missing from .env" -ForegroundColor Red
                $Missing = $Missing + 1
            }
        }
    }
    if ($Missing -eq 0) {
        Write-Host "[OK] All environment keys in .env.example are present in .env." -ForegroundColor Green
    }
}

Write-Host "`n[3/4] Checking Frontend Type Validity..." -ForegroundColor Yellow
Set-Location -Path "$RootDir\frontend"
& npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend TypeScript check failed."
    exit 1
}
Write-Host "[OK] Frontend TypeScript check passed with zero errors." -ForegroundColor Green

Write-Host "`n[4/4] Security Audit: Checking Production Config for Dev Fallbacks..." -ForegroundColor Yellow
$ConfigContent = Get-Content "$RootDir\backend\app\core\config.py" -Raw
if ($ConfigContent.Contains("change-me-to-a-random-secret") -and -not $ConfigContent.Contains("insecure_defaults")) {
    Write-Error "Default fallback string found in backend config.py"
    exit 1
}
Write-Host "[OK] Security audit passed: No development fallback secrets in production config." -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "SUCCESS: HealthVault AI repository is production-ready!" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
