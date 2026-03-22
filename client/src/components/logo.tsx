export const LogoDataHouse = ({ size = 120 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad-cbh-midnight" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#000000" />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>
    </defs>

    {/* Background */}
    <rect width="120" height="120" rx="26" fill="url(#grad-cbh-midnight)" />

    {/* House roof — white triangle */}
    <polygon
      points="60,14 14,50 106,50"
      fill="white"
      opacity="0.95"
    />

    {/* House walls — very subtle fill to frame bars */}
    <rect x="20" y="50" width="80" height="42" fill="white" opacity="0.07" rx="2" />

    {/* Data bars — 3 bars of different heights inside house */}
    <rect x="27" y="58" width="14" height="34" rx="3" fill="white" opacity="0.90" />
    <rect x="53" y="70" width="14" height="22" rx="3" fill="white" opacity="0.70" />
    <rect x="79" y="63" width="14" height="29" rx="3" fill="white" opacity="0.85" />

    {/* Floor line */}
    <line x1="20" y1="92" x2="100" y2="92" stroke="white" strokeWidth="2.5" opacity="0.40" strokeLinecap="round" />

    {/* CBH label */}
    <text
      x="60"
      y="110"
      textAnchor="middle"
      fill="white"
      fontFamily="Arial, Helvetica, sans-serif"
      fontWeight="bold"
      fontSize="13"
      opacity="0.88"
      letterSpacing="1"
    >
      CBH
    </text>
  </svg>
);
