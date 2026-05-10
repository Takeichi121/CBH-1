export default function Slide06ChannAI() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "linear-gradient(135deg, #071420 0%, #0a1e34 40%, #0d2440 100%)" }}>
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "#10b981" }} />

      <div className="absolute inset-0 flex items-center opacity-[0.05]" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, #10b981, transparent)" }} />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-[10vw]">
        <div className="text-center mb-[4vh]">
          <p className="font-body font-semibold tracking-[0.4em] uppercase mb-[2vh]" style={{ fontSize: "1.6vw", color: "#10b981" }}>
            AI Assistant
          </p>
          <h2 className="font-display font-black tracking-tight mb-[2vh]" style={{ fontSize: "6vw", color: "#f1f5f9" }}>
            Chann
          </h2>
          <p className="font-body" style={{ fontSize: "2.4vw", color: "#94a3b8" }}>
            ผู้ช่วย AI ฝ่ายหลังร้านที่รู้จักระบบของคุณ
          </p>
        </div>

        <div className="w-[60vw] h-[0.3vh] mb-[4vh]" style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.5), transparent)" }} />

        <div className="grid grid-cols-3 gap-[3vw] w-full max-w-[80vw]">
          <div className="text-center" style={{ background: "rgba(21,34,50,0.8)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "1vw", padding: "2.5vh 2vw" }}>
            <p className="font-display font-bold mb-[1vh]" style={{ fontSize: "2.2vw", color: "#34d399" }}>ถามข้อมูลกะ</p>
            <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>วันนี้ใครทำ Open กะ?</p>
          </div>
          <div className="text-center" style={{ background: "rgba(21,34,50,0.8)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "1vw", padding: "2.5vh 2vw" }}>
            <p className="font-display font-bold mb-[1vh]" style={{ fontSize: "2.2vw", color: "#34d399" }}>ยอดขายวันนี้</p>
            <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}>ยอดรวม Net Sales เท่าไร?</p>
          </div>
          <div className="text-center" style={{ background: "rgba(21,34,50,0.8)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "1vw", padding: "2.5vh 2vw" }}>
            <p className="font-display font-bold mb-[1vh]" style={{ fontSize: "2.2vw", color: "#34d399" }}>วิเคราะห์ Labor</p>
            <p className="font-body" style={{ fontSize: "2vw", color: "#94a3b8" }}> % Labor Cost สัปดาห์นี้เป็นอย่างไร?</p>
          </div>
        </div>

        <div className="mt-[4vh]">
          <p className="font-body text-center" style={{ fontSize: "2vw", color: "#4a6580" }}>
            ขับเคลื่อนด้วย GPT-4o · เชื่อมต่อข้อมูลจริงจากระบบ
          </p>
        </div>
      </div>
    </div>
  );
}
