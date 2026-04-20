#!/bin/bash
# First-time Let's Encrypt certificate setup.

set -e

DOMAIN="charlesdeng.eastasia.cloudapp.azure.com"
EMAIL="charlesdeng1026@gmail.com"

echo "==> Step 1: Start backend + frontend in HTTP fallback mode..."
docker compose up -d --build backend frontend

echo "==> Step 2: Request Let's Encrypt certificate..."
docker compose run --rm --entrypoint certbot certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

echo "==> Step 3: Restart frontend to enable HTTPS config..."
docker compose up -d --force-recreate frontend certbot

echo ""
echo "==> Done!"
echo "HTTP:  http://$DOMAIN"
echo "HTTPS: https://$DOMAIN"
