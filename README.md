# EA to CSP Assessment Platform

Assess Azure resources for migration from Enterprise Agreement (EA) or Web Direct to Cloud Solution Provider (CSP). Users sign in via Azure AD SSO — no credentials are entered on the platform.

## Architecture

```
┌─────────────────────┐       ┌─────────────────────┐
│   Frontend (React)  │──────▶│  Backend (FastAPI)   │
│   Nginx · Port 80   │ /api  │  Uvicorn · Port 8000 │
│   MSAL.js · Ant UI  │       │  Azure SDK · Jinja2  │
└─────────────────────┘       └─────────────────────┘
         │                              │
         │ MSAL.js PKCE                 │ Bearer Token
         ▼                              ▼
┌─────────────────────┐       ┌─────────────────────┐
│  Azure AD (SSO)     │       │  Azure Management   │
│  login.microsoft.com│       │  management.azure.com│
└─────────────────────┘       └─────────────────────┘
```

- **Frontend**: React 19 + Vite + Ant Design 5 + MSAL.js (browser-based SSO via PKCE)
- **Backend**: Python 3.12 + FastAPI + Azure SDK (stateless, accepts Bearer token from frontend)
- **Deployment**: Docker Compose (two containers: `frontend` on port 80, `backend` on port 8000)

---

## Prerequisites

- Ubuntu 24.04 server (fresh install is fine)
- A user with `sudo` privileges
- Network access to `login.microsoftonline.com` and `management.azure.com`
- An Azure AD tenant where you can register an App

---

## Step 1 — Register an Azure AD Application

> This is done **once** in the Azure Portal. No client secret is needed — the app uses PKCE (public client).

1. Go to [Azure Portal → Azure Active Directory → App registrations](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps)
2. Click **New registration**
3. Fill in:
   - **Name**: `EA to CSP Assessment` (or any name you like)
   - **Supported account types**: **Accounts in any organizational directory (Any Azure AD directory — Multitenant)**
   - **Redirect URI**: Select **Single-page application (SPA)** and enter:
     ```
     http://<YOUR_SERVER_IP_OR_DOMAIN>
     ```
     For local testing, use `http://localhost:5173`
4. Click **Register**
5. On the app overview page, copy the **Application (client) ID** — you will need it later
6. Go to **API permissions** → **Add a permission**:
   - Select **APIs my organization uses** → search for `Azure Service Management`
   - Select **Delegated permissions** → check **user_impersonation**
   - Click **Add permissions**
7. (Optional) Click **Grant admin consent** if you are a tenant admin

That's it. No certificates or secrets are required.

---

## Step 2 — Prepare the Server

SSH into your Ubuntu 24.04 machine:

```bash
ssh your-user@your-server-ip
```

### 2.1 Install Docker

```bash
# Update packages
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow running docker without sudo
sudo usermod -aG docker $USER
```

**Log out and log back in** for the group change to take effect:

```bash
exit
ssh your-user@your-server-ip
```

Verify Docker is working:

```bash
docker --version
docker compose version
```

### 2.2 Clone the Repository

```bash
git clone <your-repo-url> ea-to-csp-assessment
cd ea-to-csp-assessment
```

---

## Step 3 — Configure Environment

### 3.1 Frontend Environment

```bash
cp frontend/.env.example frontend/.env
nano frontend/.env
```

Set the Azure AD App client ID you copied in Step 1:

```env
VITE_AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 3.2 Root Environment (for Docker Compose)

```bash
cp .env.example .env
nano .env
```

Update with your actual values:

```env
VITE_AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
FRONTEND_URL=http://your-server-ip
BACKEND_URL=http://your-server-ip:8000
```

> The `VITE_AZURE_CLIENT_ID` in the root `.env` is passed as a Docker build arg to the frontend container.

---

## Step 4 — Build and Run

```bash
docker compose up -d --build
```

This will:
1. Build the **backend** image (Python 3.12 + FastAPI + Azure SDK + WeasyPrint)
2. Build the **frontend** image (Node 22 → Vite build → Nginx)
3. Start both containers in the background

Check that the containers are running:

```bash
docker compose ps
```

Expected output:
```
NAME              IMAGE                     STATUS          PORTS
eacsp-backend     ea-to-csp-assessment-backend   Up          0.0.0.0:8000->8000/tcp
eacsp-frontend    ea-to-csp-assessment-frontend  Up          0.0.0.0:80->80/tcp
```

---

## Step 5 — Verify

| URL | Description |
|-----|-------------|
| `http://<server-ip>` | Frontend — click "Sign in with Azure AD" |
| `http://<server-ip>/api/health` | Backend health check (should return `{"status": "healthy"}`) |
| `http://<server-ip>/api/docs` | Swagger API documentation |

