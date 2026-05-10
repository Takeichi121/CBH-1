export default function Slide10Team() {
  const managers = [
    {
      thaiName: "กิติพงศ์ วิทยาลักษณ์",
      engName: "Kitipong Wittayalak",
      initials: "KW",
      color: "#10b981",
    },
    {
      thaiName: "วงศกร บุญตา",
      engName: "Wongsakon Bunta",
      initials: "WB",
      color: "#3b82f6",
    },
    {
      thaiName: "นันทนัช ทองภูสวรรค์",
      engName: "Nuntanut Tongpoosawan",
      initials: "NT",
      color: "#a855f7",
    },
    {
      thaiName: "สมโชค ศุภกิจบุญชู",
      engName: "Somchock Supakijboonchoo",
      initials: "SS",
      color: "#f59e0b",
    },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "linear-gradient(160deg, #0d1520 0%, #0f1f35 100%)" }}>
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "#10b981" }} />
      <div className="absolute top-[5vh] right-[5vw] w-[35vw] h-[35vw] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }} />
      <div className="absolute bottom-[-5vh] left-[-5vw] w-[35vw] h-[35vw] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, #34d399 0%, transparent 70%)" }} />

      <div className="absolute inset-0 flex flex-col items-center px-[8vw] py-[4vh]">
        {/* Header */}
        <div className="text-center mb-[3.5vh] flex-shrink-0">
          <p className="font-body font-semibold tracking-widest uppercase mb-[0.8vh]" style={{ fontSize: "1.4vw", color: "#10b981" }}>
            ทีมผู้บริหาร
          </p>
          <h2 className="font-display font-bold tracking-tight" style={{ fontSize: "4vw", color: "#f1f5f9" }}>
            Grand Diamond Management Team
          </h2>
        </div>

        {/* Profile cards — 2×2 grid */}
        <div className="grid grid-cols-2 gap-[2.5vw] w-full flex-1 min-h-0 max-w-[80vw]">
          {managers.map((m) => (
            <div
              key={m.engName}
              className="flex items-center gap-[2vw]"
              style={{
                background: "#121e30",
                border: "1px solid #1a3048",
                borderRadius: "1.2vw",
                padding: "2.5vh 2.5vw",
              }}
            >
              {/* Avatar */}
              <div
                className="flex-shrink-0 flex items-center justify-center font-display font-black"
                style={{
                  width: "7vw",
                  height: "7vw",
                  borderRadius: "50%",
                  background: `${m.color}22`,
                  border: `0.25vw solid ${m.color}55`,
                  fontSize: "2.5vw",
                  color: m.color,
                  letterSpacing: "0.05em",
                }}
              >
                {m.initials}
              </div>
              {/* Text */}
              <div className="flex flex-col min-w-0">
                <p className="font-display font-bold leading-tight mb-[0.6vh]" style={{ fontSize: "2.2vw", color: "#f1f5f9" }}>
                  {m.thaiName}
                </p>
                <p className="font-body" style={{ fontSize: "1.5vw", color: "#64748b" }}>
                  {m.engName}
                </p>
                <div
                  className="mt-[1vh] inline-block"
                  style={{
                    background: `${m.color}18`,
                    border: `1px solid ${m.color}40`,
                    borderRadius: "0.5vw",
                    padding: "0.3vh 0.8vw",
                    fontSize: "1.1vw",
                    color: m.color,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    width: "fit-content",
                  }}
                >
                  Restaurant Manager
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
