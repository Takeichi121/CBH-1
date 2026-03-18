# 📖 คู่มือติดตั้ง CBH บนคอมร้าน

**CBH — Chann Back House (Grand Diamond / BK1040)**

คู่มือนี้จะช่วยให้คุณรันแอป CBH บนคอมร้านเองได้ฟรีทั้งหมด โดยใช้ **Cloudflare Tunnel** เพื่อเปิดให้เข้าถึงจากภายนอกได้

---

## 📋 สิ่งที่ต้องเตรียม (ทำครั้งแรกเท่านั้น)

### 1. ติดตั้ง Node.js
1. ไปที่ https://nodejs.org
2. ดาวน์โหลด **LTS** version (แนะนำ 20.x หรือใหม่กว่า)
3. ติดตั้งตามขั้นตอน (กด Next ไปเรื่อยๆ)
4. ตรวจสอบว่าติดตั้งสำเร็จ: เปิด Command Prompt พิมพ์
   ```
   node --version
   ```

### 2. ติดตั้ง PostgreSQL
1. ไปที่ https://www.postgresql.org/download/windows/
2. ดาวน์โหลด installer (เลือก Windows x86-64)
3. ติดตั้งตามขั้นตอน:
   - **จำรหัสผ่าน** ที่ตั้งไว้สำหรับ user `postgres` (จะใช้ใน DATABASE_URL)
   - Port ใช้ค่าเริ่มต้น: **5432**
   - ติดตั้ง pgAdmin ด้วย (ติ๊กไว้)
4. หลังติดตั้ง เปิด **pgAdmin** หรือ **SQL Shell (psql)**
5. สร้าง database ใหม่ชื่อ `cbhdb`:
   ```sql
   CREATE DATABASE cbhdb;
   ```

---

## 🚀 ขั้นตอนติดตั้งแอป

### ขั้นตอนที่ 1: ดาวน์โหลดโค้ด
1. ใน Replit กดปุ่ม **⋮** (สามจุด) ด้านบนขวา
2. เลือก **Download as ZIP**
3. แตกไฟล์ ZIP ไปยังโฟลเดอร์ที่ต้องการ เช่น `C:\CBH`

### ขั้นตอนที่ 2: ตั้งค่า Environment Variables
1. ในโฟลเดอร์ `C:\CBH` คัดลอกไฟล์ `.env.example` เป็น `.env`
   - คลิกขวาที่ `.env.example` → Copy → Paste → เปลี่ยนชื่อเป็น `.env`
2. เปิดไฟล์ `.env` ด้วย **Notepad** (คลิกขวา → Open with → Notepad)
3. แก้ไขค่าต่างๆ ดังนี้ (ดูรายละเอียดทุก key ใน `.env.example`):

```
DATABASE_URL=postgresql://postgres:รหัสผ่านของคุณ@localhost:5432/cbhdb
SALT=ใส่ค่าอะไรก็ได้ที่เป็นความลับ
MANAGER_VERIFY_CODE=รหัสสำหรับสมัคร Manager
BRANCH_NAME=Grand Diamond
```

> **หมายเหตุ:** `.env` เป็นไฟล์ที่อาจมองไม่เห็นใน File Explorer
> ถ้ามองไม่เห็น: ใน File Explorer → View → ติ๊ก "Hidden items"

### ขั้นตอนที่ 3: ย้ายข้อมูลจาก Replit มาคอมร้าน

มี 2 วิธี เลือกตามความต้องการ:

---

#### วิธี A — ใช้ `database_export.sql` (ข้อมูล seed มาตรฐาน)
ใช้เมื่อ: ต้องการเริ่มต้นใหม่ด้วยข้อมูล config/users มาตรฐาน (ไม่เอาข้อมูลขายจริง)

1. รัน `start-windows.bat` ครั้งแรกให้สำเร็จ (เพื่อให้ db:push สร้างตารางก่อน)
2. หยุด server (Ctrl+C)
3. เปิด **pgAdmin** → เชื่อมต่อ localhost
4. คลิกขวาที่ database `cbhdb` → **Query Tool**
5. เปิดไฟล์ `database_export.sql` (File → Open) → กด **Run (F5)**

**หรือใช้ psql command line:**
```
psql -U postgres -d cbhdb -f C:\CBH\database_export.sql
```

---

#### วิธี B — Dump ข้อมูลจริงจาก Replit (ย้ายข้อมูลทั้งหมด)
ใช้เมื่อ: ต้องการนำข้อมูลขายจริง / roster / borrow records จาก Replit มาด้วย

