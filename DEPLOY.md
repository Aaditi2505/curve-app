# Deployment Instructions

Since your hosting doesn't automatically update from your computer, you need to manually "push" changes and then tell the server to "pull" them.

## 1. Save & Upload Changes (Local Computer)
Run this in your **VS Code Terminal (PowerShell)** whenever you save a file and want to update the site:

```powershell
# 1. Add all changes
git add .

# 2. Save with a message (change "Update" to whatever you did)
git commit -m "Update site"

# 3. Send to GitHub
git push origin master
```

## 2. Update the Server (VPS)
After you have pushed changes, run this **single command** to update your live website:

```powershell
ssh root@145.223.23.204 "cd /root/curve-app && git pull && pm2 restart curve-app"
```

---
**Tip:** You can run both steps at once by pasting this entire line into PowerShell:
```powershell
git add .; git commit -m "Update"; git push origin master; ssh root@145.223.23.204 "cd /root/curve-app && git pull && pm2 restart curve-app"
```
