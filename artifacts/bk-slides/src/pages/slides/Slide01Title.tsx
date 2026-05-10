export default function Slide01Title() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "linear-gradient(135deg, #0b1420 0%, #0f1f35 50%, #0b1c2d 100%)" }}>
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "#10b981" }} />

      <div className="absolute top-[8vh] right-[8vw] w-[40vw] h-[40vw] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }} />
      <div className="absolute bottom-[-10vh] left-[-10vw] w-[50vw] h-[50vw] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, #34d399 0%, transparent 70%)" }} />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-[10vw]">
        <div className="text-center">
          <p className="font-body font-semibold tracking-[0.4em] uppercase mb-[2vh]" style={{ fontSize: "1.6vw", color: "#10b981" }}>
            Chann Back House · Grand Diamond
          </p>

          <h1 className="font-display font-black tracking-tight leading-none mb-[3vh]" style={{ fontSize: "5.5vw", color: "#f1f5f9", textWrap: "balance" }}>
            BK Work Schedule · Grand Diamond
          </h1>

          <div className="w-[12vw] h-[0.4vh] mx-auto mb-[3vh]" style={{ background: "linear-gradient(90deg, transparent, #10b981, transparent)" }} />

          <p className="font-body font-semibold" style={{ fontSize: "2.4vw", color: "#94a3b8" }}>
            ระบบจัดการพนักงานฝ่ายหลังร้าน
          </p>

          <p className="font-body mt-[1.5vh]" style={{ fontSize: "2vw", color: "#64748b" }}>
            Burger King Grand Diamond Branch · 2026
          </p>
        </div>
      </div>

      <div className="absolute bottom-[5vh] right-[8vw]">
        <p className="font-display font-bold tracking-widest uppercase" style={{ fontSize: "1.5vw", color: "#1e3a50" }}>
          Chanon Jaimool
        </p>
      </div>
    </div>
  );
}
