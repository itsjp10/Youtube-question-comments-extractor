interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 18, className = '' }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin text-current ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
