export default function Slide10ThankYou() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "linear-gradient(135deg, #0b1420 0%, #0f1f35 50%, #0b1c2d 100%)" }}>
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "#10b981" }} />

      <div className="absolute top-[8vh] right-[8vw] w-[40vw] h-[40vw] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }} />
      <div className="absolute bottom-[-5vh] left-[-8vw] w-[45vw] h-[45vw] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, #34d399 0%, transparent 70%)" }} />

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-body font-semibold tracking-[0.4em] uppercase mb-[3vh]" style={{ fontSize: "1.6vw", color: "#10b981" }}>
          Chann Back House · Grand Diamond
        </p>

        <h2 className="font-display font-black tracking-tight text-center mb-[2vh]" style={{ fontSize: "6vw", color: "#f1f5f9" }}>
          ขอบคุณทุกคน
        </h2>

        <p className="font-body text-center mb-[3vh]" style={{ fontSize: "2.4vw", color: "#94a3b8" }}>
          ระบบนี้สร้างขึ้นเพื่อทีม Grand Diamond — ด้วยความตั้งใจจริง
        </p>

        <div className="w-[15vw] h-[0.4vh] mb-[4vh]" style={{ background: "linear-gradient(90deg, transparent, #10b981, transparent)" }} />

        <div className="flex flex-col items-center gap-[1.5vh]">
          <p className="font-display font-bold" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>
            Chanon Jaimool (Chan J.)
          </p>
          <p className="font-body" style={{ fontSize: "2vw", color: "#64748b" }}>
            BK Work Schedule · v2026
          </p>
        </div>
      </div>
    </div>
  );
}
