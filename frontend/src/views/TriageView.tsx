import SeverityBanner from '../components/SeverityBanner'
import StepsList from '../components/StepsList'
import CareTierAction from '../components/CareTierAction'
import EmergencyNumberCallout from '../components/EmergencyNumberCallout'
import FacilityMap from '../components/FacilityMap'
import OutOfScopeRefusal from '../components/OutOfScopeRefusal'
import type { TriageResponse } from '../types/api'

interface TriageViewProps {
  response: TriageResponse
  userLocation: { lat: number; lng: number } | null
  onReset: () => void
}

export default function TriageView({
  response,
  userLocation,
  onReset,
}: TriageViewProps) {
  const { severity, steps, careTier, outOfScope, facilities } = response

  // Out-of-scope: render distinct refusal UI, not a triage card
  if (outOfScope) {
    return <OutOfScopeRefusal onReset={onReset} />
  }

  const hasFacilities =
    facilities && facilities.length > 0 && userLocation !== null

  return (
    <main
      className="flex flex-col gap-5 px-4 py-6"
      aria-labelledby="triage-heading"
    >
      <h1 id="triage-heading" className="sr-only">
        Triage Result
      </h1>

      {/* 1. Severity banner */}
      <SeverityBanner severity={severity} />

      {/* 2. Emergency callout — only for emergency severity */}
      {severity === 'emergency' && <EmergencyNumberCallout />}

      {/* 3. Care tier action label */}
      <CareTierAction careTier={careTier} />

      {/* 4. First aid steps */}
      <StepsList steps={steps} />

      {/* 5. Facility map — only when facilities present and location available */}
      {hasFacilities && userLocation && (
        <FacilityMap facilities={facilities!} userLocation={userLocation} />
      )}

      {/* 6. Location unavailable notice when care tier warrants a map but no location */}
      {!hasFacilities && careTier !== 'self_care' && !userLocation && (
        <div
          role="note"
          className="rounded-xl bg-gray-50 px-5 py-4 text-sm text-gray-500 ring-1 ring-gray-200"
        >
          Enable location to find nearby care facilities.
        </div>
      )}

      {/* 7. Start over */}
      <button
        type="button"
        onClick={onReset}
        className={[
          'min-h-[44px] w-full rounded-xl border-2 border-gray-300 px-6 py-2.5',
          'text-base font-semibold text-gray-700 transition-colors',
          'hover:border-gray-400 hover:bg-gray-50 focus:outline-none',
          'focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
        ].join(' ')}
      >
        Start over
      </button>
    </main>
  )
}
