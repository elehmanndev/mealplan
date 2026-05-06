interface WordmarkProps {
  className?: string;
}

export function Wordmark({ className }: WordmarkProps) {
  return (
    <svg
      viewBox="0 0 460 110"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      role="img"
      aria-label="MealPlan"
    >
      <defs>
        <linearGradient id="wm-grad" x1="0" y1="0" x2="460" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="0.55" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <text
        x="0"
        y="86"
        fontFamily="Inter, 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="88"
        fontWeight="800"
        letterSpacing="-4"
        fill="url(#wm-grad)"
      >
        mealplan
      </text>
    </svg>
  );
}
