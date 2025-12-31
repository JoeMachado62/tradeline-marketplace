#!/bin/bash

# MySQL Database Setup Script for Tradeline Marketplace
# Run this on your Ubuntu VPS

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}MySQL Database Setup for Tradeline Marketplace${NC}"
echo "================================================"

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}Installing MySQL Server...${NC}"
    apt update
    apt install -y mysql-server
    systemctl start mysql
    systemctl enable mysql
    echo -e "${GREEN}MySQL installed successfully${NC}"
fi

# Secure MySQL installation
echo -e "\n${YELLOW}Securing MySQL installation...${NC}"
echo "Please follow the prompts to secure MySQL:"

# Check if already secured
if mysql -u root -e "SELECT 1" &> /dev/null; then
    echo "MySQL root has no password, running security script..."
    mysql_secure_installation
else
    echo "MySQL already secured (root has password)"
fi

# Prompt for database credentials
echo -e "\n${YELLOW}Database Configuration${NC}"
echo "Enter the credentials for the Tradeline database:"

read -p "Database name [tradeline_db]: " DB_NAME
DB_NAME=${DB_NAME:-tradeline_db}

read -p "Database user [tradeline_user]: " DB_USER
DB_USER=${DB_USER:-tradeline_user}

read -sp "Database password: " DB_PASS
echo ""

if [ -z "$DB_PASS" ]; then
    echo -e "${RED}Password cannot be empty!${NC}"
    exit 1
fi

read -sp "MySQL root password: " ROOT_PASS
echo ""

# Create database and user
echo -e "\n${YELLOW}Creating database and user...${NC}"

mysql -u root -p"$ROOT_PASS" <<EOF
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

echo -e "${GREEN}Database '${DB_NAME}' created successfully!${NC}"
echo -e "${GREEN}User '${DB_USER}' created with full privileges.${NC}"

# Generate DATABASE_URL
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}"

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}Database setup complete!${NC}"
echo ""
echo -e "${YELLOW}Add this to your .env file:${NC}"
echo ""
echo "DATABASE_URL=\"${DATABASE_URL}\""
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Copy the DATABASE_URL above"
echo "2. Add it to /opt/tradeline/.env"
echo "3. Run: docker-compose exec backend npx prisma migrate deploy"
echo ""
