export default function Slide02Problems() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "linear-gradient(160deg, #0d1520 0%, #0f1f35 100%)" }}>
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "#10b981" }} />

      <div className="absolute inset-0 flex flex-col px-[8vw] py-[7vh]">
        <div className="mb-[5vh]">
          <p className="font-body font-semibold tracking-widest uppercase mb-[1vh]" style={{ fontSize: "1.6vw", color: "#10b981" }}>
            ก่อนมีระบบ
          </p>
          <h2 className="font-display font-bold tracking-tight" style={{ fontSize: "4.5vw", color: "#f1f5f9" }}>
            ปัญหาที่เคยเจอ
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-[3vw] flex-1">
          <div className="flex flex-col justify-start" style={{ background: "#121e30", border: "1px solid #1e3050", borderRadius: "1.2vw", padding: "3vh 2.5vw" }}>
            <div className="w-[3vw] h-[3vw] flex items-center justify-center rounded-full mb-[2.5vh]" style={{ background: "rgba(16,185,129,0.12)" }}>
              <span className="font-display font-black" style={{ fontSize: "1.8vw", color: "#10b981" }}>01</span>
            </div>
            <h3 className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>
              ตารางกะทำมือ
            </h3>
            <p className="font-body leading-relaxed" style={{ fontSize: "2vw", color: "#94a3b8" }}>
              ใช้เวลาทำตารางนาน และมีโอกาสผิดพลาดสูงเมื่อพนักงานมีการเปลี่ยนกะ
            </p>
          </div>

          <div className="flex flex-col justify-start" style={{ background: "#121e30", border: "1px solid #1e3050", borderRadius: "1.2vw", padding: "3vh 2.5vw" }}>
            <div className="w-[3vw] h-[3vw] flex items-center justify-center rounded-full mb-[2.5vh]" style={{ background: "rgba(16,185,129,0.12)" }}>
              <span className="font-display font-black" style={{ fontSize: "1.8vw", color: "#10b981" }}>02</span>
            </div>
            <h3 className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>
              ติดตามพนักงานยาก
            </h3>
            <p className="font-body leading-relaxed" style={{ fontSize: "2vw", color: "#94a3b8" }}>
              ไม่ทราบว่าพนักงานคนไหนมาทำงาน ขาด หรือลา ในแต่ละวัน
            </p>
          </div>

          <div className="flex flex-col justify-start" style={{ background: "#121e30", border: "1px solid #1e3050", borderRadius: "1.2vw", padding: "3vh 2.5vw" }}>
            <div className="w-[3vw] h-[3vw] flex items-center justify-center rounded-full mb-[2.5vh]" style={{ background: "rgba(16,185,129,0.12)" }}>
              <span className="font-display font-black" style={{ fontSize: "1.8vw", color: "#10b981" }}>03</span>
            </div>
            <h3 className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>
              Labor Cost ไม่ชัดเจน
            </h3>
            <p className="font-body leading-relaxed" style={{ fontSize: "2vw", color: "#94a3b8" }}>
              คำนวณต้นทุนแรงงานย้อนหลัง ไม่มีข้อมูลแบบ real-time สำหรับตัดสินใจ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
