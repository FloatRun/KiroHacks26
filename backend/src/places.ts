import type { Severity, Facility } from './types/api.js'

interface PlacesNearbyResult {
  name: string
  vicinity: string
  geometry: { location: { lat: number; lng: number } }
  place_id: string
  opening_hours?: { open_now?: boolean }
}

/**
 * Compute Haversine distance between two lat/lng points in meters.
 */
function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000 // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Find nearby medical facilities using Google Places Nearby Search.
 *
 * - urgent_care → keyword "urgent care", radius 10 km
 * - emergency   → type "hospital", radius 15 km
 *
 * Returns top 3–5 results sorted by distance ascending.
 * On any failure, returns an empty array (non-fatal).
 */
export async function findNearbyFacilities(
  careTier: Severity,
  location: { lat: number; lng: number },
  apiKey: string,
): Promise<Facility[]> {
  const baseUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json'

  const params = new URLSearchParams({
    location: `${location.lat},${location.lng}`,
    key: apiKey,
  })

  if (careTier === 'urgent_care') {
    params.set('keyword', 'urgent care')
    params.set('radius', '10000')
  } else {
    // emergency
    params.set('type', 'hospital')
    params.set('radius', '15000')
  }

  const url = `${baseUrl}?${params.toString()}`
  const response = await fetch(url)

  if (!response.ok) {
    console.error(`Places API HTTP error: ${response.status}`)
    return []
  }

  const data = (await response.json()) as {
    status: string
    results: PlacesNearbyResult[]
  }

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error(`Places API status: ${data.status}`)
    return []
  }

  const facilities: Facility[] = data.results
    .map((place) => ({
      name: place.name,
      address: place.vicinity ?? '',
      distanceMeters: haversineMeters(
        location.lat, location.lng,
        place.geometry.location.lat, place.geometry.location.lng,
      ),
      openNow: place.opening_hours?.open_now ?? false,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      placeId: place.place_id,
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 5)

  return facilities
}
