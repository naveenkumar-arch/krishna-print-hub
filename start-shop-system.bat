@echo off
title Krishna Students Print Hub - Shop Systems Launch
echo ====================================================
echo   KRISHNA STUDENTS PRINT HUB - LOCAL SHOP LAUNCHER
echo ====================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed on this PC.
    echo Please download and install Node.js from https://nodejs.org to run the portal locally.
    echo Opening https://nodejs.org in your browser...
    start https://nodejs.org
    pause
    exit /b 1
)

echo [1/3] Starting Local Web Portal Server (Next.js)...
start "Local Print Hub Web Server" cmd /k "cd /d "%~dp0" && npm run dev"

echo [2/3] Launching Java Print Agent...
start "Krishna Print Agent" cmd /k "cd /d "%~dp0" && java -jar KrishnaPrintAgent.jar"

echo [3/3] Opening Local Portals in Browser...
timeout /t 5 >nul
start http://localhost:3000
start http://localhost:3000/admin/queue

echo ====================================================
echo   SUCCESS: Local Portals & Print Agent Started!
echo   - Customer Portal : http://localhost:3000
echo   - Admin Queue     : http://localhost:3000/admin/queue
echo ====================================================
echo.
pause
