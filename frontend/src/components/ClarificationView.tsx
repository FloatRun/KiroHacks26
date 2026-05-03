import { useRef, useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

interface ClarificationViewProps {
  readonly question: string
  readonly originalQuery: string
  readonly onSubmit: (answer: string) => void
  readonly disabled: boolean
}

const MAX_CHARS = 500

/**
 * Rendered when the API returns type === "clarification".
 * Shows the parser's question prominently, the original query as an
 * immutable label, and a text field for the clarifying answer.
 *
 * On submit, the parent concatenates `${originalQuery}. ${answer}` and
 * POSTs it as a fresh request.
 */
export default function ClarificationView({
  question,
  originalQuery,
  onSubmit,
  disabled,
}: ClarificationViewProps) {
  const { t } = useLanguage()
  const [answer, setAnswer] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Focus the answer field when the clarification view mounts
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const remaining = MAX_CHARS - answer.length
  const isOverLimit = remaining < 0
  const canSubmit = answer.trim().length > 0 && !isOverLimit && !disabled

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit(answer.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <main
      className="flex flex-col gap-5 px-4 py-6"
      aria-labelledby="clarification-heading"
    >
      {/* Clarification question — displayed prominently */}
      <div className="rounded-xl bg-blue-50 px-5 py-4 ring-1 ring-blue-200">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-600">
          {t('clarification.need_info')}
        </p>
        <h1
          id="clarification-heading"
          className="text-xl font-bold leading-snug text-blue-900"
        >
          {question}
        </h1>
      </div>

      {/* Original query — immutable label */}
      <div aria-label={t('clarification.original_description')}>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
          {t('clarification.original_description')}
        </p>
        <p className="rounded-lg bg-gray-100 px-4 py-3 text-sm leading-relaxed text-gray-600 italic">
          "{originalQuery}"
        </p>
      </div>

      {/* Clarification answer input */}
      <div>
        <label
          htmlFor="clarification-input"
          className="mb-1.5 block text-sm font-semibold text-gray-700"
        >
          {t('clarification.your_answer')}
        </label>
        <textarea
          id="clarification-input"
          ref={inputRef}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={t('clarification.placeholder')}
          rows={3}
          aria-describedby="clarification-char-count"
          className={[
            'w-full resize-none rounded-xl border-2 bg-white px-4 py-3 text-base',
            'leading-relaxed text-gray-900 placeholder-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            isOverLimit
              ? 'border-red-500 focus:ring-red-400'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-400',
            disabled ? 'cursor-not-allowed opacity-60' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
        <p
          id="clarification-char-count"
          aria-live="polite"
          aria-atomic="true"
          className={[
            'mt-1 text-right text-sm tabular-nums',
            isOverLimit ? 'font-semibold text-red-600' : 'text-gray-500',
          ].join(' ')}
        >
          {isOverLimit
            ? t('clarification.over_limit').replace('{count}', Math.abs(remaining).toString())
            : t('clarification.remaining').replace('{count}', remaining.toString())}
        </p>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        aria-label={t('clarification.submit_label')}
        className={[
          'min-h-[44px] w-full rounded-xl px-6 py-3 text-base font-semibold',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
          canSubmit
            ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
            : 'cursor-not-allowed bg-gray-200 text-gray-400',
        ].join(' ')}
      >
        {disabled ? t('clarification.analyzing') : t('clarification.submit')}
      </button>
    </main>
  )
}
