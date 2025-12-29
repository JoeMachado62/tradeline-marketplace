#!/bin/bash

# Production deployment script
set -e

echo "🚀 Starting Tradeline Marketplace Deployment"

# Check environment file
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Copy .env.example to .env and configure your settings"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Validate required variables
required_vars=(
    "DB_PASSWORD"
    "TRADELINE_CONSUMER_KEY"
    "TRADELINE_CONSUMER_SECRET"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "JWT_SECRET"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Build and start services
echo "📦 Building Docker images..."
docker-compose build

echo "🔄 Starting services..."
docker-compose up -d

# Wait for database
echo "⏳ Waiting for database..."
sleep 10

# Run migrations
echo "📊 Running database migrations..."
docker-compose exec backend npx prisma migrate deploy

# Create initial admin
echo "👤 Creating initial admin account..."
docker-compose exec backend npx tsx src/scripts/setup.ts

echo "✅ Deployment complete!"
echo ""
echo "📌 Access URLs:"
echo "   API: http://api.tradelinerental.com"
echo "   Widget: http://widget.tradelinerental.com"
echo ""
echo "📊 View logs: docker-compose logs -f"
echo "🛑 Stop services: docker-compose down"
