import type { Facility, Severity } from './types/api'

const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json'

interface PlacesResult {
  place_id: string
  name: string
  vicinity: string
  geometry: { location: { lat: number; lng: number } }
  opening_hours?: { open_now: boolean }
}

interface PlacesResponse {
  results: PlacesResult[]
  status: string
}

/** Haversine distance in meters between two lat/lng points */
function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Calls Google Places Nearby Search and returns up to 5 open facilities
 * sorted by distance from the user.
 *
 * - urgent_care → keyword "urgent care", radius 10 km
 * - emergency   → type "hospital", radius 15 km
 */
export async function findNearbyFacilities(
  careTier: Severity,
  location: { lat: number; lng: number },
  apiKey: string
): Promise<Facility[]> {
  if (careTier === 'self_care') return []

  const params = new URLSearchParams({
    location: `${location.lat},${location.lng}`,
    key: apiKey,
    ...(careTier === 'urgent_care'
      ? { keyword: 'urgent care', radius: '10000' }
      : { type: 'hospital', radius: '15000' }),
  })

  const res = await fetch(`${PLACES_API_BASE}?${params}`)
  if (!res.ok) throw new Error(`Places API HTTP ${res.status}`)

  const data = (await res.json()) as PlacesResponse
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API status: ${data.status}`)
  }

  return data.results
    .filter((r) => r.opening_hours?.open_now === true)
    .map((r): Facility => ({
      placeId: r.place_id,
      name: r.name,
      address: r.vicinity,
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
      openNow: true,
      distanceMeters: Math.round(
        haversineMeters(location.lat, location.lng, r.geometry.location.lat, r.geometry.location.lng)
      ),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 5)
}
