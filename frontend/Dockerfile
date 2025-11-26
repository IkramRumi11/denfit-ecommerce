# frontend/Dockerfile - build static frontend with Vite
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Use nginx to serve built assets
FROM nginx:stable-alpine
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html
# Copy a simple nginx config if desired (optional)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
