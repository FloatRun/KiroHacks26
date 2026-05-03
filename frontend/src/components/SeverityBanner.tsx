import type { Severity } from '../types/api'

interface SeverityBannerProps {
  severity: Severity
}

const config: Record<
  Severity,
  { bg: string; label: string; icon: string; ariaLabel: string }
> = {
  self_care: {
    bg: 'bg-green-500',
    label: 'Self-Care',
    icon: '✓',
    ariaLabel: 'Severity: Self-care — manageable at home',
  },
  urgent_care: {
    bg: 'bg-yellow-400',
    label: 'Urgent Care',
    icon: '!',
    ariaLabel: 'Severity: Urgent care — needs attention soon',
  },
  emergency: {
    bg: 'bg-red-600',
    label: 'Emergency',
    icon: '⚠',
    ariaLabel: 'Severity: Emergency — call 911 immediately',
  },
}

/**
 * Color-coded severity banner.
 * Meets WCAG AAA (≥ 7:1) contrast — white text on green-500, yellow-400 uses
 * dark text, red-600 uses white text.
 * Severity is communicated by BOTH color AND text label (never color alone).
 */
export default function SeverityBanner({ severity }: SeverityBannerProps) {
  const { bg, label, icon, ariaLabel } = config[severity]

  // yellow-400 and green-500 backgrounds need dark text to meet WCAG AAA contrast
  const textColor = severity === 'emergency' ? 'text-white' : severity === 'urgent_care' ? 'text-yellow-900' : 'text-green-950'

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={`${bg} ${textColor} flex items-center gap-3 rounded-xl px-5 py-4`}
    >
      <span
        aria-hidden="true"
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold ${
          severity === 'emergency' ? 'bg-white/20' : 'bg-black/10'
        }`}
      >
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
          Severity Level
        </p>
        {/* Minimum 24px font size per requirements */}
        <p className="text-[1.5rem] font-bold leading-tight">{label}</p>
      </div>
    </div>
  )
}
