@echo off
chcp 65001 >nul
title CBH - Chann Back House Server

echo ============================================
echo   CBH - Chann Back House (Grand Diamond)
echo ============================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] ไม่พบ Node.js กรุณาติดตั้งจาก https://nodejs.org
    pause
    exit /b 1
)

:: Check if .env exists
if not exist ".env" (
    echo [ERROR] ไม่พบไฟล์ .env
    echo กรุณาคัดลอก .env.example เป็น .env แล้วแก้ไขค่าให้ถูกต้อง
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] กำลังติดตั้ง dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] ติดตั้ง dependencies ไม่สำเร็จ
        pause
        exit /b 1
    )
)

:: Build the application
echo [INFO] กำลัง build แอป...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build ไม่สำเร็จ
    pause
    exit /b 1
)

:: Push database schema
echo [INFO] กำลังอัพเดท database schema...
call npm run db:push
if %errorlevel% neq 0 (
    echo [WARNING] อัพเดท database schema มีปัญหา กรุณาตรวจสอบ DATABASE_URL
)

echo.
echo ============================================
echo   เริ่มต้น Server...
echo   เปิดเบราว์เซอร์ไปที่: http://localhost:5000
echo   กด Ctrl+C เพื่อหยุด server
echo ============================================
echo.

:: Start the server
call npm start

pause
