import { useLanguage } from '../contexts/LanguageContext'

/**
 * Rendered only when severity === "emergency".
 * Touch target is ≥ 44×44px per accessibility requirements.
 */
export default function EmergencyNumberCallout() {
  const { t } = useLanguage()
  
  return (
    <div
      role="alert"
      aria-label={t('emergency.call')}
      className="flex items-center justify-between gap-4 rounded-xl bg-red-600 px-5 py-4 text-white"
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest opacity-80">
          {t('emergency.call_now')}
        </p>
        <p className="text-3xl font-extrabold leading-none">911</p>
      </div>
      <a
        href="tel:911"
        aria-label={t('emergency.tap_to_call')}
        className={[
          'flex min-h-[44px] min-w-[44px] items-center justify-center',
          'rounded-xl bg-white px-5 py-2.5 text-lg font-bold text-red-700',
          'transition-colors hover:bg-red-50 focus:outline-none focus:ring-2',
          'focus:ring-white focus:ring-offset-2 focus:ring-offset-red-600',
        ].join(' ')}
      >
        {t('emergency.call')}
      </a>
    </div>
  )
}
