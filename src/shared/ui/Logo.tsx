// The Workerra mark: a "W" drawn as two check marks that share a middle point —
// one for the candidate, one for the employer, meeting in a match. The second
// tick climbs higher (a step up), and the spark above the meeting point is the
// assistant that brings them together. Keep in step with src/app/icon.svg.

const TICK_CANDIDATE = "M10 22 L17 34 L24 20";
const TICK_EMPLOYER = "M24 20 L31 34 L39 13";

export function LogoMark({ className = "h-8 w-8", title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="48" height="48" rx="12" className="fill-brand-600" />
      <g fill="none" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={TICK_CANDIDATE} stroke="#ffffff" />
        <path d={TICK_EMPLOYER} stroke="#fcd34d" />
      </g>
      <circle cx="24" cy="12" r="3" fill="#fcd34d" />
    </svg>
  );
}

export function Logo({ className = "", markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={markClassName} />
      <span className="text-lg font-semibold tracking-tight text-slate-900">
        Work<span className="text-brand-600">erra</span>
      </span>
    </span>
  );
}
