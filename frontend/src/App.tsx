import { useState } from 'react'
import { postTriage, ApiError } from './api/triage'
import { useGeolocation } from './hooks/useGeolocation'
import LandingView from './views/LandingView'
import TriageView from './views/TriageView'
import ClarificationView from './components/ClarificationView'
import OutOfScopeRefusal from './components/OutOfScopeRefusal'
import LoadingState from './components/LoadingState'
import ErrorState from './components/ErrorState'
import DisclaimerFooter from './components/DisclaimerFooter'
import type { TriageResponse, ClarificationResponse } from './types/api'

/**
 * View state machine:
 *
 *   landing → (submit) → loading → triage
 *                                → clarification → (submit) → loading → triage
 *                                                                      → out-of-scope (if 2nd clarify)
 *                                → error (503/504)
 */
type ViewState =
  | { kind: 'landing' }
  | { kind: 'loading' }
  | { kind: 'triage'; response: TriageResponse }
  | { kind: 'clarification'; response: ClarificationResponse; originalQuery: string }
  | { kind: 'out-of-scope' }
  | { kind: 'error'; onRetry: () => void }

export default function App() {
  const geo = useGeolocation()
  const [view, setView] = useState<ViewState>({ kind: 'landing' })
  // Track how many clarification round-trips have occurred (max 1)
  const [clarificationCount, setClarificationCount] = useState(0)

  const reset = () => {
    setView({ kind: 'landing' })
    setClarificationCount(0)
  }

  /**
   * Core submission handler — used for both initial queries and
   * clarification follow-ups.
   */
  const submit = async (query: string) => {
    setView({ kind: 'loading' })

    const request = {
      query,
      ...(geo.location ? { location: geo.location } : {}),
    }

    try {
      const response = await postTriage(request)

      if (response.type === 'clarification') {
        // Enforce one-clarification-per-session limit
        if (clarificationCount >= 1) {
          setView({ kind: 'out-of-scope' })
          return
        }
        setClarificationCount((c) => c + 1)
        setView({
          kind: 'clarification',
          response,
          originalQuery: query,
        })
        return
      }

      // type === 'triage' (includes outOfScope: true case — TriageView handles it)
      setView({ kind: 'triage', response })
    } catch (err) {
      const isRetryable =
        err instanceof ApiError && (err.status === 503 || err.status === 504 || err.status === 0)

      if (isRetryable) {
        setView({
          kind: 'error',
          onRetry: () => submit(query),
        })
      } else {
        // Non-retryable (400, unexpected) — go back to landing
        setView({ kind: 'landing' })
      }
    }
  }

  /**
   * Called from ClarificationView — concatenates original query + answer
   * per the API contract spec.
   */
  const submitClarification = (originalQuery: string, answer: string) => {
    const combined = `${originalQuery}. ${answer}`
    submit(combined)
  }

  const isLoading = view.kind === 'loading'

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* App header */}
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <span aria-hidden="true" className="text-xl">🩹</span>
          <span className="text-lg font-bold text-gray-900">FirstAid AI</span>
        </div>
      </header>

      {/* Main content — constrained to mobile-first max width */}
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        {view.kind === 'landing' && (
          <LandingView onSubmit={submit} disabled={isLoading} />
        )}

        {view.kind === 'loading' && <LoadingState />}

        {view.kind === 'triage' && (
          <TriageView
            response={view.response}
            userLocation={geo.location}
            onReset={reset}
          />
        )}

        {view.kind === 'clarification' && (
          <ClarificationView
            question={view.response.question}
            originalQuery={view.originalQuery}
            onSubmit={(answer) => submitClarification(view.originalQuery, answer)}
            disabled={isLoading}
          />
        )}

        {view.kind === 'out-of-scope' && (
          <OutOfScopeRefusal onReset={reset} />
        )}

        {view.kind === 'error' && (
          <ErrorState onRetry={view.onRetry} />
        )}
      </div>

      <DisclaimerFooter />
    </div>
  )
}
