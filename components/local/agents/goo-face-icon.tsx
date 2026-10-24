export function GooFaceIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <line
        x1="9.5"
        y1="9.5"
        x2="9.5"
        y2="14.5"
        stroke="var(--sidebar)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="14.5"
        y1="9.5"
        x2="14.5"
        y2="14.5"
        stroke="var(--sidebar)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
