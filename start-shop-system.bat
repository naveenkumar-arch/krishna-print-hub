@echo off
title Krishna Students Print Hub - Shop Systems Launch
echo ====================================================
echo   KRISHNA STUDENTS PRINT HUB - AUTO-LAUNCH SERVER
echo ====================================================
echo.

echo Checking Node dependencies in the backend. Please wait...
if not exist node_modules\whatsapp-web.js (
    echo.
    echo [SETUP] WhatsApp modules are missing. Installing now...
    echo [SETUP] This runs once in the backend and may take a moment.
    call npm install whatsapp-web.js qrcode-terminal --no-audit --no-fund
    echo [SETUP] Installation complete!
) else (
    echo [SETUP] Dependencies verified successfully.
)

echo.
echo [1/2] Note: The Print Queue is now handled by the standalone Java Desktop GUI app.
echo       Ensure the "Krishna Students Print Agent" is running in your Windows taskbar.
echo.
echo [2/2] Starting WhatsApp Bot Controller (Chatbot)...
start "WhatsApp Bot" cmd /k "node whatsapp-bot.js"

echo.
echo ====================================================
echo   SUCCESS: Launching WhatsApp Chatbot!
echo   - Keep this window running while the shop is open.
echo ====================================================
echo.
pause