---

## Step 6 — Using the Platform

1. Open `http://<server-ip>` in a browser
2. Click **Sign in with Azure AD** — a Microsoft login popup appears
3. Sign in with any Azure AD account that has access to Azure subscriptions
4. After login, you land on the **Dashboard** — all subscriptions and resource counts are listed
5. Go to **Assessment** — select subscriptions, optionally override account type, click **Run Assessment**
6. Review the readiness score and per-resource migration difficulty
7. Go to **Reports** — download as HTML, PDF, or JSON

---

## Managing the Deployment

### View logs

```bash
# All logs
docker compose logs -f

# Backend only
docker compose logs -f backend

# Frontend only
docker compose logs -f frontend
```

### Restart after config change

```bash
docker compose up -d --build
```

### Stop

```bash
docker compose down
```

### Update to latest code

```bash
git pull
docker compose up -d --build
```

---

## Optional — HTTPS with Let's Encrypt

For production, you should serve over HTTPS. A simple approach using Certbot:

```bash
# Install Certbot
sudo apt-get install -y certbot

# Stop frontend temporarily to free port 80
docker compose stop frontend

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Certificate files will be in /etc/letsencrypt/live/yourdomain.com/
```

Then update `frontend/nginx.conf` to add SSL:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Mount the certificate in `docker-compose.yml`:

```yaml
  frontend:
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
    ports:
      - "80:80"
      - "443:443"
```

Remember to update the Azure AD App redirect URI to `https://yourdomain.com`.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Not authenticated" error on API calls | Token expired — refresh the page to trigger silent re-auth |
| Login popup blocked by browser | Allow popups for your domain, or switch MSAL to redirect mode |
| `VITE_AZURE_CLIENT_ID` is empty | Rebuild frontend after setting the env: `docker compose up -d --build` |
| `docker: permission denied` | Run `sudo usermod -aG docker $USER` then log out and back in |
| Backend can't reach Azure APIs | Ensure outbound HTTPS (443) to `management.azure.com` is allowed |
| No subscriptions shown | The logged-in user must have at least Reader role on Azure subscriptions |
| PDF generation fails | WeasyPrint system dependencies are included in the Docker image — if running without Docker, install: `sudo apt-get install libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libcairo2` |

---

## Project Structure

```
ea-to-csp-assessment/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py              # FastAPI app entry point
│       ├── config.py            # Settings (pydantic-settings)
│       ├── auth/
│       │   ├── azure_auth.py    # Bearer token extraction + JWT decode
│       │   └── routes.py        # /api/auth/me
│       ├── azure_resources/
│       │   ├── resource_scanner.py  # Azure SDK calls (subscriptions, resources, billing)
│       │   └── routes.py            # /api/resources/*
│       ├── assessment/
│       │   ├── engine.py        # Assessment logic + scoring
│       │   ├── rules.py         # 30+ resource type migration rules
│       │   └── routes.py        # /api/assessment/*
│       ├── report/
│       │   ├── generator.py     # HTML + PDF rendering
│       │   ├── routes.py        # /api/report/*
│       │   └── templates/
│       │       └── report.html  # Jinja2 report template
│       └── models/
│           └── schemas.py       # Pydantic models
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx             # React + MSAL provider setup
│       ├── App.jsx              # Routes + auth guard
│       ├── authConfig.js        # MSAL configuration
│       ├── api.js               # Axios + Bearer token interceptor
│       ├── components/
│       │   └── AppLayout.jsx    # Sidebar + header layout
│       └── pages/
│           ├── LoginPage.jsx    # Azure AD SSO login
│           ├── DashboardPage.jsx  # Subscription overview
│           ├── AssessmentPage.jsx # Run assessment + results
│           └── ReportPage.jsx     # Download HTML/PDF/JSON report
├── docker-compose.yml
├── deploy.sh
├── .env.example
└── .gitignore
```


docker compose build --no-cache frontend && docker compose up -d