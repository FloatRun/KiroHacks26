import { useCallback, useEffect, useRef, useState } from 'react'
import { useVoiceInput } from '../hooks/useVoiceInput'

interface QueryInputProps {
  onSubmit: (query: string) => void
  disabled: boolean
}

const MAX_CHARS = 500
const PLACEHOLDER = "Describe what happened — e.g., 'my son burned his hand on the stove'"

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z" />
      <path d="M19 10a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V19H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.08A7 7 0 0 0 19 10z" />
    </svg>
  )
}

export default function QueryInput({ onSubmit, disabled }: QueryInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const valueRef = useRef(value)
  useEffect(() => { valueRef.current = value }, [value])

  const handleAutoSubmit = useCallback(() => {
    const trimmed = valueRef.current.trim()
    if (trimmed.length > 0) onSubmit(trimmed)
  }, [onSubmit])

  const { isSupported, isListening, startListening, stopListening } = useVoiceInput(
    (transcript) => setValue((prev) => (prev ? `${prev} ${transcript}` : transcript)),
    handleAutoSubmit,
  )

  useEffect(() => { textareaRef.current?.focus() }, [])

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
      <label htmlFor="query-input" className="sr-only">Describe your emergency</label>

      {/* Textarea with mic button inset bottom-right */}
      <div className="relative">
        <textarea
          id="query-input"
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={PLACEHOLDER}
          rows={4}
          maxLength={MAX_CHARS + 1}
          aria-describedby="char-count"
          aria-label="Describe your emergency"
          className={[
            'w-full resize-none rounded-xl border-2 bg-white px-4 py-3 text-base',
            'leading-relaxed text-gray-900 placeholder-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            // Extra bottom padding so text doesn't overlap the mic button
            isSupported ? 'pb-12' : '',
            isOverLimit
              ? 'border-red-500 focus:ring-red-400'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-400',
            disabled ? 'cursor-not-allowed opacity-60' : '',
          ].filter(Boolean).join(' ')}
        />

        {/* Mic button — inset bottom-right of textarea */}
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
                aria-label={isListening ? 'Stop and submit' : 'Speak your emergency'}
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

      {/* Listening badge — below textarea, full width */}
      {isListening && (
        <div aria-live="polite" className="mt-1.5 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="text-sm font-medium text-red-700">Listening — tap mic to submit</span>
        </div>
      )}

      {/* Char count left, submit button right */}
      <div className="mt-2 flex items-center justify-between gap-3">
        <span
          id="char-count"
          aria-live="polite"
          aria-atomic="true"
          className={['text-sm tabular-nums', isOverLimit ? 'font-semibold text-red-600' : 'text-gray-500'].join(' ')}
        >
          {isOverLimit ? `${Math.abs(remaining)} over limit` : `${remaining} remaining`}
        </span>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label="Submit your description for triage"
          className={[
            'min-h-[44px] rounded-xl px-6 py-2.5 text-base font-semibold',
            'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2',
            canSubmit
              ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              : 'cursor-not-allowed bg-gray-200 text-gray-400',
          ].join(' ')}
        >
          {disabled ? 'Analyzing…' : 'Get Help'}
        </button>
      </div>
    </div>
  )
}
