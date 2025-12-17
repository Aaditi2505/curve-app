#!/bin/bash
set -e

echo "---------------------------------"
echo "Starting VPS Setup for Curve App"
echo "---------------------------------"

# 1. Update System
echo "Updating package lists..."
apt-get update -y
# Optional: apt-get upgrade -y (skipped to save time, run manually if needed)

# 2. Install Tools
echo "Installing Git, Curl, and Build Essentials..."
apt-get install -y git curl build-essential

# 3. Install Node.js 20
echo "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 4. Install Process Manager (PM2)
echo "Installing PM2..."
npm install -g pm2

# 5. Clone Application
echo "Setting up application..."
cd /root

if [ -d "curve-app" ]; then
    echo "Directory 'curve-app' exists. Pulling latest changes..."
    cd curve-app
    git pull origin master
else
    echo "Cloning repository..."
    git clone https://github.com/Aaditi2505/curve-app.git
    cd curve-app
fi

# 6. Install App Dependencies
echo "Installing app dependencies..."
npm install

# 7. Configure Firewall (UFW) if active
echo "Configuring firewall..."
if command -v ufw > /dev/null; then
    ufw allow 22
    ufw allow 80
    ufw allow 443
    ufw allow 3000
    # We don't enable ufw automatically to avoid locking out, just allow ports
fi

# 8. Start Application
echo "Starting application with PM2..."
pm2 delete curve-app 2>/dev/null || true
pm2 start server.js --name curve-app

# 9. Save PM2 List
echo "Saving process list..."
pm2 save
pm2 startup | tail -n 1 | bash || true

echo "---------------------------------"
echo "Setup Complete!"
echo "Your app should be running at: http://$(curl -s ifconfig.me):3000"
echo "---------------------------------"
