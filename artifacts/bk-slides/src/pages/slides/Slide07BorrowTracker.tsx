export default function Slide07BorrowTracker() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "linear-gradient(160deg, #0d1520 0%, #0f1f35 100%)" }}>
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "#10b981" }} />

      <div className="absolute inset-0 flex flex-col px-[8vw] py-[7vh]">
        <div className="mb-[5vh]">
          <p className="font-body font-semibold tracking-widest uppercase mb-[1vh]" style={{ fontSize: "1.6vw", color: "#10b981" }}>
            โมดูล
          </p>
          <h2 className="font-display font-bold tracking-tight" style={{ fontSize: "4.5vw", color: "#f1f5f9" }}>
            ระบบยืม-คืนอุปกรณ์
          </h2>
          <p className="font-body mt-[1vh]" style={{ fontSize: "2.2vw", color: "#64748b" }}>Borrow Tracker</p>
        </div>

        <div className="grid grid-cols-2 gap-[4vw] flex-1">
          <div className="flex flex-col gap-[2.5vh]">
            <div className="p-[2.5vh_2.5vw]" style={{ background: "#121e30", border: "1px solid #1a3048", borderRadius: "1vw" }}>
              <p className="font-display font-bold mb-[0.8vh]" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>บันทึกการยืม</p>
              <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>ระบุผู้ยืม อุปกรณ์ วันยืม — จัดเก็บอัตโนมัติ</p>
            </div>

            <div className="p-[2.5vh_2.5vw]" style={{ background: "#121e30", border: "1px solid #1a3048", borderRadius: "1vw" }}>
              <p className="font-display font-bold mb-[0.8vh]" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>แจ้งเตือนค้างคืน</p>
              <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>ระบบแจ้งอัตโนมัติเมื่ออุปกรณ์ยังไม่ถูกคืนตามกำหนด</p>
            </div>

            <div className="p-[2.5vh_2.5vw]" style={{ background: "#121e30", border: "1px solid #1a3048", borderRadius: "1vw" }}>
              <p className="font-display font-bold mb-[0.8vh]" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>ดูประวัติการยืม</p>
              <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>ค้นหาย้อนหลังได้ว่าใครยืมอะไร ตั้งแต่เมื่อไร</p>
            </div>
          </div>

          <div className="flex flex-col justify-center pl-[4vw]" style={{ borderLeft: "1px solid #1a3048" }}>
            <p className="font-display font-black mb-[1vh]" style={{ fontSize: "2.8vw", color: "#10b981" }}>ประโยชน์หลัก</p>
            <p className="font-body mb-[2vh]" style={{ fontSize: "2vw", color: "#94a3b8" }}>
              ลดปัญหาอุปกรณ์หาย ไม่รู้ว่าใครยืม
            </p>
            <p className="font-body mb-[2vh]" style={{ fontSize: "2vw", color: "#94a3b8" }}>
              หัวหน้าเห็นภาพรวมอุปกรณ์ทั้งหมดได้ทันที
            </p>
            <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>
              รองรับอุปกรณ์หลายประเภทในร้านเดียวกัน
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
