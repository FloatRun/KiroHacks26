import { useRef, useEffect, useState, useCallback } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useVoiceInput } from '../hooks/useVoiceInput'

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z" />
      <path d="M19 10a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V19H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.08A7 7 0 0 0 19 10z" />
    </svg>
  )
}

interface ClarificationViewProps {
  readonly question: string
  readonly originalQuery: string
  readonly onSubmit: (answer: string) => void
  readonly disabled: boolean
}

const MAX_CHARS = 500

export default function ClarificationView({
  question,
  originalQuery,
  onSubmit,
  disabled,
}: ClarificationViewProps) {
  const { t } = useLanguage()
  const [answer, setAnswer] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const answerRef = useRef(answer)
  useEffect(() => { answerRef.current = answer }, [answer])

  const handleAutoSubmit = useCallback(() => {
    const trimmed = answerRef.current.trim()
    if (trimmed.length > 0) onSubmit(trimmed)
  }, [onSubmit])

  const { isSupported, isListening, startListening, stopListening } = useVoiceInput(
    (transcript) => setAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript)),
    handleAutoSubmit,
  )

  useEffect(() => { inputRef.current?.focus() }, [])

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
    <main className="flex flex-col gap-5 px-4 py-6" aria-labelledby="clarification-heading">
      {/* Question */}
      <div className="rounded-xl bg-blue-50 px-5 py-4 ring-1 ring-blue-200">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-600">
          {t('clarification.need_info')}
        </p>
        <h1 id="clarification-heading" className="text-xl font-bold leading-snug text-blue-900">
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

      {/* Answer input */}
      <div>
        <label
          htmlFor="clarification-input"
          className="mb-1.5 block text-sm font-semibold text-gray-700"
        >
          {t('clarification.your_answer')}
        </label>

        {/* Textarea with mic inset bottom-right */}
        <div className="relative">
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
              isSupported ? 'pb-12' : '',
              isOverLimit
                ? 'border-red-500 focus:ring-red-400'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-400',
              disabled ? 'cursor-not-allowed opacity-60' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />

          {isSupported && (
            <div className="absolute bottom-5 right-5">
              <div className="relative">
                {isListening && (
                  <span className="absolute inset-0 rounded-lg animate-ping bg-red-400 opacity-40" />
                )}
                <button
                  type="button"
                  onClick={() => isListening ? stopListening() : startListening()}
                  disabled={disabled}
                  aria-label={isListening ? 'Stop and submit' : 'Speak your answer'}
                  className={[
                    'relative flex items-center justify-center h-9 w-9 rounded-lg',
                    'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1',
                    disabled ? 'cursor-not-allowed opacity-60' : '',
                    isListening
                      ? 'bg-red-500 text-white scale-110 focus:ring-red-400'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus:ring-gray-400',
                  ].join(' ')}
                >
                  <MicIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {isListening && (
          <div aria-live="polite" className="mt-1.5 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span className="text-sm font-medium text-red-700">Listening — tap mic to submit</span>
          </div>
        )}

        <p
          id="clarification-char-count"
          aria-live="polite"
          aria-atomic="true"
          className={['mt-1 text-right text-sm tabular-nums', isOverLimit ? 'font-semibold text-red-600' : 'text-gray-500'].join(' ')}
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
            ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
            : 'cursor-not-allowed bg-gray-200 text-gray-400',
        ].join(' ')}
      >
        {disabled ? t('clarification.analyzing') : t('clarification.submit')}
      </button>
    </main>
  )
}
