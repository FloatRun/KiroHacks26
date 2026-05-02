import QueryInput from '../components/QueryInput'

interface LandingViewProps {
  onSubmit: (query: string) => void
  disabled: boolean
}

export default function LandingView({ onSubmit, disabled }: LandingViewProps) {
  return (
    <main
      className="flex flex-1 flex-col gap-6 px-4 py-8"
      aria-labelledby="landing-heading"
    >
      {/* Hero */}
      <div className="text-center">
        <div aria-hidden="true" className="mb-3 text-5xl">🩹</div>
        <h1
          id="landing-heading"
          className="text-2xl font-extrabold tracking-tight text-gray-900"
        >
          FirstAid AI
        </h1>
        <p className="mt-2 text-base leading-relaxed text-gray-600">
          Describe what happened and get clear, grounded first-aid guidance in
          seconds. Free. No account required.
        </p>
      </div>

      {/* Input */}
      <QueryInput onSubmit={onSubmit} disabled={disabled} />

      {/* Trust signals */}
      <ul
        className="flex flex-col gap-2 text-sm text-gray-500"
        aria-label="Key features"
      >
        {[
          '✓ Grounded in NHS, Red Cross, and CDC protocols',
          '✓ No account, no tracking, no data stored',
          '✓ Works on any device',
        ].map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </main>
  )
}
