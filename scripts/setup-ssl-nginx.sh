#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/setup-ssl-nginx.sh <domain> <email>" >&2
  exit 1
fi

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [[ -z "${DOMAIN}" || -z "${EMAIL}" ]]; then
  echo "Usage: sudo bash scripts/setup-ssl-nginx.sh <domain> <email>" >&2
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  apt-get update
  apt-get install -y nginx
fi

apt-get update
apt-get install -y certbot python3-certbot-nginx

mkdir -p /var/www/certbot

TEMPLATE_PATH="/var/www/tend/deploy/nginx/tend.conf.template"
TARGET_PATH="/etc/nginx/sites-available/tend"
LINK_PATH="/etc/nginx/sites-enabled/tend"
OLD_LINK_PATH="/etc/nginx/sites-enabled/tend.am"

if [[ ! -f "${TEMPLATE_PATH}" ]]; then
  echo "Template not found: ${TEMPLATE_PATH}" >&2
  exit 1
fi

# Bootstrap with HTTP-only config so nginx can start before cert files exist.
cat > "${TARGET_PATH}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

if [[ ! -L "${LINK_PATH}" ]]; then
  ln -s "${TARGET_PATH}" "${LINK_PATH}"
fi

# Disable legacy/conflicting site entry if it exists.
if [[ -L "${OLD_LINK_PATH}" ]]; then
  rm -f "${OLD_LINK_PATH}"
fi

if [[ -f /etc/nginx/sites-enabled/default ]]; then
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t
systemctl reload nginx

# Get/renew cert first.
certbot certonly --webroot -w /var/www/certbot --agree-tos --no-eff-email -m "${EMAIL}" -d "${DOMAIN}"

# Then enable full HTTPS + redirect configuration.
sed "s/__DOMAIN__/${DOMAIN}/g" "${TEMPLATE_PATH}" > "${TARGET_PATH}"

nginx -t
systemctl reload nginx

echo "SSL enabled for ${DOMAIN}. HTTP now redirects to HTTPS."
