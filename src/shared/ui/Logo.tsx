// The Workerra mark: the Workstation "W" (same letterform as the sister brand),
// in Workerra's colours: the left stroke pair white, the right pair amber.
// Paths are copied verbatim from workstation-website/shop/public/workstation-icon.svg
// and placed in the 48×48 tile by a nested viewBox. Keep in step with src/app/icon.svg.

const W_VIEWBOX = "0 0 433.19 280.9";
const W_INNER = "182.57,28.05 158.39,101.99 211.57,216.02 235.74,142.09";
const W_STROKE_1 =
  "M127.57,266.59c-2.07,0-4.06-1.18-4.99-3.18L8.1,17.91c-0.79-1.7-0.66-3.69,0.35-5.28s2.76-2.54,4.64-2.54h80.65c2.14,0,4.08,1.24,4.98,3.18L198.8,227.88c0.62,1.32,0.68,2.83,0.18,4.21c-0.5,1.37-1.52,2.49-2.84,3.1l-66.25,30.89C129.14,266.43,128.35,266.59,127.57,266.59z";
const W_STROKE_2 =
  "M282.75,197.38c-0.64,0-1.27-0.11-1.88-0.33c-1.37-0.5-2.49-1.52-3.1-2.84L195.56,17.91c-0.79-1.7-0.66-3.69,0.35-5.28c1.01-1.59,2.76-2.54,4.64-2.54h80.66c2.14,0,4.08,1.24,4.98,3.18l67.8,145.4c1.28,2.75,0.09,6.03-2.66,7.31l-66.25,30.89C284.34,197.2,283.54,197.38,282.75,197.38z";
const W_STROKE_3 =
  "M418.25,12.51c-1.02-1.52-2.73-2.43-4.56-2.43h-78.85c-2.24,0-4.26,1.36-5.1,3.44l-11.75,29.04l48.58,104.17l52.22-129.08C419.47,15.95,419.27,14.03,418.25,12.51z";

export function LogoMark({
  className = "h-8 w-8",
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="48" height="48" rx="12" className="fill-brand-600" />
      <svg x="7" y="12" width="34" height="24" viewBox={W_VIEWBOX}>
        <g fill="#ffffff">
          <polygon points={W_INNER} />
          <path d={W_STROKE_1} />
        </g>
        <g fill="#fcd34d">
          <path d={W_STROKE_2} />
          <path d={W_STROKE_3} />
        </g>
      </svg>
    </svg>
  );
}

export function Logo({
  className = "",
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={markClassName} />
      <span className="font-display text-lg font-bold tracking-tight text-ink">
        Work<span className="text-brand-600 dark:text-accent">erra</span>
      </span>
    </span>
  );
}
