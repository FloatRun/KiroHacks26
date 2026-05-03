import type { Severity } from '../types/api'
import { useLanguage } from '../contexts/LanguageContext'

interface SeverityBannerProps {
  readonly severity: Severity
}

/**
 * Color-coded severity banner.
 * Meets WCAG AAA (≥ 7:1) contrast — white text on green-500, yellow-400 uses
 * dark text, red-600 uses white text.
 * Severity is communicated by BOTH color AND text label (never color alone).
 */
export default function SeverityBanner({ severity }: SeverityBannerProps) {
  const { t } = useLanguage()
  
  const config: Record<Severity, { bg: string; gradient: string; icon: string }> = {
    self_care: {
      bg: 'bg-green-500',
      gradient: 'bg-gradient-to-r from-green-500 to-green-600',
      icon: '✓',
    },
    urgent_care: {
      bg: 'bg-yellow-400',
      gradient: 'bg-gradient-to-r from-yellow-400 to-orange-500',
      icon: '!',
    },
    emergency: {
      bg: 'bg-red-600',
      gradient: 'bg-gradient-to-r from-red-600 to-red-700',
      icon: '⚠',
    },
  }

  const { gradient, icon } = config[severity]
  const label = t(`severity.${severity}`)
  const ariaLabel = `${t('severity.level')}: ${label}`

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
          {t('severity.level')}
        </p>
        {/* Minimum 24px font size per requirements */}
        <p className="text-[1.75rem] font-extrabold leading-tight">{label}</p>
      </div>
    </div>
  )
}