**ขั้นตอน B1: ดู DATABASE_URL จาก Replit**
1. เปิดโปรเจค Replit
2. คลิก **Secrets** (ไอคอนกุญแจ) ในแถบด้านซ้าย
3. คัดลอกค่า `DATABASE_URL` — จะมีรูปแบบ:
   ```
   postgresql://user:password@host:5432/dbname
   ```

**ขั้นตอน B2: Dump จาก Replit (รันบนคอมที่มี psql/pg_dump)**
```bash
# แทนที่ YOUR_REPLIT_DATABASE_URL ด้วยค่าจริงจาก Replit Secrets
pg_dump "YOUR_REPLIT_DATABASE_URL" \
  --no-owner --no-acl \
  --format=plain \
  --file=replit_backup.sql
```

> ถ้าคอมไม่มี pg_dump: ติดตั้งได้จาก https://www.postgresql.org/download/ (เลือก Command Line Tools)

**ขั้นตอน B3: Import เข้า cbhdb บนคอมร้าน**
```bash
# รัน start-windows.bat ก่อน แล้วหยุด server แล้วค่อย import
psql -U postgres -d cbhdb -f replit_backup.sql
```

> ⚠️ ถ้า error เรื่อง role/owner ให้เพิ่ม `--no-owner --no-acl` ใน pg_dump
> และถ้า conflict ให้ drop ตาราง แล้ว import ใหม่ หรือใช้ `--clean` flag กับ pg_dump

### ขั้นตอนที่ 4: รันแอป
1. ดับเบิลคลิก **start-windows.bat** ในโฟลเดอร์ `C:\CBH`
2. รอจนเห็นข้อความ `Server running on port 5000` (อาจใช้เวลา 1-2 นาทีครั้งแรก)
3. เปิดเบราว์เซอร์ไปที่ http://localhost:5000

**สำหรับ Mac/Linux:** ใช้ Terminal รันคำสั่ง:
```bash
chmod +x start-linux.sh start-tunnel.sh
./start-linux.sh
```

---

## 🌐 เปิดให้เข้าถึงจากอุปกรณ์อื่น (Cloudflare Tunnel)

ใช้เพื่อให้มือถือหรือคอมเครื่องอื่นในร้าน/นอกร้านเข้าแอปได้

### ขั้นตอนที่ 1: ติดตั้ง Cloudflared (ครั้งแรกเท่านั้น)

#### วิธี A: ใช้ winget (แนะนำ — เปิด Command Prompt แล้วพิมพ์)
```
winget install cloudflare.cloudflared
```

#### วิธี B: ดาวน์โหลดเอง
1. ไปที่ https://github.com/cloudflare/cloudflared/releases
2. ดาวน์โหลด `cloudflared-windows-amd64.exe`
3. เปลี่ยนชื่อเป็น `cloudflared.exe`
4. ใส่ในโฟลเดอร์ `C:\CBH` (เดียวกับโปรเจค)

### ขั้นตอนที่ 2: เปิด Tunnel
1. **เปิด start-windows.bat** ก่อน (รัน server)
2. **เปิด start-tunnel.bat** ในหน้าต่างใหม่
3. รอจนเห็น URL แบบ `https://xxxxx.trycloudflare.com`
4. แชร์ URL นี้ให้ทีมงานใช้

> ⚠️ **URL จะเปลี่ยนทุกครั้งที่เปิด tunnel ใหม่**
> ถ้าต้องการ URL ถาวร ดูหัวข้อ "Named Tunnel" ด้านล่าง

---

## 🔒 ตั้งค่า Named Tunnel (URL ถาวร — ไม่เปลี่ยน)

ถ้าต้องการ URL ที่ไม่เปลี่ยนทุกครั้ง:

### 1. สมัคร Cloudflare (ฟรี)
1. ไปที่ https://cloudflare.com → Create account
2. ไม่จำเป็นต้องมี domain ของตัวเอง

### 2. Login cloudflared
เปิด Command Prompt แล้วพิมพ์:
```
cloudflared tunnel login
```
จะเปิดเบราว์เซอร์ให้ login Cloudflare → อนุมัติ

### 3. สร้าง Tunnel
```
cloudflared tunnel create cbh-store
```
จะได้ Tunnel ID (เก็บไว้)

### 4. ตั้งค่า DNS (ต้องมี domain)
```
cloudflared tunnel route dns cbh-store cbh.yourdomain.com
```

