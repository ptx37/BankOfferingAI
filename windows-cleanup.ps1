# BankOffer AI — Windows WSL Port Forwarding Cleanup
# Run as Administrator to remove port forwarding rules
# Usage: powershell -ExecutionPolicy Bypass -File windows-cleanup.ps1

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  BankOffer AI — Port Forwarding Cleanup" -ForegroundColor Cyan
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

# List of ports to remove
$ports = @(3000, 8000, 5050, 3001, 8081, 5432, 6379, 9090, 9092)

Write-Host "🔧 Removing port forwarding rules..." -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failureCount = 0

foreach ($port in $ports) {
    try {
        netsh interface portproxy delete v4tov4 listenport=$port listenaddress=127.0.0.1 2>$null | Out-Null
        Write-Host "  ✓ Removed port $port" -ForegroundColor Green
        $successCount++
    }
    catch {
        Write-Host "  ⚠️  Port $port (may not have been configured)" -ForegroundColor Yellow
        $failureCount++
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✓ Cleanup complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
