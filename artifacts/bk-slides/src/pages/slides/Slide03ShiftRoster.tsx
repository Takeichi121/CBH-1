export default function Slide03ShiftRoster() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "linear-gradient(160deg, #0d1520 0%, #0f1f35 100%)" }}>
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "#10b981" }} />

      <div className="absolute top-0 right-0 w-[30vw] h-[100vh] opacity-[0.03]" style={{ background: "linear-gradient(90deg, transparent, #10b981)" }} />

      <div className="absolute inset-0 flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-end justify-between mb-[5vh]">
          <div>
            <p className="font-body font-semibold tracking-widest uppercase mb-[1vh]" style={{ fontSize: "1.6vw", color: "#10b981" }}>
              โมดูล
            </p>
            <h2 className="font-display font-bold tracking-tight" style={{ fontSize: "4.5vw", color: "#f1f5f9" }}>
              ระบบจัดการกะ &amp; Roster
            </h2>
          </div>
          <div className="text-right">
            <p className="font-display font-black" style={{ fontSize: "2vw", color: "#1e3a50" }}>Shift Management</p>
          </div>
        </div>

        <div className="flex gap-[4vw] flex-1">
          <div className="flex flex-col gap-[2.5vh] flex-1">
            <div className="flex items-start gap-[2vw]" style={{ background: "#121e30", border: "1px solid #1a3048", borderRadius: "1vw", padding: "2.5vh 2.5vw" }}>
              <div className="w-[0.5vw] self-stretch rounded-full flex-shrink-0" style={{ background: "#10b981" }} />
              <div>
                <h3 className="font-display font-bold mb-[0.8vh]" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>สร้างตารางกะอัตโนมัติ</h3>
                <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>กำหนดกะ Open / Mid / Close และจัดพนักงานได้ครบโดยอัตโนมัติ</p>
              </div>
            </div>

            <div className="flex items-start gap-[2vw]" style={{ background: "#121e30", border: "1px solid #1a3048", borderRadius: "1vw", padding: "2.5vh 2.5vw" }}>
              <div className="w-[0.5vw] self-stretch rounded-full flex-shrink-0" style={{ background: "#10b981" }} />
              <div>
                <h3 className="font-display font-bold mb-[0.8vh]" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>Roster รายสัปดาห์</h3>
                <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>ดู Roster แบบ Kanban แต่ละวัน แก้ไขได้ในไม่กี่คลิก</p>
              </div>
            </div>

            <div className="flex items-start gap-[2vw]" style={{ background: "#121e30", border: "1px solid #1a3048", borderRadius: "1vw", padding: "2.5vh 2.5vw" }}>
              <div className="w-[0.5vw] self-stretch rounded-full flex-shrink-0" style={{ background: "#10b981" }} />
              <div>
                <h3 className="font-display font-bold mb-[0.8vh]" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>แจ้งเตือนกะไม่ครบ</h3>
                <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>ระบบตรวจสอบและแจ้งเตือนเมื่อกะใดขาดพนักงานตามเกณฑ์</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center w-[28vw]" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: "1.5vw", padding: "4vh 3vw" }}>
            <p className="font-display font-black text-center mb-[1vh]" style={{ fontSize: "8vw", color: "#10b981" }}>7</p>
            <p className="font-body font-semibold text-center" style={{ fontSize: "2vw", color: "#f1f5f9" }}>วันต่อสัปดาห์</p>
            <div className="w-[8vw] h-[0.3vh] my-[2vh]" style={{ background: "rgba(16,185,129,0.3)" }} />
            <p className="font-body text-center" style={{ fontSize: "2vw", color: "#94a3b8" }}>กะ Open · Mid · Close</p>
            <p className="font-body text-center mt-[0.8vh]" style={{ fontSize: "2vw", color: "#94a3b8" }}>พร้อม LINE Notification</p>
          </div>
        </div>
      </div>
    </div>
  );
}
