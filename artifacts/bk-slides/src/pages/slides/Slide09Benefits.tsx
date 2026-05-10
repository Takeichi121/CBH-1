export default function Slide09Benefits() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "linear-gradient(160deg, #0d1520 0%, #0f1f35 100%)" }}>
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "#10b981" }} />
      <div className="absolute bottom-0 left-0 w-[50vw] h-[40vh] opacity-[0.03]" style={{ background: "radial-gradient(ellipse at bottom left, #34d399, transparent 70%)" }} />

      <div className="absolute inset-0 flex flex-col items-center px-[8vw] py-[5vh]">
        <div className="text-center mb-[3vh] flex-shrink-0">
          <p className="font-body font-semibold tracking-widest uppercase mb-[0.8vh]" style={{ fontSize: "1.5vw", color: "#10b981" }}>
            สรุป
          </p>
          <h2 className="font-display font-bold tracking-tight" style={{ fontSize: "4vw", color: "#f1f5f9" }}>
            สิ่งที่ได้จากระบบ
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-[2.5vw] w-full flex-1 min-h-0">
          <div className="flex flex-col" style={{ background: "#121e30", border: "1px solid #1a3048", borderRadius: "1.2vw", padding: "2.5vh 2.5vw" }}>
            <p className="font-display font-black mb-[1.5vh]" style={{ fontSize: "4vw", color: "#10b981" }}>01</p>
            <p className="font-display font-bold mb-[1vh]" style={{ fontSize: "2.1vw", color: "#f1f5f9" }}>ติดตามยอดขาย</p>
            <p className="font-body" style={{ fontSize: "1.8vw", color: "#94a3b8", lineHeight: 1.4 }}>รู้ยอด real-time เทียบ Target ได้ทันที ไม่ต้องรอสรุปปลายวัน</p>
          </div>

          <div className="flex flex-col" style={{ background: "#121e30", border: "1px solid #1a3048", borderRadius: "1.2vw", padding: "2.5vh 2.5vw" }}>
            <p className="font-display font-black mb-[1.5vh]" style={{ fontSize: "4vw", color: "#10b981" }}>02</p>
            <p className="font-display font-bold mb-[1vh]" style={{ fontSize: "2.1vw", color: "#f1f5f9" }}>ประหยัดเวลา</p>
            <p className="font-body" style={{ fontSize: "1.8vw", color: "#94a3b8", lineHeight: 1.4 }}>จัดตารางกะได้เร็วขึ้น ลดงานซ้ำซ้อน ทุกอย่างอยู่ในที่เดียว</p>
          </div>

          <div className="flex flex-col" style={{ background: "#121e30", border: "1px solid #1a3048", borderRadius: "1.2vw", padding: "2.5vh 2.5vw" }}>
            <p className="font-display font-black mb-[1.5vh]" style={{ fontSize: "4vw", color: "#10b981" }}>03</p>
            <p className="font-display font-bold mb-[1vh]" style={{ fontSize: "2.1vw", color: "#f1f5f9" }}>ควบคุม Labor</p>
            <p className="font-body" style={{ fontSize: "1.8vw", color: "#94a3b8", lineHeight: 1.4 }}>มีตัวเลข Labor % พร้อมตัดสินใจทุกวัน ไม่ต้องรอสรุปเดือน</p>
          </div>
        </div>

        <div className="mt-[2.5vh] w-full flex-shrink-0" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "1vw", padding: "2vh 3vw" }}>
          <p className="font-body text-center font-semibold" style={{ fontSize: "2vw", color: "#34d399" }}>
            Sales + Back of House — ครบทุกมิติ ในแอปเดียว สำหรับ Grand Diamond
          </p>
        </div>
      </div>
    </div>
  );
}
