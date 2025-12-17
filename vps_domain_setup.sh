#!/bin/bash
set -e

DOMAIN="x3dmanagement.com"

echo "---------------------------------"
echo "Setting up Domain & SSL for $DOMAIN"
echo "---------------------------------"

# 1. Install Certbot (for SSL)
echo "Installing Certbot..."
apt-get update -y
apt-get install -y certbot python3-certbot-nginx

# 2. Configure Nginx with Domain
echo "Updating Nginx configuration..."
cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 3. Restart Nginx to apply changes
echo "Restarting Nginx..."
systemctl restart nginx

echo "---------------------------------"
echo "Configuration updated!"
echo "---------------------------------"
echo "FINAL STEP: You must run the SSL generator manually."
echo "Run this command now:"
echo ""
echo "    certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "---------------------------------"
