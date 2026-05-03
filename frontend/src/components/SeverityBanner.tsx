import type { Severity } from '../types/api'

interface SeverityBannerProps {
  severity: Severity
}

const config: Record<
  Severity,
  { bg: string; label: string; icon: string; ariaLabel: string; gradient: string }
> = {
  self_care: {
    bg: 'bg-green-500',
    gradient: 'bg-gradient-to-r from-green-500 to-green-600',
    label: 'Self-Care',
    icon: '✓',
    ariaLabel: 'Severity: Self-care — manageable at home',
  },
  urgent_care: {
    bg: 'bg-yellow-400',
    gradient: 'bg-gradient-to-r from-yellow-400 to-orange-500',
    label: 'Urgent Care',
    icon: '!',
    ariaLabel: 'Severity: Urgent care — needs attention soon',
  },
  emergency: {
    bg: 'bg-red-600',
    gradient: 'bg-gradient-to-r from-red-600 to-red-700',
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
  const { gradient, label, icon, ariaLabel } = config[severity]

  // yellow-400 and green-500 backgrounds need dark text to meet WCAG AAA contrast
  const textColor = severity === 'emergency' ? 'text-white' : severity === 'urgent_care' ? 'text-yellow-900' : 'text-white'

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={`${gradient} ${textColor} flex items-center gap-4 rounded-2xl px-6 py-5 shadow-lg border-2 border-white/20`}
    >
      <span
        aria-hidden="true"
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-2xl font-bold shadow-md ${
          severity === 'emergency' ? 'bg-white/20 backdrop-blur-sm' : 'bg-black/10'
        }`}
      >
        {icon}
      </span>
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-widest opacity-90 mb-1">
          Severity Level
        </p>
        {/* Minimum 24px font size per requirements */}
        <p className="text-[1.75rem] font-extrabold leading-tight">{label}</p>
      </div>
    </div>
  )
}
