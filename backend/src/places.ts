import type { Facility, Severity } from './types/api.js'

interface PlacesResult {
  name: string
  vicinity: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  opening_hours?: {
    open_now: boolean
  }
  place_id: string
}

/**
 * Haversine distance in meters between two lat/lng points.
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371e3 // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Calls Google Places Nearby Search API.
 * Maps careTier to search parameters:
 *   - urgent_care → keyword "urgent care", radius 10km
 *   - emergency → type "hospital", radius 15km
 *
 * Returns top 3–5 facilities sorted by distance, filtered to open_now.
 */
export async function findNearbyFacilities(
  careTier: Severity,
  location: { lat: number; lng: number },
  apiKey: string,
): Promise<Facility[]> {
  if (careTier === 'self_care') {
    return []
  }

  const isEmergency = careTier === 'emergency'
  const radius = isEmergency ? 15000 : 10000
  const params = new URLSearchParams({
    location: `${location.lat},${location.lng}`,
    radius: radius.toString(),
    key: apiKey,
  })

  if (isEmergency) {
    params.append('type', 'hospital')
  } else {
    params.append('keyword', 'urgent care')
  }

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Places API error: ${response.status}`)
  }

  const data = await response.json()
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API status: ${data.status}`)
  }

  if (!data.results || data.results.length === 0) {
    return []
  }

  // Filter to open_now, compute distance, sort, take top 5
  const facilities: Facility[] = data.results
    .filter((place: PlacesResult) => place.opening_hours?.open_now !== false)
    .map((place: PlacesResult) => ({
      name: place.name,
      address: place.vicinity,
      distanceMeters: Math.round(
        haversineDistance(
          location.lat,
          location.lng,
          place.geometry.location.lat,
          place.geometry.location.lng,
        ),
      ),
      openNow: place.opening_hours?.open_now ?? true,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      placeId: place.place_id,
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 5)

  return facilities
}
