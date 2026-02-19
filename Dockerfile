# Multi-stage build for React/Vite application
FROM node:18.20.4-alpine3.20 AS builder

# Set working directory
WORKDIR /app

# Accept build arguments
ARG VITE_API_BASE_URL=http://localhost:8081/
ARG VITE_ASSETS_CLOUDFRONT_DOMAIN=http://localhost:4566/smartqa-local-backoffice-s3-assets
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_ASSETS_CLOUDFRONT_DOMAIN=$VITE_ASSETS_CLOUDFRONT_DOMAIN
# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build-dev

# Production stage with Nginx
FROM nginx:alpine

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

