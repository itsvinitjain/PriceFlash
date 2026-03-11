# Docker-based PriceFlash Deployment Script for Windows PowerShell

Write-Host "🚀 Starting PriceFlash Docker Setup..." -ForegroundColor Green
Write-Host ""

# Check if Docker is installed
Write-Host "📦 Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed or not in PATH" -ForegroundColor Red
    Write-Host "📥 Please install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Build and start services
Write-Host "🔨 Building Docker images and starting services..." -ForegroundColor Yellow
Write-Host ""

docker compose -f docker-compose.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Docker containers" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Docker services started successfully!" -ForegroundColor Green
Write-Host ""

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check MongoDB
Write-Host ""
Write-Host "🔍 Checking MongoDB..." -ForegroundColor Cyan
docker exec priceflash-mongodb mongosh --eval "db.adminCommand('ping')" > $null 2>&1
if ($?) {
    Write-Host "✅ MongoDB is running on mongodb://localhost:27017" -ForegroundColor Green
} else {
    Write-Host "⚠️  MongoDB is starting, give it a moment..." -ForegroundColor Yellow
}

# Check Backend
Write-Host ""
Write-Host "🔍 Checking Backend..." -ForegroundColor Cyan
Start-Sleep -Seconds 2
$response = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -ErrorAction SilentlyContinue
if ($response.StatusCode -eq 200) {
    Write-Host "✅ Backend is running on http://localhost:8000" -ForegroundColor Green
    Write-Host "📚 API Docs available at http://localhost:8000/docs" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend is starting, give it a moment..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 PriceFlash Docker Deployment Ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Services Running:" -ForegroundColor Yellow
Write-Host "  • MongoDB:    mongodb://localhost:27017" -ForegroundColor White
Write-Host "  • Backend:    http://localhost:8000" -ForegroundColor White
Write-Host "  • API Docs:   http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. For Frontend (Expo):" -ForegroundColor White
Write-Host "     cd frontend" -ForegroundColor Cyan
Write-Host "     npm install" -ForegroundColor Cyan
Write-Host "     npm start" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Update EXPO_PUBLIC_BACKEND_URL in frontend/.env.local:" -ForegroundColor White
Write-Host "     EXPO_PUBLIC_BACKEND_URL=http://YOUR.LOCAL.IP:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Yellow
Write-Host "  • View logs:     docker compose logs -f" -ForegroundColor Cyan
Write-Host "  • Stop services: docker compose down" -ForegroundColor Cyan
Write-Host "  • Remove data:   docker compose down -v" -ForegroundColor Cyan
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
