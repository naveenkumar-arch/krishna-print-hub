@echo off
cd /d "%~dp0"
git add .
git commit -m "Fix PDF upload host to Catbox direct public URL to eliminate Cloudinary 401 download errors"
git push origin main
