# VPS Deployment Guide - Tradeline Marketplace

Complete step-by-step guide for deploying to your Hostinger VPS.

## 📋 Pre-Deployment Checklist

- [x] VPS running Ubuntu 24.04 (IP: 72.62.165.7)
- [x] Hostname: tradeline.rental
- [x] Domain: tradelinerental.com pointed to 72.62.165.7
- [x] SSH access as root
- [x] Code pushed to GitHub

---

## Step 1️⃣: Connect to VPS via SSH

Open your terminal (PowerShell, Git Bash, or CMD):

```bash
ssh root@72.62.165.7
```

When prompted for password, enter your VPS root password.

**First time connecting?** You'll see a fingerprint warning - type `yes` to continue.

---

## Step 2️⃣: Update System & Install Dependencies

```bash
# Update package lists
apt update && apt upgrade -y

# Install essential tools
apt install -y git curl wget unzip software-properties-common

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node.js
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x
```

---

## Step 3️⃣: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Start Docker
systemctl start docker
systemctl enable docker

# Verify Docker
docker --version  # Should show Docker version 24.x or higher

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Verify Compose
docker compose version
```

---

## Step 4️⃣: Install MySQL

```bash
# Install MySQL Server
apt install -y mysql-server

# Start MySQL
systemctl start mysql
systemctl enable mysql

# Secure MySQL (follow prompts)
mysql_secure_installation
# - Set root password: YES
# - Remove anonymous users: YES
# - Disallow root login remotely: YES
# - Remove test database: YES
# - Reload privileges: YES
```

---

## Step 5️⃣: Create Database

```bash
# Login to MySQL
mysql -u root -p

# Run these SQL commands:
CREATE DATABASE tradeline_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tradeline_user'@'localhost' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON tradeline_db.* TO 'tradeline_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

📝 **Note your DATABASE_URL:**

```
mysql://tradeline_user:YourSecurePassword123!@localhost:3306/tradeline_db
```

---

## Step 6️⃣: Clone Repository

```bash
# Create app directory
mkdir -p /opt/tradeline
cd /opt/tradeline

# Clone from GitHub
git clone https://github.com/JoeMachado62/tradeline-marketplace.git .

# Checkout the deployment branch
git checkout hostinger-deploy

# Verify files
ls -la
```

---

## Step 7️⃣: Configure Environment

```bash
# Copy example env file
cp .env.production.example .env

# Edit environment variables
nano .env
```

**Fill in these values:**

```env
# Database (use the credentials from Step 5)
DATABASE_URL="mysql://tradeline_user:YourSecurePassword123!@localhost:3306/tradeline_db"

# Security (generate random strings)
JWT_SECRET=run_this_to_generate_one_openssl_rand_-base64_32
SESSION_SECRET=another_random_string_here

# Stripe (from your Stripe dashboard)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# OpenAGI (your API key)
OAGI_API_KEY=sk-TNQl9HDCaedAhUswUOA8YnPvzXxFSo-Oi7d8E1-IOfo

# TradelineSupply Broker Login
TRADELINE_BROKER_LOGIN_URL=https://tradelinesupply.com/login-create-an-account/
TRADELINE_BROKER_LOGIN_ID=mycreditserviceus@gmail.com
TRADELINE_BROKER_PASSWORD=YourBrokerPassword

# Server
NODE_ENV=production
PORT=3000
DOMAIN=tradelinerental.com
```

**Generate random secrets:**

```bash
# Run these to generate secure random strings
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For SESSION_SECRET
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 8️⃣: Install Python & OAGI SDK

```bash
# Install Python 3.11
apt install -y python3.11 python3.11-venv python3-pip

# Create virtual environment for Lux Worker
cd /opt/tradeline/lux-worker
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create lux-worker .env
cp .env.example .env
nano .env
# Add your OAGI_API_KEY

# Deactivate venv
deactivate
```

---

## Step 9️⃣: Build Backend

```bash
cd /opt/tradeline/backend

# Install Node.js dependencies
npm ci --only=production

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build TypeScript
npm run build
```

---

## Step 🔟: Install PM2 & Start Services

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > /opt/tradeline/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'tradeline-backend',
      cwd: '/opt/tradeline/backend',
      script: 'dist/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'lux-worker',
      cwd: '/opt/tradeline/lux-worker',
      script: 'server.py',
      interpreter: '/opt/tradeline/lux-worker/venv/bin/python',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        LUX_WORKER_HOST: '0.0.0.0',
        LUX_WORKER_PORT: 8765
      }
    }
  ]
};
EOF

# Start all services
cd /opt/tradeline
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs (copy/paste it)
```

---

## Step 1️⃣1️⃣: Install & Configure NGINX

```bash
# Install NGINX
apt install -y nginx

# Copy our NGINX config
cp /opt/tradeline/nginx/nginx.conf /etc/nginx/nginx.conf

# Test config
nginx -t

# If you see errors about SSL certs, comment them out temporarily
# We'll add them in the next step
```

---

## Step 1️⃣2️⃣: Setup SSL with Let's Encrypt

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d tradelinerental.com -d www.tradelinerental.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (option 2)

# Verify auto-renewal
certbot renew --dry-run
```

---

## Step 1️⃣3️⃣: Start NGINX

```bash
# Restart NGINX to apply config
systemctl restart nginx
systemctl enable nginx

# Check status
systemctl status nginx
```

---

## Step 1️⃣4️⃣: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

# Verify
ufw status
```

---

## Step 1️⃣5️⃣: Verify Deployment

Open in your browser:

- **Main Site**: https://tradelinerental.com
- **Admin Panel**: https://tradelinerental.com/admin
- **Health Check**: https://tradelinerental.com/health
- **API Info**: https://tradelinerental.com/api

---

## 🔧 Useful Commands

### View Logs

```bash
# All PM2 logs
pm2 logs

# Backend only
pm2 logs tradeline-backend

# Lux Worker only
pm2 logs lux-worker

# NGINX logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Restart Services

```bash
pm2 restart all
systemctl restart nginx
```

### Update Application

```bash
cd /opt/tradeline
git pull origin hostinger-deploy
cd backend && npm ci && npm run build
pm2 restart all
```

### Database Backup

```bash
mysqldump -u tradeline_user -p tradeline_db > backup_$(date +%Y%m%d).sql
```

---

## 🚨 Troubleshooting

### Port 3000 in use

```bash
lsof -i :3000
kill -9 <PID>
```

### PM2 not starting

```bash
pm2 delete all
pm2 start ecosystem.config.js
```

### Database connection error

```bash
# Check MySQL is running
systemctl status mysql

# Test connection
mysql -u tradeline_user -p tradeline_db -e "SELECT 1"
```

### SSL certificate issues

```bash
certbot renew --force-renewal
systemctl restart nginx
```

---

## ✅ Post-Deployment Checklist

- [ ] Site loads at https://tradelinerental.com
- [ ] Admin login works at /admin
- [ ] Health endpoint returns healthy
- [ ] SSL certificate is valid (green padlock)
- [ ] PM2 services are running (`pm2 status`)
- [ ] Lux Worker is accessible internally
