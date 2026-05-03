import { useLanguage } from '../contexts/LanguageContext'

/**
 * Shown while a triage request is in flight.
 * aria-live="polite" announces loading to screen readers.
 */
export default function LoadingState() {
  const { t } = useLanguage()
  
  return (
    <main
      className="flex flex-col items-center justify-center gap-6 px-4 py-16"
      aria-labelledby="loading-heading"
    >
      {/* Spinner */}
      <div
        aria-hidden="true"
        className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"
      />

      <div
        aria-live="polite"
        aria-atomic="true"
        id="loading-heading"
        className="text-center"
      >
        <p className="text-lg font-semibold text-gray-800">{t('loading.analyzing')}</p>
        <p className="mt-1 text-sm text-gray-500">
          {t('loading.retrieving')}
        </p>
      </div>

      {/* Skeleton cards to reduce perceived wait */}
      <div className="w-full max-w-md space-y-3" aria-hidden="true">
        <div className="h-16 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-24 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-12 animate-pulse rounded-xl bg-gray-200" />
      </div>
    </main>
  )
}
