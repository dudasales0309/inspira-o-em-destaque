export function BrandMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 32" className={className} fill="currentColor" aria-hidden>
      <path d="M2 30V6l14 16V6h6v24L8 14v16z" />
      <rect x="27" y="12" width="6" height="18" />
      <circle cx="33" cy="6" r="4" />
    </svg>
  );
}

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <BrandMark className="h-8 w-9 text-foreground" />
      <div className="leading-tight">
        <div className="text-lg font-semibold tracking-[0.18em]">MARROCOS</div>
        <div className="text-[0.62rem] tracking-[0.28em] text-muted-foreground">GESTÃO COMERCIAL</div>
      </div>
    </div>
  );
}
