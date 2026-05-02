/**
 * Persistent disclaimer footer — rendered on all views.
 * Uses semantic <footer> with role="contentinfo".
 */
export default function DisclaimerFooter() {
  return (
    <footer
      role="contentinfo"
      className="mt-auto border-t border-gray-200 bg-white px-4 py-4 text-center"
    >
      <p className="text-sm leading-relaxed text-gray-500">
        Not medical advice. In an emergency, call your local emergency number
        directly.
      </p>
    </footer>
  )
}
