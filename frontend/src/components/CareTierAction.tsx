import type { Severity } from '../types/api'

interface CareTierActionProps {
  careTier: Severity
}

const labels: Record<Severity, string> = {
  self_care: 'Self-care at home',
  urgent_care: 'Seek urgent care within 1 hour',
  emergency: 'Call emergency services now',
}

const styles: Record<Severity, string> = {
  self_care: 'bg-green-50 text-green-800 ring-green-200',
  urgent_care: 'bg-yellow-50 text-yellow-900 ring-yellow-200',
  emergency: 'bg-red-50 text-red-800 ring-red-200',
}

export default function CareTierAction({ careTier }: CareTierActionProps) {
  return (
    <div
      role="note"
      aria-label={`Recommended action: ${labels[careTier]}`}
      className={`rounded-xl px-5 py-4 ring-1 ${styles[careTier]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
        Recommended Action
      </p>
      <p className="mt-0.5 text-xl font-bold">{labels[careTier]}</p>
    </div>
  )
}
