import { useLanguage } from '../contexts/LanguageContext'

interface OutOfScopeRefusalProps {
  readonly onReset: () => void
}

/**
 * Distinct UI rendered when outOfScope === true or after two consecutive
 * clarification responses. Not a triage card.
 */
export default function OutOfScopeRefusal({ onReset }: OutOfScopeRefusalProps) {
  const { t } = useLanguage()
  
  return (
    <main
      className="flex flex-col items-center gap-6 px-4 py-10 text-center"
      aria-labelledby="oos-heading"
    >
      <div
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl"
      >
        🩺
      </div>

      <div className="max-w-sm space-y-2">
        <h1 id="oos-heading" className="text-xl font-bold text-gray-900">
          {t('out_of_scope.title')}
        </h1>
        <p className="text-base leading-relaxed text-gray-600">
          {t('out_of_scope.message')}
        </p>
      </div>

      <div className="w-full max-w-sm rounded-xl bg-red-50 px-5 py-4 ring-1 ring-red-200">
        <p className="text-sm font-semibold text-red-800">
          {t('out_of_scope.emergency')}
        </p>
        <a
          href="tel:911"
          className={[
            'mt-3 flex min-h-[44px] items-center justify-center rounded-xl',
            'bg-red-600 px-5 py-2.5 text-base font-bold text-white',
            'transition-colors hover:bg-red-700 focus:outline-none',
            'focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
          ].join(' ')}
        >
          {t('emergency.call')}
        </a>
      </div>

      <button
        type="button"
        onClick={onReset}
        className={[
          'min-h-[44px] rounded-xl border-2 border-gray-300 px-6 py-2.5',
          'text-base font-semibold text-gray-700 transition-colors',
          'hover:border-gray-400 hover:bg-gray-50 focus:outline-none',
          'focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
        ].join(' ')}
      >
        {t('action.start_over')}
      </button>
    </main>
  )
}
