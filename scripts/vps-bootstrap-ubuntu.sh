#!/usr/bin/env bash
set -euo pipefail

# Bootstrap minimal d'un VPS Ubuntu/Debian pour Pelledor.
# Usage:
#   chmod +x scripts/vps-bootstrap-ubuntu.sh
#   sudo APP_DIR=/var/www/pelledor DOMAIN=example.com ./scripts/vps-bootstrap-ubuntu.sh

APP_DIR="${APP_DIR:-/var/www/pelledor}"
APP_USER="${APP_USER:-www-data}"
DOMAIN="${DOMAIN:-localhost}"

echo "==> Installation dépendances système"
sudo apt-get update
sudo apt-get install -y curl git build-essential nginx

if ! command -v node >/dev/null 2>&1; then
  echo "==> Installation Node.js LTS"
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "==> Installation pnpm"
  sudo npm install -g pnpm
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installation pm2"
  sudo npm install -g pm2
fi

echo "==> Préparation dossier application"
sudo mkdir -p "${APP_DIR}"
sudo chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

cd "${APP_DIR}"
if [ ! -f "package.json" ]; then
  echo "ERREUR: package.json introuvable dans ${APP_DIR}"
  echo "Clonez d'abord le dépôt dans ce dossier."
  exit 1
fi

echo "==> Installation dépendances Node"
if [ -f "pnpm-lock.yaml" ]; then
  pnpm install
else
  npm install
fi

echo "==> Build initial (modules + Next.js)"
if [ -f "pnpm-lock.yaml" ]; then
  pnpm run saas:build
  pnpm install
  pnpm run build
else
  npm run saas:build
  npm install
  npm run build
fi

echo "==> Démarrage PM2"
pm2 start ecosystem.config.cjs --only saas-os || pm2 restart saas-os
pm2 save

echo "==> Configuration Nginx simple"
NGINX_CONF="/etc/nginx/sites-available/pelledor"
sudo tee "${NGINX_CONF}" >/dev/null <<EOF
server {
  listen 80;
  server_name ${DOMAIN};

  client_max_body_size 20m;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF

sudo ln -sf "${NGINX_CONF}" /etc/nginx/sites-enabled/pelledor
sudo nginx -t
sudo systemctl reload nginx

echo
echo "Bootstrap terminé."
echo "Prochaine étape: ouvrir http://${DOMAIN}/install pour finaliser la configuration applicative."
