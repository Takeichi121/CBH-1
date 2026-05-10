export const LogoDataHouse = ({ size = 120 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad-cbh-midnight" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#021008" />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>
    </defs>

    <rect width="120" height="120" rx="26" fill="url(#grad-cbh-midnight)" />

    <path
      d="M 22 56 L 60 28 L 98 56"
      stroke="white"
      strokeWidth="7.5"
      strokeLinecap="butt"
      strokeLinejoin="round"
      fill="none"
    />

    <rect x="34" y="62" width="12" height="18" rx="1.5" fill="white" />
    <rect x="54" y="50" width="12" height="30" rx="1.5" fill="white" />
    <rect x="74" y="34" width="12" height="46" rx="1.5" fill="white" />

    <text
      x="60"
      y="105"
      textAnchor="middle"
      fill="white"
      fontFamily="Montserrat, Arial Black, sans-serif"
      fontWeight="900"
      fontSize="28"
      letterSpacing="1"
    >
      CBH
    </text>
  </svg>
);
