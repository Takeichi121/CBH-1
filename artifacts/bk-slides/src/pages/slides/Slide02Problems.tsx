export default function Slide02Problems() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "linear-gradient(160deg, #0d1520 0%, #0f1f35 100%)" }}>
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "#10b981" }} />

      <div className="absolute inset-0 flex flex-col px-[8vw] py-[5vh]">
        <div className="mb-[3vh] flex-shrink-0">
          <p className="font-body font-semibold tracking-widest uppercase mb-[1vh]" style={{ fontSize: "1.5vw", color: "#10b981" }}>
            ก่อนมีระบบ
          </p>
          <h2 className="font-display font-bold tracking-tight" style={{ fontSize: "4vw", color: "#f1f5f9" }}>
            ปัญหาที่เคยเจอ
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-[2.5vw] flex-1 min-h-0">
          <div className="flex flex-col justify-start" style={{ background: "#121e30", border: "1px solid #1e3050", borderRadius: "1.2vw", padding: "2.5vh 2.5vw" }}>
            <div className="w-[3vw] h-[3vw] flex items-center justify-center rounded-full mb-[2vh]" style={{ background: "rgba(16,185,129,0.12)" }}>
              <span className="font-display font-black" style={{ fontSize: "1.8vw", color: "#10b981" }}>01</span>
            </div>
            <h3 className="font-display font-bold mb-[1vh]" style={{ fontSize: "2.1vw", color: "#f1f5f9" }}>
              ไม่รู้ยอดขาย real-time
            </h3>
            <p className="font-body leading-relaxed" style={{ fontSize: "1.8vw", color: "#94a3b8" }}>
              ต้องรอสรุปปลายวันหรือปลายเดือนถึงจะรู้ว่าถึง Target หรือยัง
            </p>
          </div>

          <div className="flex flex-col justify-start" style={{ background: "#121e30", border: "1px solid #1e3050", borderRadius: "1.2vw", padding: "2.5vh 2.5vw" }}>
            <div className="w-[3vw] h-[3vw] flex items-center justify-center rounded-full mb-[2vh]" style={{ background: "rgba(16,185,129,0.12)" }}>
              <span className="font-display font-black" style={{ fontSize: "1.8vw", color: "#10b981" }}>02</span>
            </div>
            <h3 className="font-display font-bold mb-[1vh]" style={{ fontSize: "2.1vw", color: "#f1f5f9" }}>
              ตารางกะทำมือ
            </h3>
            <p className="font-body leading-relaxed" style={{ fontSize: "1.8vw", color: "#94a3b8" }}>
              ใช้เวลาทำตารางนาน มีโอกาสผิดพลาดสูงเมื่อพนักงานเปลี่ยนกะ
            </p>
          </div>

          <div className="flex flex-col justify-start" style={{ background: "#121e30", border: "1px solid #1e3050", borderRadius: "1.2vw", padding: "2.5vh 2.5vw" }}>
            <div className="w-[3vw] h-[3vw] flex items-center justify-center rounded-full mb-[2vh]" style={{ background: "rgba(16,185,129,0.12)" }}>
              <span className="font-display font-black" style={{ fontSize: "1.8vw", color: "#10b981" }}>03</span>
            </div>
            <h3 className="font-display font-bold mb-[1vh]" style={{ fontSize: "2.1vw", color: "#f1f5f9" }}>
              Labor Cost ไม่ชัดเจน
            </h3>
            <p className="font-body leading-relaxed" style={{ fontSize: "1.8vw", color: "#94a3b8" }}>
              ไม่มีข้อมูล Labor % แบบ real-time ทำให้ควบคุมต้นทุนล่าช้า
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
