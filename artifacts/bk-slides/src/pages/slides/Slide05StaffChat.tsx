export default function Slide05StaffChat() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "linear-gradient(160deg, #0d1520 0%, #0f1f35 100%)" }}>
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "#10b981" }} />

      <div className="absolute bottom-0 right-0 w-[35vw] h-[45vh] opacity-[0.04]" style={{ background: "radial-gradient(ellipse at bottom right, #10b981, transparent 70%)" }} />

      <div className="absolute inset-0 flex gap-[6vw] px-[8vw] py-[7vh]">
        <div className="flex flex-col flex-1">
          <div className="mb-[5vh]">
            <p className="font-body font-semibold tracking-widest uppercase mb-[1vh]" style={{ fontSize: "1.6vw", color: "#10b981" }}>
              โมดูล
            </p>
            <h2 className="font-display font-bold tracking-tight" style={{ fontSize: "4.5vw", color: "#f1f5f9" }}>
              แชทพนักงาน
            </h2>
            <p className="font-body mt-[1vh]" style={{ fontSize: "2.2vw", color: "#64748b" }}>Staff Chat</p>
          </div>

          <div className="flex flex-col gap-[2vh] flex-1">
            <div className="flex items-center gap-[2vw]" style={{ background: "#121e30", border: "1px solid #1a3048", borderRadius: "1vw", padding: "2vh 2.5vw" }}>
              <div className="w-[0.6vw] h-[4vh] rounded-full flex-shrink-0" style={{ background: "#10b981" }} />
              <div>
                <p className="font-display font-bold" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>แชทแบบ Real-time</p>
                <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>สื่อสารภายในทีมได้ทันที ไม่ต้องผ่าน LINE กลุ่มภายนอก</p>
              </div>
            </div>

            <div className="flex items-center gap-[2vw]" style={{ background: "#121e30", border: "1px solid #1a3048", borderRadius: "1vw", padding: "2vh 2.5vw" }}>
              <div className="w-[0.6vw] h-[4vh] rounded-full flex-shrink-0" style={{ background: "#10b981" }} />
              <div>
                <p className="font-display font-bold" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>แยกห้องตามหัวข้อ</p>
                <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>ห้องทั่วไป · ห้องหัวหน้างาน · แจ้งเตือนระบบ</p>
              </div>
            </div>

            <div className="flex items-center gap-[2vw]" style={{ background: "#121e30", border: "1px solid #1a3048", borderRadius: "1vw", padding: "2vh 2.5vw" }}>
              <div className="w-[0.6vw] h-[4vh] rounded-full flex-shrink-0" style={{ background: "#10b981" }} />
              <div>
                <p className="font-display font-bold" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>Push Notification</p>
                <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>รับแจ้งเตือนบนมือถือแม้ไม่ได้เปิดแอป — รองรับ PWA</p>
              </div>
            </div>

            <div className="flex items-center gap-[2vw]" style={{ background: "#121e30", border: "1px solid #1a3048", borderRadius: "1vw", padding: "2vh 2.5vw" }}>
              <div className="w-[0.6vw] h-[4vh] rounded-full flex-shrink-0" style={{ background: "#10b981" }} />
              <div>
                <p className="font-display font-bold" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>ผูกกับ LINE Notify</p>
                <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>ข้อความสำคัญส่งตรงผ่าน LINE ของแต่ละคน</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center w-[28vw]" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)", borderRadius: "1.5vw" }}>
          <div className="flex flex-col items-center gap-[2vh] p-[4vh_3vw]">
            <div className="w-[8vw] h-[8vw] flex items-center justify-center rounded-full" style={{ background: "rgba(16,185,129,0.15)", border: "2px solid rgba(16,185,129,0.3)" }}>
              <span className="font-display font-black" style={{ fontSize: "3.5vw", color: "#10b981" }}>✓</span>
            </div>
            <p className="font-display font-bold text-center" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>ใช้งานได้ทุกอุปกรณ์</p>
            <p className="font-body text-center" style={{ fontSize: "2vw", color: "#94a3b8" }}>เปิดใน Browser · ติดตั้งเป็น PWA บนมือถือ</p>
          </div>
        </div>
      </div>
    </div>
  );
}
