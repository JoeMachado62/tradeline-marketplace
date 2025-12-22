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
RUN echo "=== Generating Prisma client ===" && npx prisma generate && echo "=== Prisma client generated ==="

# Copy source code
COPY . .

# Build TypeScript - show any errors
RUN echo "=== Building TypeScript ===" && npm run build 2>&1 && echo "=== TypeScript build complete ==="

# List dist directory to verify build output
RUN echo "=== Contents of dist/ ===" && ls -la dist/ && echo "=== End dist contents ==="

# Verify dist/server.js exists
RUN test -f dist/server.js && echo "✅ dist/server.js exists" || (echo "❌ dist/server.js NOT FOUND" && exit 1)

# Prune dev dependencies for smaller image
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start server with explicit output
CMD sh -c 'echo "=== Container starting ===" && echo "=== Running migrations ===" && npx prisma migrate deploy 2>&1 && echo "=== Migrations done ===" && echo "=== Starting Node.js server ===" && exec node dist/server.js 2>&1'
