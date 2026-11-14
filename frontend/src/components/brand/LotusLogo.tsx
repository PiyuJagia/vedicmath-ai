interface LotusLogoProps {
  size?: number
  className?: string
}

export function LotusLogo({ size = 34, className }: LotusLogoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size * 0.72}
      viewBox="0 0 50 36"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M25 4c-4.6 5-6.6 11.2-6 18.2.4 4.2 2.4 7.6 6 9.8 3.6-2.2 5.6-5.6 6-9.8.6-7-1.4-13.2-6-18.2Z" />
      <path d="M18.6 13.4c-4.8-.4-8.8 1.2-11.4 4.6 1.6 6.8 7.4 11.2 17.8 14" />
      <path d="M31.4 13.4c4.8-.4 8.8 1.2 11.4 4.6-1.6 6.8-7.4 11.2-17.8 14" />
      <path d="M8.4 20.4C5.8 20 3.4 20.6 1.6 22c2.2 5.6 9.6 9.2 23.4 10" />
      <path d="M41.6 20.4c2.6-.4 5 .2 6.8 1.6-2.2 5.6-9.6 9.2-23.4 10" />
    </svg>
  )
}
