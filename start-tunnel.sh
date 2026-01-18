#!/bin/bash

echo "============================================"
echo "  Cloudflare Tunnel - เปิดให้เข้าจากภายนอก"
echo "============================================"
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "[ERROR] ไม่พบ cloudflared"
    echo ""
    echo "กรุณาติดตั้ง Cloudflare Tunnel:"
    echo ""
    echo "สำหรับ Mac:"
    echo "  brew install cloudflare/cloudflare/cloudflared"
    echo ""
    echo "สำหรับ Ubuntu/Debian:"
    echo "  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared"
    echo "  chmod +x cloudflared"
    echo "  sudo mv cloudflared /usr/local/bin/"
    echo ""
    exit 1
fi

echo "[INFO] กำลังเริ่ม Cloudflare Tunnel..."
echo "[INFO] รอสักครู่จะได้รับ URL สำหรับเข้าถึงจากภายนอก"
echo ""
echo "============================================"
echo "  หมายเหตุ: URL จะเปลี่ยนทุกครั้งที่เปิด tunnel ใหม่"
echo "  ถ้าต้องการ URL ถาวร ให้ตั้งค่า Named Tunnel"
echo "  ดูวิธีที่ INSTALL_GUIDE.md"
echo "============================================"
echo ""

cloudflared tunnel --url http://localhost:5000
