#!/bin/bash

echo "============================================"
echo "  CBH - Chann Back House (Grand Diamond)"
echo "============================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] ไม่พบ Node.js กรุณาติดตั้งก่อน"
    echo "สำหรับ Ubuntu/Debian: sudo apt install nodejs npm"
    echo "สำหรับ Mac: brew install node"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "[ERROR] ไม่พบไฟล์ .env"
    echo "กรุณาคัดลอก .env.example เป็น .env แล้วแก้ไขค่าให้ถูกต้อง"
    echo "คำสั่ง: cp .env.example .env"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[INFO] กำลังติดตั้ง dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] ติดตั้ง dependencies ไม่สำเร็จ"
        exit 1
    fi
fi

# Build the application
echo "[INFO] กำลัง build แอป..."
npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Build ไม่สำเร็จ"
    exit 1
fi

# Push database schema
echo "[INFO] กำลังอัพเดท database schema..."
npm run db:push

echo ""
echo "============================================"
echo "  เริ่มต้น Server..."
echo "  เปิดเบราว์เซอร์ไปที่: http://localhost:5000"
echo "  กด Ctrl+C เพื่อหยุด server"
echo "============================================"
echo ""

# Start the server
npm start