### 5. สร้างไฟล์ config
สร้างไฟล์ `%USERPROFILE%\.cloudflared\config.yml`:
```yaml
tunnel: cbh-store
credentials-file: C:\Users\YourName\.cloudflared\TUNNEL-ID.json

ingress:
  - hostname: cbh.yourdomain.com
    service: http://localhost:5000
  - service: http_status:404
```

### 6. รัน Tunnel ถาวร
```
cloudflared tunnel run cbh-store
```

---

## 📱 การเข้าถึงจากมือถือหรืออุปกรณ์ในร้าน

### ภายในร้าน (WiFi เดียวกัน — ไม่ต้องใช้ Tunnel)
1. หา IP ของคอมที่รัน server: เปิด Command Prompt พิมพ์ `ipconfig`
2. ดู **IPv4 Address** เช่น `192.168.1.100`
3. เปิดเบราว์เซอร์บนมือถือไปที่ `http://192.168.1.100:5000`

### ภายนอกร้าน
- ใช้ URL จาก Cloudflare Tunnel

---

## ⏰ ตั้งให้รันอัตโนมัติตอนเปิดคอม

1. กด `Win + R` → พิมพ์ `shell:startup` → Enter
2. คัดลอก **shortcut** ของ `start-windows.bat` ไปใส่ในโฟลเดอร์ Startup
   - คลิกขวาที่ `start-windows.bat` → Send to → Desktop (เพื่อสร้าง shortcut)
   - ย้าย shortcut ไปใส่ใน Startup folder
3. (ถ้าต้องการ tunnel ด้วย) ทำเช่นเดียวกันกับ `start-tunnel.bat`

---

## 🤖 การตั้งค่า Chann AI บนคอมร้าน

Chann AI ต้องใช้ OpenAI API Key ซึ่งต่างจาก Replit (Replit ใช้ key ของตัวเอง)

1. สมัคร OpenAI account ที่ https://platform.openai.com
2. สร้าง API Key ที่ https://platform.openai.com/api-keys
3. ใส่ใน `.env`:
   ```
   AI_INTEGRATIONS_OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxx
   AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
   ```

> ถ้าไม่ต้องการใช้ Chann AI ปล่อยว่างไว้ได้ ฟีเจอร์อื่นยังทำงานได้ปกติ

---

## 🔧 การแก้ปัญหาเบื้องต้น

### ปัญหา: ไม่สามารถเชื่อมต่อ Database
- ตรวจสอบว่า PostgreSQL service กำลังทำงาน:
  - เปิด Services (Win+R → `services.msc`) → หา `postgresql-x64-XX` → Start
- ตรวจสอบ `DATABASE_URL` ในไฟล์ `.env`
- ตรวจสอบรหัสผ่าน PostgreSQL ให้ตรงกัน

### ปัญหา: Port 5000 ถูกใช้งานแล้ว
- ปิดโปรแกรมอื่นที่ใช้ port 5000
- หรือแก้ไข `PORT=3000` ในไฟล์ `.env` แล้วเปิด http://localhost:3000 แทน

### ปัญหา: [ERROR] Build ไม่สำเร็จ
- ตรวจสอบว่า Node.js ติดตั้งถูกต้อง: `node --version`
- ลบโฟลเดอร์ `node_modules` แล้วรัน `npm install` ใหม่
- ตรวจสอบว่าไม่มี antivirus บล็อกการรัน Node.js

### ปัญหา: OTP Email ไม่ทำงาน
- ตรวจสอบ `RESEND_API_KEY` ในไฟล์ `.env`
- สมัคร Resend account ฟรีที่ https://resend.com (ส่งได้ 100 email/วัน)

### ปัญหา: Cloudflared ไม่พบ
- ตรวจสอบว่าติดตั้งแล้ว: เปิด Command Prompt พิมพ์ `cloudflared --version`
- ถ้าใช้วิธี B (ดาวน์โหลดเอง) ให้แน่ใจว่าไฟล์อยู่ใน `C:\CBH` หรือใน PATH

### ปัญหา: ลืมรหัสผ่าน PostgreSQL
- เปิด pgAdmin → คลิกขวาที่ server → Properties → แก้ Password
- หรือถอนการติดตั้งและติดตั้ง PostgreSQL ใหม่

---

## 📞 ต้องการความช่วยเหลือ?

ถ้ามีปัญหาในการติดตั้ง สามารถติดต่อผู้พัฒนาได้ที่ Chann AI หรือทีม Dev
