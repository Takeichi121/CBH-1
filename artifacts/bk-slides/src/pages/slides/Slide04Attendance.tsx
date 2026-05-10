export default function Slide04Attendance() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "linear-gradient(160deg, #0d1520 0%, #0f1f35 100%)" }}>
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "#10b981" }} />

      <div className="absolute inset-0 flex flex-col px-[8vw] py-[7vh]">
        <div className="mb-[5vh]">
          <p className="font-body font-semibold tracking-widest uppercase mb-[1vh]" style={{ fontSize: "1.6vw", color: "#10b981" }}>
            โมดูล
          </p>
          <h2 className="font-display font-bold tracking-tight" style={{ fontSize: "4.5vw", color: "#f1f5f9" }}>
            บันทึกเวลาทำงาน
          </h2>
          <p className="font-body mt-[1vh]" style={{ fontSize: "2.2vw", color: "#64748b" }}>Attendance / Clock In-Out</p>
        </div>

        <div className="grid grid-cols-2 gap-[4vw] flex-1">
          <div className="flex flex-col gap-[2.5vh]">
            <div className="p-[2.5vh_2.5vw]" style={{ background: "#121e30", border: "1px solid #1a3048", borderRadius: "1vw" }}>
              <p className="font-display font-bold mb-[0.8vh]" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>บันทึก Clock In / Out</p>
              <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>บันทึกเวลาเข้า-ออกพร้อมแสดงสถานะแบบ real-time</p>
            </div>

            <div className="p-[2.5vh_2.5vw]" style={{ background: "#121e30", border: "1px solid #1a3048", borderRadius: "1vw" }}>
              <p className="font-display font-bold mb-[0.8vh]" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>ดูสถานะพนักงานรายวัน</p>
              <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>มา / ขาด / ลา ครบถ้วนในหน้าเดียว มองเห็นภาพรวมได้ทันที</p>
            </div>

            <div className="p-[2.5vh_2.5vw]" style={{ background: "#121e30", border: "1px solid #1a3048", borderRadius: "1vw" }}>
              <p className="font-display font-bold mb-[0.8vh]" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>รายงานย้อนหลัง</p>
              <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>Export ข้อมูลการมาทำงานรายเดือนสำหรับ Payroll</p>
            </div>
          </div>

          <div className="flex flex-col justify-center items-start gap-[3vh] pl-[3vw]" style={{ borderLeft: "1px solid #1a3048" }}>
            <div>
              <p className="font-display font-black" style={{ fontSize: "9vw", color: "#10b981", lineHeight: 1 }}>3</p>
              <p className="font-body font-semibold" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>สถานะที่ติดตาม</p>
              <p className="font-body mt-[0.5vh]" style={{ fontSize: "2vw", color: "#94a3b8" }}>มาทำงาน · ขาด · ลา</p>
            </div>
            <div className="w-[10vw] h-[0.3vh]" style={{ background: "rgba(16,185,129,0.3)" }} />
            <div>
              <p className="font-display font-black" style={{ fontSize: "9vw", color: "#34d399", lineHeight: 1 }}>Live</p>
              <p className="font-body font-semibold" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>อัปเดตแบบ Real-time</p>
              <p className="font-body mt-[0.5vh]" style={{ fontSize: "2vw", color: "#94a3b8" }}>ทุกการบันทึกสะท้อนทันที</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
