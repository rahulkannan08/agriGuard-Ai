# AgriVision Full Stack Startup Script
# Launches all three services (AI backend, Node backend, React frontend) in parallel

param(
    [switch]$NoOpen = $false
)

$ErrorActionPreference = 'Continue'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = "c:\Users\rahul\OneDrive\Pictures\aiii\sad"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   AgriVision Full Stack Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Colors
$successColor = 'Green'
$infoColor = 'Cyan'
$warnColor = 'Yellow'
$errorColor = 'Red'

# 1. Launch AI Backend (Python, Port 8001)
Write-Host "[1/3] Starting Python AI Backend (uvicorn on port 8001)..." -ForegroundColor $infoColor
$aiBackendPath = Join-Path $rootDir "1st-ai-test"

$aiBackendJob = Start-Process -FilePath "powershell" -ArgumentList @(
    "-ExecutionPolicy",
    "Bypass",
    "-NoExit",
    "-Command",
    "cd '$aiBackendPath'; `$venvPath = 'c:\Users\rahul\OneDrive\Pictures\aiii\.venv\Scripts\Activate.ps1'; & `$venvPath; uvicorn app:app --reload --port 8001"
) -NoNewWindow -PassThru

Write-Host "  [+] AI Backend PID: $($aiBackendJob.Id)" -ForegroundColor $successColor
Start-Sleep -Seconds 2

# 2. Launch Node Backend (Express, Port 8000)
Write-Host "[2/3] Starting Node Backend (Express on port 8000)..." -ForegroundColor $infoColor
$nodeBackendPath = Join-Path $rootDir "hackathon\backend"

# Create/update .env for Node backend if it doesn't exist
$nodeEnvPath = Join-Path $nodeBackendPath ".env"
if (-not (Test-Path $nodeEnvPath)) {
    Write-Host "  Creating .env for Node backend..." -ForegroundColor $warnColor
    $envContent = "PORT=8000`nNODE_ENV=development`nNVIDIA_API_KEY=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`nLLM_MODEL=meta/llama-3.1-70b-instruct`nML_SERVICE_URL=http://localhost:8001`nUSE_MOCK_ML=false`nUSE_EXTERNAL_AI=true`nBLUR_THRESHOLD=100`nCONFIDENCE_THRESHOLD=0.60`nMAX_IMAGE_SIZE_MB=10`nLIVEKIT_URL=wss://your-project.livekit.cloud`nLIVEKIT_API_KEY=your_livekit_api_key`nLIVEKIT_API_SECRET=your_livekit_api_secret`nDEEPGRAM_API_KEY=your_deepgram_api_key`nELEVENLABS_API_KEY=your_elevenlabs_api_key`nELEVENLABS_MODEL_ID=eleven_multilingual_v2`nELEVENLABS_VOICE_ID=`nELEVENLABS_VOICE_ID_TAMIL=`nELEVENLABS_VOICE_ID_KANNADA="
    $envContent | Out-File -FilePath $nodeEnvPath -Encoding UTF8
}

# Ensure required voice env keys are present in existing .env as well
$requiredNodeEnv = @{
    "LIVEKIT_URL" = "wss://your-project.livekit.cloud"
    "LIVEKIT_API_KEY" = "your_livekit_api_key"
    "LIVEKIT_API_SECRET" = "your_livekit_api_secret"
    "DEEPGRAM_API_KEY" = "your_deepgram_api_key"
    "ELEVENLABS_API_KEY" = "your_elevenlabs_api_key"
    "ELEVENLABS_MODEL_ID" = "eleven_multilingual_v2"
    "ELEVENLABS_VOICE_ID" = ""
    "ELEVENLABS_VOICE_ID_TAMIL" = ""
    "ELEVENLABS_VOICE_ID_KANNADA" = ""
}

$nodeEnvRaw = Get-Content -Path $nodeEnvPath -Raw
foreach ($entry in $requiredNodeEnv.GetEnumerator()) {
    $key = [regex]::Escape($entry.Key)
    if ($nodeEnvRaw -notmatch "(?m)^$key=") {
        Add-Content -Path $nodeEnvPath -Value "`n$($entry.Key)=$($entry.Value)"
        Write-Host "  [+] Added missing env key: $($entry.Key)" -ForegroundColor $warnColor
        $nodeEnvRaw += "`n$($entry.Key)=$($entry.Value)"
    }
}

$nodeBackendJob = Start-Process -FilePath "powershell" -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$nodeBackendPath'; npm run dev"
) -NoNewWindow -PassThru

Write-Host "  [+] Node Backend PID: $($nodeBackendJob.Id)" -ForegroundColor $successColor
Start-Sleep -Seconds 3

# 3. Launch React Frontend (Next.js, Port 3000)
Write-Host "[3/3] Starting Next.js Frontend (Port 3000)..." -ForegroundColor $infoColor
$frontendPath = Join-Path $rootDir "hackathon"

# Create/update .env for frontend if it doesn't exist
$frontendEnvPath = Join-Path $frontendPath ".env.local"
if (-not (Test-Path $frontendEnvPath)) {
    Write-Host "  Creating .env.local for Frontend..." -ForegroundColor $warnColor
    "NEXT_PUBLIC_BACKEND_URL=http://localhost:8000" | Out-File -FilePath $frontendEnvPath -Encoding UTF8
}

$frontendJob = Start-Process -FilePath "powershell" -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$frontendPath'; npm run dev"
) -NoNewWindow -PassThru

Write-Host "  [+] Frontend PID: $($frontendJob.Id)" -ForegroundColor $successColor
Start-Sleep -Seconds 2

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   All Services Started Successfully!" -ForegroundColor $successColor
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[Status] Service Status:" -ForegroundColor $infoColor
Write-Host ""
Write-Host "  AI Backend (Python):    http://localhost:8001/health" -ForegroundColor White
Write-Host "  Node Backend (Express): http://localhost:8000/api/health" -ForegroundColor White
Write-Host "  React Frontend (Vite):  http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "[Link] Full Application:" -ForegroundColor $infoColor
Write-Host "  -> http://localhost:3000" -ForegroundColor $successColor
Write-Host ""
Write-Host "[Info] Process IDs:" -ForegroundColor $infoColor
Write-Host "  AI Backend:  $($aiBackendJob.Id)" -ForegroundColor White
Write-Host "  Node Backend: $($nodeBackendJob.Id)" -ForegroundColor White
Write-Host "  Frontend:    $($frontendJob.Id)" -ForegroundColor White
Write-Host ""
Write-Host "[!]  To stop all services, close the popup windows or run:" -ForegroundColor $warnColor
Write-Host "  Get-Process | Where-Object { `$_.Id -in @($($aiBackendJob.Id), $($nodeBackendJob.Id), $($frontendJob.Id)) } | Stop-Process" -ForegroundColor Gray
Write-Host ""

# Open browser automatically if not disabled
if (-not $NoOpen) {
    Write-Host "[Web] Opening browser..." -ForegroundColor $infoColor
    Start-Sleep -Seconds 1
    Start-Process "http://localhost:3000"
}

Write-Host ""
Write-Host "[+] All services are running. Press Ctrl+C in any window to stop that service." -ForegroundColor $successColor
Write-Host ""

# Wait for all processes
$allRunning = $true
while ($allRunning) {
    $allRunning = (Get-Process -Id @($aiBackendJob.Id, $nodeBackendJob.Id, $frontendJob.Id) -ErrorAction SilentlyContinue).Count -eq 3
    Start-Sleep -Seconds 5
}

Write-Host ""
Write-Host "Some services have stopped. Exiting..." -ForegroundColor $warnColor
