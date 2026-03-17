const midnight = {
  gradFrom: "#0f2027",
  gradTo: "#203a43",
  text: "#4ade80",
};

export const LogoDataHouse = ({ size = 120 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad-data-midnight" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={midnight.gradFrom} />
        <stop offset="100%" stopColor={midnight.gradTo} />
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="30" fill="url(#grad-data-midnight)" />
    <path d="M25 50 L60 20 L95 50" stroke={midnight.text} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="35" y="65" width="12" height="35" rx="4" fill={midnight.text} opacity="0.6" />
    <rect x="54" y="45" width="12" height="55" rx="4" fill={midnight.text} />
    <rect x="73" y="55" width="12" height="45" rx="4" fill={midnight.text} opacity="0.8" />
  </svg>
);
