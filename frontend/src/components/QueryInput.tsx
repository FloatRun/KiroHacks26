import { useEffect, useRef, useState } from 'react'

interface QueryInputProps {
  onSubmit: (query: string) => void
  disabled: boolean
}

const MAX_CHARS = 500
const PLACEHOLDER = "Describe what happened — e.g., 'my son burned his hand on the stove'"

export default function QueryInput({ onSubmit, disabled }: QueryInputProps) {
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
      <label htmlFor="query-input" className="sr-only">
        Describe your emergency
      </label>
      <div className="relative">
        <textarea
          id="query-input"
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={PLACEHOLDER}
          rows={3}
          maxLength={MAX_CHARS + 1} // allow one over so we can show the error
          aria-describedby="char-count"
          aria-label="Describe your emergency"
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
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
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
            ? `${Math.abs(remaining)} characters over limit`
            : `${remaining} characters remaining`}
        </span>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label="Submit your description for triage"
          className={[
            'min-h-[44px] min-w-[44px] rounded-xl px-6 py-2.5 text-base font-semibold',
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
