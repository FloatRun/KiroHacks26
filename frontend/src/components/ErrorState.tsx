interface ErrorStateProps {
  onRetry: () => void
}

/**
 * Shown on 503/504 responses.
 * aria-live="assertive" announces the error immediately to screen readers.
 * Never shows raw status codes or stack traces.
 */
export default function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <main
      className="flex flex-col items-center gap-6 px-4 py-10 text-center"
      aria-labelledby="error-heading"
    >
      <div
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl"
      >
        ⚠️
      </div>

      <div
        aria-live="assertive"
        aria-atomic="true"
        className="max-w-sm space-y-2"
      >
        <h1 id="error-heading" className="text-xl font-bold text-gray-900">
          Service temporarily unavailable
        </h1>
        <p className="text-base leading-relaxed text-gray-600">
          Please try again or call your local emergency number directly.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <button
          type="button"
          onClick={onRetry}
          className={[
            'min-h-[44px] rounded-xl bg-blue-600 px-6 py-2.5 text-base',
            'font-semibold text-white transition-colors hover:bg-blue-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          ].join(' ')}
        >
          Try again
        </button>

        <a
          href="tel:911"
          className={[
            'flex min-h-[44px] items-center justify-center rounded-xl',
            'border-2 border-red-300 px-6 py-2.5 text-base font-semibold',
            'text-red-700 transition-colors hover:bg-red-50',
            'focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2',
          ].join(' ')}
        >
          Call 911
        </a>
      </div>
    </main>
  )
}
