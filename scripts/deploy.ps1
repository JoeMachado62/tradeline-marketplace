Write-Host "🚀 Starting Tradeline Marketplace Deployment" -ForegroundColor Green

# Check environment file
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found" -ForegroundColor Red
    Write-Host "Copy .env.example to .env and configure your settings"
    exit 1
}

# Check Docker is running
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Docker is not running" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment checks passed" -ForegroundColor Green

# Build and start services
Write-Host "📦 Building Docker images..." -ForegroundColor Cyan
docker-compose build

Write-Host "🔄 Starting services..." -ForegroundColor Cyan
docker-compose up -d

# Wait for database
Write-Host "⏳ Waiting for database (10s)..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Run migrations
Write-Host "📊 Running database migrations..." -ForegroundColor Cyan
docker-compose exec backend npx prisma migrate deploy

# Create initial admin
Write-Host "👤 Creating initial admin account..." -ForegroundColor Cyan
docker-compose exec backend npx tsx src/scripts/setup.ts

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📌 Access URLs:"
Write-Host "   API: http://localhost:3000"
Write-Host "   Widget: http://localhost:8080"
Write-Host ""
Write-Host "📊 View logs: docker-compose logs -f"
Write-Host "🛑 Stop services: docker-compose down"
