# BankOffer AI — Windows WSL Port Forwarding Setup
# Run as Administrator
# Usage: powershell -ExecutionPolicy Bypass -File windows-setup.ps1

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  BankOffer AI — WSL Port Forwarding Setup" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "❌ ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell → Run as Administrator" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Get WSL IP
Write-Host "🔍 Finding WSL IP address..." -ForegroundColor Yellow
$wslIP = wsl hostname -I
if (-not $wslIP) {
    Write-Host "❌ ERROR: Could not find WSL IP. Is WSL running?" -ForegroundColor Red
    exit 1
}

# Parse the first IP (in case multiple)
$wslIP = ($wslIP -split '\s+')[0]

Write-Host "✓ Found WSL IP: $wslIP" -ForegroundColor Green
Write-Host ""

# Verify connectivity
Write-Host "🔍 Testing connectivity to WSL..." -ForegroundColor Yellow
$testResponse = Test-NetConnection -ComputerName $wslIP -Port 8000 -WarningAction SilentlyContinue
if ($testResponse.TcpTestSucceeded) {
    Write-Host "✓ WSL is reachable" -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: Could not reach WSL (docker services may not be running yet)" -ForegroundColor Yellow
    Write-Host "   Make sure docker-compose is running in WSL" -ForegroundColor Yellow
}
Write-Host ""

# Setup port forwarding
Write-Host "🔧 Setting up port forwarding..." -ForegroundColor Cyan

$ports = @(
    @{local=3000;  remote=3000;  service="Frontend"},
    @{local=8000;  remote=8000;  service="API"},
    @{local=5050;  remote=5050;  service="pgAdmin"},
    @{local=3001;  remote=3001;  service="Grafana"},
    @{local=8081;  remote=8081;  service="Redis Commander"},
    @{local=5432;  remote=5432;  service="PostgreSQL"},
    @{local=6379;  remote=6379;  service="Redis"},
    @{local=9090;  remote=9090;  service="Prometheus"},
    @{local=9092;  remote=9092;  service="Kafka"}
)

$successCount = 0
$failureCount = 0

foreach ($port in $ports) {
    try {
        $localPort = $port.local
        $remotePort = $port.remote
        $service = $port.service

        # Remove existing rule if it exists
        netsh interface portproxy delete v4tov4 listenport=$localPort listenaddress=127.0.0.1 2>$null | Out-Null

        # Add new rule
        netsh interface portproxy add v4tov4 listenport=$localPort listenaddress=127.0.0.1 connectport=$remotePort connectaddress=$wslIP 2>$null | Out-Null

        Write-Host "  ✓ Port $localPort → $remotePort ($service)" -ForegroundColor Green
        $successCount++
    }
    catch {
        Write-Host "  ✗ Port $localPort → $remotePort ($service): $_" -ForegroundColor Red
        $failureCount++
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($failureCount -eq 0) {
    Write-Host "✓ Setup Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Access from Windows using localhost:" -ForegroundColor Cyan
    Write-Host "   Frontend:      http://localhost:3000" -ForegroundColor White
    Write-Host "   API Docs:      http://localhost:8000/docs" -ForegroundColor White
    Write-Host "   pgAdmin:       http://localhost:5050" -ForegroundColor White
    Write-Host "   Grafana:       http://localhost:3001" -ForegroundColor White
} else {
    Write-Host "⚠️  Setup completed with $failureCount error(s)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 NOTES:" -ForegroundColor Yellow
Write-Host "   - WSL IP: $wslIP (may change on restart)" -ForegroundColor Gray
Write-Host "   - If IP changes, run this script again" -ForegroundColor Gray
Write-Host "   - To remove port forwarding, run: windows-cleanup.ps1" -ForegroundColor Gray
Write-Host ""

# Show verification
Write-Host "📋 Verification commands (run in PowerShell):" -ForegroundColor Cyan
Write-Host "   curl http://localhost:8000/health" -ForegroundColor Gray
Write-Host "   curl http://localhost:3000" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"
