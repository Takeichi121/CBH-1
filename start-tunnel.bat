@echo off
chcp 65001 >nul
title Cloudflare Tunnel

echo ============================================
echo   Cloudflare Tunnel - เปิดให้เข้าจากภายนอก
echo ============================================
echo.

:: Check if cloudflared is installed
where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] ไม่พบ cloudflared
    echo.
    echo กรุณาติดตั้ง Cloudflare Tunnel:
    echo 1. ไปที่ https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
    echo 2. ดาวน์โหลด cloudflared สำหรับ Windows
    echo 3. แตกไฟล์และใส่ใน PATH หรือใส่ในโฟลเดอร์เดียวกับโปรเจค
    echo.
    pause
    exit /b 1
)

echo [INFO] กำลังเริ่ม Cloudflare Tunnel...
echo [INFO] รอสักครู่จะได้รับ URL สำหรับเข้าถึงจากภายนอก
echo.
echo ============================================
echo   หมายเหตุ: URL จะเปลี่ยนทุกครั้งที่เปิด tunnel ใหม่
echo   ถ้าต้องการ URL ถาวร ให้ตั้งค่า Named Tunnel
echo   ดูวิธีที่ INSTALL_GUIDE.md
echo ============================================
echo.

cloudflared tunnel --url http://localhost:5000

pause
