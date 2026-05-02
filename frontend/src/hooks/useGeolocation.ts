import { useEffect, useState } from 'react'

export interface GeolocationState {
  location: { lat: number; lng: number } | null
  /** true while the browser is resolving the position */
  loading: boolean
  /** 'denied' | 'unavailable' | null */
  error: 'denied' | 'unavailable' | null
}

/**
 * Prefetches the user's geolocation on mount.
 * Degrades gracefully — never blocks triage functionality.
 */
export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ location: null, loading: false, error: 'unavailable' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          loading: false,
          error: null,
        })
      },
      (err) => {
        const error =
          err.code === GeolocationPositionError.PERMISSION_DENIED
            ? 'denied'
            : 'unavailable'
        setState({ location: null, loading: false, error })
      },
      { timeout: 10_000, maximumAge: 60_000 },
    )
  }, [])

  return state
}
