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

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Remove dev & prune
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
