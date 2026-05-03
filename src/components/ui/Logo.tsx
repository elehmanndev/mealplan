interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Calendar body */}
      <rect x="6" y="11" width="38" height="41" rx="4" />
      {/* Top binding clips */}
      <rect x="14" y="5" width="3" height="9" rx="1.5" fill="currentColor" stroke="none" />
      <rect x="33" y="5" width="3" height="9" rx="1.5" fill="currentColor" stroke="none" />
      {/* Calendar header divider */}
      <line x1="6" y1="20" x2="44" y2="20" />
      {/* Date squares */}
      <rect x="12" y="26" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="19" y="26" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="26" y="26" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="33" y="26" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="12" y="33" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="19" y="33" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="26" y="33" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="12" y="40" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="19" y="40" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
      {/* Plate cuts into calendar — fill with bg so it visually overlaps */}
      <circle cx="46" cy="44" r="14" fill="rgb(var(--bg))" stroke="currentColor" strokeWidth="2.5" />
      {/* Fork tines */}
      <line x1="39" y1="37" x2="39" y2="42" />
      <line x1="41" y1="37" x2="41" y2="42" />
      <line x1="43" y1="37" x2="43" y2="42" />
      {/* Fork handle */}
      <line x1="41" y1="42" x2="41" y2="51" />
      {/* Spoon bowl */}
      <ellipse cx="51" cy="40" rx="2.5" ry="3.5" />
      {/* Spoon handle */}
      <line x1="51" y1="43.5" x2="51" y2="51" />
    </svg>
  );
}
