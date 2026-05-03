import type { Severity } from '../types/api'
import { useLanguage } from '../contexts/LanguageContext'

interface CareTierActionProps {
  readonly careTier: Severity
}

const styles: Record<Severity, string> = {
  self_care: 'bg-green-50 text-green-800 ring-green-200',
  urgent_care: 'bg-yellow-50 text-yellow-900 ring-yellow-200',
  emergency: 'bg-red-50 text-red-800 ring-red-200',
}

export default function CareTierAction({ careTier }: CareTierActionProps) {
  const { t } = useLanguage()
  const label = t(`care.${careTier}`)
  
  return (
    <div
      role="note"
      aria-label={`${t('care.recommended')}: ${label}`}
      className={`rounded-xl px-5 py-4 ring-1 ${styles[careTier]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
        {t('care.recommended')}
      </p>
      <p className="mt-0.5 text-xl font-bold">{label}</p>
    </div>
  )
}
