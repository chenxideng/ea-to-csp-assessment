#!/bin/sh
set -e

CERT_PATH="/etc/letsencrypt/live/charlesdeng.eastasia.cloudapp.azure.com/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/charlesdeng.eastasia.cloudapp.azure.com/privkey.pem"

if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
    cp /etc/nginx/templates/nginx.https.conf /etc/nginx/conf.d/default.conf
    echo "Starting nginx with HTTPS configuration"
else
    cp /etc/nginx/templates/nginx.http.conf /etc/nginx/conf.d/default.conf
    echo "Certificates not found, starting nginx in HTTP fallback mode"
fi

exec nginx -g 'daemon off;'