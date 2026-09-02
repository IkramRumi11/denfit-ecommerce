#!/bin/bash
set -e

# ==============================================================================
# DENFiT Production Deployment & Verification Script
# Run this script on your production host after configuring backend/.env
# ==============================================================================

echo "===================================================================="
echo "🚀 DENFiT Production Deployment & Verification"
echo "===================================================================="

# 1. Check if backend/.env exists
if [ ! -f "backend/.env" ]; then
  echo "❌ Error: backend/.env not found!"
  echo "👉 Please copy backend/.env.example to backend/.env and populate secrets."
  exit 1
fi

# 2. Check for placeholder secrets
if grep -q "CHANGE_ME" backend/.env; then
  echo "⚠️ Warning: Found 'CHANGE_ME' placeholders in backend/.env."
  echo "👉 Please ensure all production secrets (JWT, SMTP, Cloudinary) are configured."
fi

# 3. Validate Docker Compose configuration
echo ""
echo "📦 Step 1: Validating Docker Compose configuration..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml config > /dev/null
echo "✅ Docker Compose configuration is valid."

# 4. Build and start the container stack
echo ""
echo "🏗️ Step 2: Building and launching containers..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 5. Wait for containers and healthchecks
echo ""
echo "⏳ Step 3: Waiting 30 seconds for services and replica-set initialization..."
sleep 30

# 6. Verify container statuses
echo ""
echo "🔍 Step 4: Checking container health statuses..."
docker compose ps

# 7. Check Nginx to Backend API routing
echo ""
echo "🌐 Step 5: Testing Nginx → Backend API routing..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/v1/health || true)
if [ "$HEALTH_STATUS" = "200" ]; then
  echo "✅ Nginx reverse proxy to Backend API is working (HTTP 200 OK)."
else
  echo "⚠️ Health check returned HTTP $HEALTH_STATUS. Please inspect backend logs:"
  docker compose logs backend --tail=30
fi

# 8. Check MongoDB Replica Set status
echo ""
echo "🗄️ Step 6: Checking MongoDB replica set status..."
docker compose exec mongo mongosh --eval "rs.status().ok" --quiet || echo "⚠️ Check mongo-init logs if rs.status is not ok."

# 9. Check Background Workers
echo ""
echo "⚙️ Step 7: Checking background worker logs..."
echo "--- Email Worker ---"
docker compose logs email-worker --tail=10
echo "--- Notification Worker ---"
docker compose logs notification-worker --tail=10

echo ""
echo "===================================================================="
echo "🎉 Deployment sequence complete. Next steps:"
echo "1. Seed database: docker compose exec backend npm run seed-admin"
echo "2. Seed categories/filters: docker compose exec backend npm run seed:all"
echo "3. Configure SSL/TLS reverse proxy (Certbot / Let's Encrypt / Cloudflare)"
echo "===================================================================="
