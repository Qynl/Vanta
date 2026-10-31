interface LogoProps {
  compact?: boolean;
  className?: string;
}

export function Logo({ compact = false, className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 38 38"
        aria-hidden="true"
        className="h-9 w-9 shrink-0"
      >
        <path
          d="M2 3h9.2L19 25.2 26.8 3H36L22.1 37h-6.2L2 3Z"
          fill="currentColor"
        />
        <path
          d="M19 25.2 26.8 3H36L22.1 37h-6.2l3.1-11.8Z"
          fill="var(--color-signal)"
        />
        <path d="M31.5 3H36v4.5h-4.5V3Z" fill="var(--color-volt)" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[27px] font-semibold tracking-[0.14em] text-bone">
          VANTA
        </span>
        {!compact && (
          <span className="mt-1 font-mono text-[8px] tracking-[0.32em] text-muted">
            ARENA NETWORK
          </span>
        )}
      </span>
    </span>
  );
}
