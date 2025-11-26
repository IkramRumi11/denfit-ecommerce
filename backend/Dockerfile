# backend/Dockerfile - simple Node backend image
FROM node:18-alpine
WORKDIR /usr/src/app

# Install dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy source
COPY backend/ ./

# Expose port
EXPOSE 3002

# Default command
CMD ["node", "server.js"]
