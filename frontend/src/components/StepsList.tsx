interface StepsListProps {
  steps: string[]
}

/**
 * Renders first-aid steps as a numbered ordered list.
 * Each step is imperative voice, ≤ 120 characters.
 * Line height is 1.5× minimum per requirements.
 */
export default function StepsList({ steps }: StepsListProps) {
  if (steps.length === 0) return null

  return (
    <section aria-labelledby="steps-heading">
      <h2 id="steps-heading" className="mb-3 text-lg font-semibold text-gray-800">
        First Aid Steps
      </h2>
      <ol className="space-y-3" aria-label="First aid steps">
        {steps.map((step, index) => (
          <li
            key={index}
            className="flex gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100"
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700"
            >
              {index + 1}
            </span>
            {/* leading-relaxed = 1.625 line height, exceeds 1.5× requirement */}
            <p className="leading-relaxed text-gray-800">{step}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
