# Base image
FROM node:20-alpine

# Working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies including dev dependencies for build
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client with dummy DATABASE_URL (only needed for code generation)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build TypeScript
RUN npm run build

# Remove dev & prune
RUN npm prune --production

# Clear the dummy URL - real URL will come from Railway environment
ENV DATABASE_URL=""

# Expose port
EXPOSE 3000

# Start command - run migrations first, then start server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/server.js"]
