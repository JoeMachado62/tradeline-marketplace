# Use Debian-based image instead of Alpine for better Prisma compatibility
FROM node:20-slim

# Install OpenSSL (required by Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript - show any errors
RUN echo "Building TypeScript..." && npm run build && echo "Build completed successfully"

# Verify dist/server.js exists
RUN test -f dist/server.js && echo "✅ dist/server.js exists" || (echo "❌ dist/server.js NOT FOUND" && exit 1)

# Prune dev dependencies for smaller image
RUN npm prune --production

# Expose port
EXPOSE 3000

# Use a shell script to run migrations and start server with better error output
CMD ["sh", "-c", "echo '=== Starting application ===' && npx prisma migrate deploy && echo '=== Migrations complete, starting server ===' && node dist/server.js"]
