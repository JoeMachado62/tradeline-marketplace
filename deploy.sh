#!/bin/bash

# Tradeline Marketplace - VPS Deployment Script
# Run this on your Ubuntu VPS after cloning the repository

set -e  # Exit on error

echo "🚀 Tradeline Marketplace Deployment"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# 1. Update system
echo -e "\n${YELLOW}Step 1: Updating system...${NC}"
apt update && apt upgrade -y

# 2. Install Docker
echo -e "\n${YELLOW}Step 2: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    usermod -aG docker $SUDO_USER
    echo -e "${GREEN}Docker installed successfully${NC}"
else
    echo "Docker already installed"
fi

# 3. Install Docker Compose
echo -e "\n${YELLOW}Step 3: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    apt install -y docker-compose-plugin
    echo -e "${GREEN}Docker Compose installed successfully${NC}"
else
    echo "Docker Compose already installed"
fi

# 4. Create directories
echo -e "\n${YELLOW}Step 4: Creating directories...${NC}"
mkdir -p certbot/conf certbot/www
mkdir -p backend/uploads

# 5. Set up environment file
echo -e "\n${YELLOW}Step 5: Setting up environment...${NC}"
if [ ! -f .env ]; then
    cp .env.production.example .env
    echo -e "${YELLOW}Please edit .env file with your production values${NC}"
    echo "Run: nano .env"
else
    echo ".env file already exists"
fi

# 6. Generate SSL certificates (first time)
echo -e "\n${YELLOW}Step 6: SSL Certificate Setup${NC}"
read -p "Generate SSL certificates now? (y/n): " generate_ssl

if [ "$generate_ssl" = "y" ]; then
    # Start nginx temporarily for ACME challenge
    docker-compose up -d nginx
    
    # Get certificates
    docker-compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email admin@tradelinerental.com \
        --agree-tos \
        --no-eff-email \
        -d tradelinerental.com \
        -d www.tradelinerental.com
    
    echo -e "${GREEN}SSL certificates generated!${NC}"
fi

# 7. Build and start services
echo -e "\n${YELLOW}Step 7: Building and starting services...${NC}"
docker-compose build
docker-compose up -d

# 8. Run database migrations
echo -e "\n${YELLOW}Step 8: Running database migrations...${NC}"
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma generate

# 9. Show status
echo -e "\n${GREEN}Deployment complete!${NC}"
echo "===================================="
docker-compose ps

echo -e "\n${GREEN}Your application is now running at:${NC}"
echo "  https://tradelinerental.com"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  View logs:     docker-compose logs -f"
echo "  Restart:       docker-compose restart"
echo "  Stop:          docker-compose down"
echo "  Update:        git pull && docker-compose up -d --build"
