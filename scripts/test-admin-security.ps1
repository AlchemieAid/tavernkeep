# Admin Security Test Runner (PowerShell)
# Runs comprehensive security tests for the admin system

Write-Host "🔐 Running Admin Security Tests..." -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Test Checklist:" -ForegroundColor Yellow
Write-Host "  ✓ RLS Policy Tests"
Write-Host "  ✓ API Route Security"
Write-Host "  ✓ Helper Function Security"
Write-Host "  ✓ Route Protection"
Write-Host "  ✓ Data Isolation"
Write-Host ""

# Run security tests
Write-Host "Running security tests..." -ForegroundColor Yellow
npm test -- __tests__/admin/security.test.ts --verbose

$securityExitCode = $LASTEXITCODE

Write-Host ""
Write-Host "Running integration tests..." -ForegroundColor Yellow
npm test -- __tests__/admin/integration.test.ts --verbose

$integrationExitCode = $LASTEXITCODE

Write-Host ""
Write-Host "================================"
Write-Host ""

if ($securityExitCode -eq 0 -and $integrationExitCode -eq 0) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Admin system is secure and ready for production."
    exit 0
} else {
    Write-Host "❌ Some tests failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix failing tests before deploying to production."
    exit 1
}
