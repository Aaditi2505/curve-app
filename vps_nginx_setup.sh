#!/bin/bash
set -e

echo "---------------------------------"
echo "Setting up Nginx Reverse Proxy"
echo "---------------------------------"

# 1. Install Nginx
echo "Installing Nginx..."
apt-get update -y
apt-get install -y nginx

# 2. Configure Nginx
echo "Configuring Nginx..."
# Backup default config just in case
mv /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup 2>/dev/null || true

# Create new config
cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80;
    server_name _;

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

# 3. Test and Restart Nginx
echo "Testing configuration..."
nginx -t

echo "Restarting Nginx..."
systemctl restart nginx

echo "---------------------------------"
echo "Nginx Setup Complete!"
echo "You can now access your app at: http://$(curl -s ifconfig.me)"
echo "(No need for :3000 anymore!)"
echo "---------------------------------"
