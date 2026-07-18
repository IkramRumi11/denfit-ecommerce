# backend/Dockerfile
FROM node:18-alpine

# Install chromium and rendering dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies (keep --omit=dev)
# Development dependencies like mongodb-memory-server should only be available
# in local dev mode, not in Docker. If needed, install with npm ci (no flags)
# from docker-compose override, which will include dev dependencies.
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Expose application port
EXPOSE 3002

# Start the application
CMD ["node", "server.js"]