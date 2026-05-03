import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

interface QueryInputProps {
  readonly onSubmit: (query: string) => void
  readonly disabled: boolean
}

const MAX_CHARS = 500

export default function QueryInput({ onSubmit, disabled }: QueryInputProps) {
  const { t } = useLanguage()
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Autofocus on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (trimmed.length === 0 || disabled) return
    onSubmit(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const remaining = MAX_CHARS - value.length
  const isOverLimit = remaining < 0
  const canSubmit = value.trim().length > 0 && !isOverLimit && !disabled

  return (
    <div className="w-full">
      <label htmlFor="query-input" className="block text-sm font-semibold text-gray-700 mb-3">
        {t('landing.input.label')}
      </label>
      <div className="relative">
        <textarea
          id="query-input"
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={t('landing.input.placeholder')}
          rows={4}
          maxLength={MAX_CHARS + 1} // allow one over so we can show the error
          aria-describedby="char-count"
          aria-label={t('landing.input.label')}
          className={[
            'w-full resize-none rounded-xl border-2 bg-white px-4 py-4 text-base',
            'leading-relaxed text-gray-900 placeholder-gray-400 shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-200',
            isOverLimit
              ? 'border-red-500 focus:ring-red-400'
              : 'border-gray-200 focus:border-red-500 focus:ring-red-400',
            disabled ? 'cursor-not-allowed opacity-60' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span
          id="char-count"
          aria-live="polite"
          aria-atomic="true"
          className={[
            'text-sm tabular-nums',
            isOverLimit ? 'font-semibold text-red-600' : 'text-gray-500',
          ].join(' ')}
        >
          {isOverLimit
            ? t('input.chars.over').replace('{count}', Math.abs(remaining).toString())
            : t('input.chars.remaining').replace('{count}', remaining.toString())}
        </span>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label={t('landing.input.label')}
          className={[
            'min-h-[48px] min-w-[120px] rounded-xl px-8 py-3 text-base font-semibold',
            'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-md',
            canSubmit
              ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 hover:shadow-lg transform hover:-translate-y-0.5'
              : 'cursor-not-allowed bg-gray-200 text-gray-400 shadow-sm',
          ].join(' ')}
        >
          {disabled ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              {t('landing.button.analyzing')}
            </span>
          ) : (
            t('landing.button')
          )}
        </button>
      </div>
    </div>
  )
}