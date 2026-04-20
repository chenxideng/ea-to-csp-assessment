#!/bin/bash
# init-letsencrypt.sh — First-time certificate setup
# Run this ONCE on the server to obtain the initial certificate.

DOMAIN="charlesdeng.eastasia.cloudapp.azure.com"
EMAIL="charlesdeng1026@gamil.com"  # Change to your email

set -e

echo "==> Step 1: Create temporary nginx config (HTTP only)..."
# We need a temporary nginx that only serves HTTP for the ACME challenge
cat > /tmp/nginx-temp.conf << 'EOF'
server {
    listen 80;
    server_name _;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 200 'Setting up SSL...';
        add_header Content-Type text/plain;
    }
}
EOF

echo "==> Step 2: Start frontend with temp config..."
docker compose down || true

# Build frontend first
docker compose build frontend

# Override nginx config temporarily
docker run -d --name eacsp-frontend-temp \
  -p 80:80 \
  -v certbot-www:/var/www/certbot \
  -v /tmp/nginx-temp.conf:/etc/nginx/conf.d/default.conf:ro \
  $(docker compose config --images | grep frontend | head -1)

echo "==> Step 3: Request certificate from Let's Encrypt..."
docker run --rm \
  -v certbot-conf:/etc/letsencrypt \
  -v certbot-www:/var/www/certbot \
  certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

echo "==> Step 4: Stop temp container, start full stack..."
docker stop eacsp-frontend-temp && docker rm eacsp-frontend-temp

docker compose up -d

echo ""
echo "==> Done! HTTPS is now active at https://$DOMAIN"
echo "    Certificates will auto-renew via the certbot container."
