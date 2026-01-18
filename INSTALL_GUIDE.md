# 📖 คู่มือติดตั้ง BK Work Schedule บนคอมร้าน

## 📋 สิ่งที่ต้องเตรียม

### 1. ติดตั้ง Node.js
1. ไปที่ https://nodejs.org
2. ดาวน์โหลด **LTS** version (แนะนำ 20.x หรือใหม่กว่า)
3. ติดตั้งตามขั้นตอน (กด Next ไปเรื่อยๆ)
4. ตรวจสอบว่าติดตั้งสำเร็จ: เปิด Command Prompt พิมพ์ `node --version`

### 2. ติดตั้ง PostgreSQL
1. ไปที่ https://www.postgresql.org/download/windows/
2. ดาวน์โหลด installer
3. ติดตั้งตามขั้นตอน
   - **จำรหัสผ่าน** ที่ตั้งไว้ (จะใช้ใน DATABASE_URL)
   - Port ใช้ค่าเริ่มต้น: **5432**
4. เปิด **pgAdmin** หรือ **SQL Shell** สร้าง database ใหม่ชื่อ `bkschedule`

```sql
CREATE DATABASE bkschedule;
```

---

## 🚀 ขั้นตอนติดตั้งแอป

### ขั้นตอนที่ 1: ดาวน์โหลดโค้ด
1. ใน Replit กดปุ่ม **⋮** (สามจุด) ด้านบนขวา
2. เลือก **Download as ZIP**
3. แตกไฟล์ไปยังโฟลเดอร์ที่ต้องการ เช่น `C:\BKSchedule`

### ขั้นตอนที่ 2: ตั้งค่า Environment Variables
1. ในโฟลเดอร์โปรเจค คัดลอกไฟล์ `.env.example` เป็น `.env`
2. เปิดไฟล์ `.env` ด้วย Notepad แก้ไขค่าต่างๆ:

```
# ⚠️ ต้องตั้งค่า (Required)
DATABASE_URL=postgresql://postgres:รหัสผ่านของคุณ@localhost:5432/bkschedule
SALT=ใส่ค่าอะไรก็ได้ที่เป็นความลับ
MANAGER_VERIFY_CODE=รหัสสำหรับสมัคร Manager
BRANCH_NAME=ชื่อสาขาของคุณ

# ✅ ไม่บังคับ (Optional) - ใช้ค่าเริ่มต้นได้
PORT=5000
SESSION_TTL_SECONDS=604800

# 📧 สำหรับ OTP Email (ถ้าไม่ใส่ = ไม่สามารถ reset password ผ่าน email)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
```

**หมายเหตุ:** ถ้าไม่ตั้งค่า RESEND_API_KEY ระบบ OTP reset password จะไม่ทำงาน (ยังสามารถใช้งานฟีเจอร์อื่นได้ปกติ)

### ขั้นตอนที่ 3: รันแอป
1. ดับเบิลคลิก **start-windows.bat**
2. รอจนเห็นข้อความ "เริ่มต้น Server..." และไม่มี error
3. เปิดเบราว์เซอร์ไปที่ http://localhost:5000

**สำหรับ Mac/Linux:** ใช้ Terminal รันคำสั่ง:
```bash
chmod +x start-linux.sh start-tunnel.sh
./start-linux.sh
```

---

## 🌐 เปิดให้เข้าถึงจากภายนอกร้าน (Cloudflare Tunnel)

### ติดตั้ง Cloudflared (ครั้งแรกเท่านั้น)

#### วิธี A: ใช้ winget (แนะนำ)
เปิด Command Prompt แล้วพิมพ์:
```
winget install cloudflare.cloudflared
```

#### วิธี B: ดาวน์โหลดเอง
1. ไปที่ https://github.com/cloudflare/cloudflared/releases
2. ดาวน์โหลด `cloudflared-windows-amd64.exe`
3. เปลี่ยนชื่อเป็น `cloudflared.exe`
4. ใส่ในโฟลเดอร์เดียวกับโปรเจค หรือใส่ใน PATH

### การใช้งาน Tunnel
1. **เปิด start-windows.bat** ก่อน (รัน server)
2. **เปิด start-tunnel.bat** (เปิด tunnel)
3. จะได้ URL แบบ `https://xxxxx.trycloudflare.com`
4. แชร์ URL นี้ให้พนักงานใช้งาน

### ⚠️ หมายเหตุสำคัญ
- URL จะเปลี่ยนทุกครั้งที่เปิด tunnel ใหม่
- ถ้าต้องการ URL ถาวร ให้อ่านหัวข้อ "Named Tunnel" ด้านล่าง

---

## 🔒 ตั้งค่า Named Tunnel (URL ถาวร)

ถ้าต้องการ URL ที่ไม่เปลี่ยน:

### 1. สมัคร Cloudflare (ฟรี)
1. ไปที่ https://cloudflare.com
2. สมัครบัญชี
3. เพิ่ม domain ของคุณ (ถ้ามี) หรือใช้ subdomain ฟรี

### 2. Login cloudflared
```
cloudflared tunnel login
```
(จะเปิดเบราว์เซอร์ให้ login)

### 3. สร้าง Tunnel
```
cloudflared tunnel create bk-schedule
```

### 4. ตั้งค่า DNS
```
cloudflared tunnel route dns bk-schedule schedule.yourdomain.com
```

### 5. สร้างไฟล์ config.yml
สร้างไฟล์ `~/.cloudflared/config.yml`:
```yaml
tunnel: bk-schedule
credentials-file: C:\Users\YourName\.cloudflared\xxxxx.json

ingress:
  - hostname: schedule.yourdomain.com
    service: http://localhost:5000
  - service: http_status:404
```

### 6. รัน Tunnel
```
cloudflared tunnel run bk-schedule
```

---

## 🔧 การแก้ปัญหาเบื้องต้น

### ปัญหา: ไม่สามารถเชื่อมต่อ Database
- ตรวจสอบว่า PostgreSQL service กำลังทำงาน
- ตรวจสอบ DATABASE_URL ในไฟล์ .env
- ตรวจสอบรหัสผ่าน PostgreSQL

### ปัญหา: Port 5000 ถูกใช้งานแล้ว
- ปิดโปรแกรมอื่นที่ใช้ port 5000
- หรือแก้ไข PORT ในไฟล์ .env เป็นตัวเลขอื่น เช่น 3000

### ปัญหา: OTP ไม่ส่ง Email
- ตรวจสอบ RESEND_API_KEY ในไฟล์ .env
- ถ้าไม่มี Resend account ให้สมัครที่ https://resend.com

---

## 📱 การเข้าถึงจากมือถือ

### ภายในร้าน (WiFi เดียวกัน)
1. หา IP ของคอมร้าน: เปิด Command Prompt พิมพ์ `ipconfig`
2. ดู IPv4 Address เช่น `192.168.1.100`
3. เปิดเบราว์เซอร์บนมือถือไปที่ `http://192.168.1.100:5000`

### ภายนอกร้าน
- ใช้ URL จาก Cloudflare Tunnel

---

## ⏰ ตั้งให้รันอัตโนมัติตอนเปิดคอม

1. กด `Win + R` พิมพ์ `shell:startup`
2. คัดลอก shortcut ของ `start-windows.bat` ไปใส่ในโฟลเดอร์ Startup
3. (ถ้าต้องการ tunnel ด้วย) คัดลอก shortcut ของ `start-tunnel.bat` ด้วย

---

## 📞 ต้องการความช่วยเหลือ?

ถ้ามีปัญหาในการติดตั้ง สามารถติดต่อผู้พัฒนาได้
