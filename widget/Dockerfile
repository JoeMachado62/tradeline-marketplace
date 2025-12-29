# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build widget
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built widget files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config for widget serving
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
