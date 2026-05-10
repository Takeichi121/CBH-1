export default function Slide08LaborCost() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "linear-gradient(160deg, #0d1520 0%, #0f1f35 100%)" }}>
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "#10b981" }} />

      <div className="absolute inset-0 flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-end justify-between mb-[5vh]">
          <div>
            <p className="font-body font-semibold tracking-widest uppercase mb-[1vh]" style={{ fontSize: "1.6vw", color: "#10b981" }}>
              โมดูล
            </p>
            <h2 className="font-display font-bold tracking-tight" style={{ fontSize: "4.5vw", color: "#f1f5f9" }}>
              Labor Cost Management
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-[3vw] mb-[4vh]">
          <div className="flex flex-col items-center justify-center text-center" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "1.2vw", padding: "3.5vh 2vw" }}>
            <p className="font-display font-black mb-[1vh]" style={{ fontSize: "5vw", color: "#10b981" }}>%</p>
            <p className="font-display font-bold mb-[0.5vh]" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>Labor %</p>
            <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>สัดส่วน Labor ต่อ Net Sales คำนวณอัตโนมัติ</p>
          </div>

          <div className="flex flex-col items-center justify-center text-center" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "1.2vw", padding: "3.5vh 2vw" }}>
            <p className="font-display font-black mb-[1vh]" style={{ fontSize: "5vw", color: "#34d399" }}>฿</p>
            <p className="font-display font-bold mb-[0.5vh]" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>ยอดขายรายวัน</p>
            <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>บันทึก Net Sales แต่ละวันเพื่อใช้คำนวณ Labor</p>
          </div>

          <div className="flex flex-col items-center justify-center text-center" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "1.2vw", padding: "3.5vh 2vw" }}>
            <p className="font-display font-black mb-[1vh]" style={{ fontSize: "5vw", color: "#6ee7b7" }}>7d</p>
            <p className="font-display font-bold mb-[0.5vh]" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>รายงานรายสัปดาห์</p>
            <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>สรุป KPI Labor ทั้งสัปดาห์แบบ Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-[3vw]" style={{ background: "#121e30", border: "1px solid #1a3048", borderRadius: "1vw", padding: "2.5vh 3vw" }}>
          <div className="w-[0.5vw] self-stretch rounded-full flex-shrink-0" style={{ background: "#10b981" }} />
          <div>
            <p className="font-display font-bold mb-[0.5vh]" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>เป้าหมาย Labor % ที่กำหนดได้</p>
            <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>ตั้งค่าเป้าหมาย % แต่ละสัปดาห์ ระบบแจ้งเตือนเมื่อเกินหรือต่ำกว่าเกณฑ์ เพื่อช่วยควบคุมต้นทุนแรงงานได้แม่นยำ</p>
          </div>
        </div>
      </div>
    </div>
  );
}
