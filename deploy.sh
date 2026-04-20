#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# EA to CSP Assessment Platform — Ubuntu 26.04 Deployment Script
# ──────────────────────────────────────────────────────────────
set -euo pipefail

echo "=== EA to CSP Assessment Platform — Setup ==="

# 1. Install Docker if not present
if ! command -v docker &>/dev/null; then
    echo ">>> Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker "$USER"
    echo ">>> Docker installed. You may need to log out and back in for group changes."
fi

# 2. Check frontend .env file
if [ ! -f frontend/.env ]; then
    echo ">>> Creating frontend/.env from frontend/.env.example..."
    cp frontend/.env.example frontend/.env
    echo ">>> IMPORTANT: Edit frontend/.env and set VITE_AZURE_CLIENT_ID"
    echo "      Then re-run this script."
    exit 1
fi

# 3. Build and start
echo ">>> Building and starting containers..."
docker compose up -d --build

echo ""
echo "=== Deployment Complete ==="
echo "  Frontend: http://localhost"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "Next steps:"
echo "  1. Register an Azure AD App at https://portal.azure.com"
echo "     → App registrations → New registration"
echo "     → Supported account types: 'Accounts in any organizational directory'"
echo "  2. Add platform: Single-page application (SPA)"
echo "     → Redirect URI: http://<your-server-ip>"
echo "  3. Grant API permissions: Azure Service Management (user_impersonation)"
echo "  4. Copy the Application (client) ID"
echo "  5. Set VITE_AZURE_CLIENT_ID in frontend/.env"
echo "  6. Run: docker compose up -d --build"
echo ""
echo "  NOTE: No client secret is needed — the SPA uses PKCE for secure auth."
