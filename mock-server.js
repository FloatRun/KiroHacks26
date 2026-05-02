/**
 * FirstAid AI — Local Mock Server
 *
 * Simulates the Lambda /api/triage endpoint so you can develop and preview
 * the frontend without a real backend.
 *
 * Usage:
 *   node mock-server.js
 *
 * Then run the frontend in another terminal:
 *   cd frontend && npm run dev
 *
 * The Vite dev server proxies /api → localhost:3001 automatically.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Scenario routing (keyword-based, case-insensitive):
 *
 *   "weird"          → clarification
 *   "paper cut"      → self_care triage
 *   "burn"           → urgent_care triage + facilities
 *   "breathing"      → emergency triage + facilities
 *   "restaurant"     → out-of-scope triage (outOfScope: true)
 *   anything else    → self_care triage (default)
 * ─────────────────────────────────────────────────────────────────────────
 */

import http from 'http'

const PORT = 3001

const SCENARIOS = {
  clarification: {
    type: 'clarification',
    question: 'Where do you feel weird — chest, head, stomach, or somewhere else?',
    reason: 'too_vague',
  },

  selfCare: {
    type: 'triage',
    severity: 'self_care',
    steps: [
      'Rinse the cut under clean running water for 1–2 minutes.',
      'Apply gentle pressure with a clean cloth until bleeding stops.',
      'Cover with an adhesive bandage and keep it clean and dry.',
    ],
    careTier: 'self_care',
    outOfScope: false,
    facilities: [],
  },

  urgentCare: {
    type: 'triage',
    severity: 'urgent_care',
    steps: [
      'Cool the burn under cool (not cold) running water for 20 minutes.',
      'Do not apply ice, butter, or any cream to the burn.',
      'Cover loosely with a clean non-fluffy material such as cling film.',
      'Give paracetamol or ibuprofen for pain if appropriate.',
      'Seek urgent medical attention within 1 hour.',
    ],
    careTier: 'urgent_care',
    outOfScope: false,
    facilities: [
      {
        name: 'CityMed Urgent Care',
        address: '142 Main St, Springfield',
        distanceMeters: 1200,
        openNow: true,
        lat: 37.7759,
        lng: -122.4185,
        placeId: 'mock-place-1',
      },
      {
        name: 'QuickCare Clinic',
        address: '88 Oak Ave, Springfield',
        distanceMeters: 2800,
        openNow: true,
        lat: 37.7699,
        lng: -122.4134,
        placeId: 'mock-place-2',
      },
      {
        name: 'Riverside Medical Center',
        address: '500 River Rd, Springfield',
        distanceMeters: 4100,
        openNow: false,
        lat: 37.7820,
        lng: -122.4250,
        placeId: 'mock-place-3',
      },
    ],
  },

  emergency: {
    type: 'triage',
    severity: 'emergency',
    steps: [
      'Call 911 immediately — do not leave the person alone.',
      'Check for breathing. If absent, begin CPR: 30 chest compressions, 2 rescue breaths.',
      'Push hard and fast in the center of the chest at 100–120 compressions per minute.',
      'Use an AED as soon as one is available and follow its voice instructions.',
      'Continue CPR until emergency services arrive and take over.',
    ],
    careTier: 'emergency',
    outOfScope: false,
    facilities: [
      {
        name: 'General Hospital Emergency',
        address: '1 Hospital Drive, Springfield',
        distanceMeters: 900,
        openNow: true,
        lat: 37.7780,
        lng: -122.4160,
        placeId: 'mock-place-4',
      },
      {
        name: 'St. Mary\'s Medical Center',
        address: '300 Church St, Springfield',
        distanceMeters: 3200,
        openNow: true,
        lat: 37.7710,
        lng: -122.4200,
        placeId: 'mock-place-5',
      },
    ],
  },

  outOfScope: {
    type: 'triage',
    severity: 'self_care',
    steps: [],
    careTier: 'self_care',
    outOfScope: true,
    facilities: [],
  },
}

function pickScenario(query) {
  const q = query.toLowerCase()
  if (q.includes('weird') || q.includes('feel strange') || q.includes('it hurts')) {
    return SCENARIOS.clarification
  }
  if (q.includes('restaurant') || q.includes('weather') || q.includes('capital')) {
    return SCENARIOS.outOfScope
  }
  if (q.includes('breathing') || q.includes('unresponsive') || q.includes('unconscious') || q.includes('cpr') || q.includes('chest pain')) {
    return SCENARIOS.emergency
  }
  if (q.includes('burn') || q.includes('scald') || q.includes('stove') || q.includes('hot')) {
    return SCENARIOS.urgentCare
  }
  if (q.includes('cut') || q.includes('scratch') || q.includes('paper') || q.includes('bleed')) {
    return SCENARIOS.selfCare
  }
  // Default: self-care
  return SCENARIOS.selfCare
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== 'POST' || req.url !== '/api/triage') {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'not_found' }))
    return
  }

  let body = ''
  req.on('data', (chunk) => { body += chunk })
  req.on('end', () => {
    let parsed
    try {
      parsed = JSON.parse(body)
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'invalid_request', message: 'Invalid JSON' }))
      return
    }

    const { query } = parsed
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'invalid_request', message: 'query is required' }))
      return
    }

    const scenario = pickScenario(query)
    console.log(`[mock] "${query}" → ${scenario.type}${scenario.type === 'triage' ? ` (${scenario.severity}${scenario.outOfScope ? ', out-of-scope' : ''})` : ''}`)

    // Simulate ~1s latency so loading state is visible
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(scenario))
    }, 1000)
  })
})

server.listen(PORT, () => {
  console.log(`\nFirstAid AI mock server running on http://localhost:${PORT}`)
  console.log('\nScenario triggers (type these into the app):')
  console.log('  "I feel weird"                    → clarification')
  console.log('  "I have a small paper cut"        → self_care')
  console.log('  "my child burned their hand"      → urgent_care + map')
  console.log('  "adult is not breathing"          → emergency + map')
  console.log('  "best restaurant near me"         → out-of-scope')
  console.log('\nStart the frontend: cd frontend && npm run dev\n')
})
