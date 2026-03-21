export const LogoDataHouse = ({ size = 120 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad-bk-orange" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffab40" />
        <stop offset="100%" stopColor="#e64a19" />
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="26" fill="url(#grad-bk-orange)" />
    <text
      x="60"
      y="82"
      textAnchor="middle"
      fill="#ffffff"
      fontFamily="Arial, Helvetica, sans-serif"
      fontWeight="bold"
      fontSize="54"
      letterSpacing="-1"
    >
      BK
    </text>
  </svg>
);
