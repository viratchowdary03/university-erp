import { useId } from "react";
import { BRAND } from "../../config/brand";

export default function Logo({ size = 34, light = false, showName = true }) {
  const gid = useId();
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#14b8a6" />
            <stop offset="1" stopColor="#115e59" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill={`url(#${gid})`} />
        <text x="16" y="21.5" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff" fontFamily="Plus Jakarta Sans, system-ui, sans-serif">VC</text>
        <circle cx="26" cy="6.5" r="2.2" fill="#fbbf24" />
      </svg>
      {showName && (
        <div className="leading-tight">
          <p className={`text-base font-bold tracking-tight ${light ? "text-white" : "text-slate-900"}`}>{BRAND.line1}</p>
          <p className={`text-[11px] font-medium uppercase tracking-[0.25em] ${light ? "text-brand-200" : "text-slate-400"}`}>{BRAND.line2}</p>
        </div>
      )}
    </div>
  );
}
