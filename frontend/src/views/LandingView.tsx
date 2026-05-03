import QueryInput from '../components/QueryInput'

interface LandingViewProps {
  onSubmit: (query: string) => void
  disabled: boolean
}

export default function LandingView({ onSubmit, disabled }: LandingViewProps) {
  return (
    <main
      className="flex flex-1 flex-col gap-8 px-4 py-8"
      aria-labelledby="landing-heading"
    >
      {/* Hero */}
      <div className="text-center">
        {/* Large First Aid Kit Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-600 shadow-lg">
          <svg 
            width="44" 
            height="44" 
            viewBox="0 0 24 24" 
            fill="none" 
            className="text-white"
            aria-hidden="true"
          >
            {/* First Aid Kit Body */}
            <rect x="3" y="8" width="18" height="12" rx="2" fill="currentColor"/>
            {/* Handle */}
            <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" fill="none"/>
            {/* Cross on the kit */}
            <path d="M12 11v6M9 14h6" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h1
          id="landing-heading"
          className="text-3xl font-extrabold tracking-tight text-gray-900 mb-3"
        >
          FirstAid AI
        </h1>
        <p className="text-lg leading-relaxed text-gray-600 max-w-md mx-auto">
          Describe your medical situation and get clear, grounded first-aid guidance in
          seconds. <span className="font-semibold text-red-600">Free.</span> No account required.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <QueryInput onSubmit={onSubmit} disabled={disabled} />
      </div>

      {/* Trust signals */}
      <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
        <h2 className="text-sm font-semibold text-blue-900 mb-3 uppercase tracking-wide">
          Trusted Sources
        </h2>
        <ul
          className="flex flex-col gap-2 text-sm text-blue-800"
          aria-label="Key features"
        >
          {[
            '✓ Grounded in NHS, MEDLINE, and Mayo Clinic protocols',
            '✓ No account, no tracking, no data stored',
            '✓ Works on any device, anywhere',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>{item.substring(2)}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
