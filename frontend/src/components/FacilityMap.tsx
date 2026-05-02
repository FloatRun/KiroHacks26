import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Facility } from '../types/api'

// Fix Leaflet's default icon paths broken by Vite's asset handling.
// We delete the internal _getIconUrl method and point to the CDN copies
// so no PNG imports are needed (avoids TS module resolution issues).
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/** Distinct blue icon for the user's own location */
const userIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#2563eb" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>`),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

function formatDistance(meters: number): string {
  const miles = meters / 1609.34
  if (miles < 0.1) return `${Math.round(meters)}m`
  return `${miles.toFixed(1)} mi`
}

/** Recenter the map when coordinates change */
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng])
  }, [lat, lng, map])
  return null
}

interface FacilityMapProps {
  facilities: Facility[]
  userLocation: { lat: number; lng: number }
}

/**
 * Leaflet map with facility pins and a user location marker.
 * Only rendered when facilities is non-empty.
 * Tiles from OpenStreetMap — no API key required.
 */
export default function FacilityMap({ facilities, userLocation }: FacilityMapProps) {
  if (facilities.length === 0) return null

  return (
    <section aria-labelledby="map-heading">
      <h2 id="map-heading" className="mb-3 text-lg font-semibold text-gray-800">
        Nearby Facilities
      </h2>

      {/* Map container — fixed height required by Leaflet */}
      <div
        className="h-72 w-full overflow-hidden rounded-xl shadow-sm ring-1 ring-gray-200"
        aria-label="Map showing nearby medical facilities"
        role="img"
      >
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
          aria-label="Nearby facilities map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapRecenter lat={userLocation.lat} lng={userLocation.lng} />

          {/* User location marker */}
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={userIcon}
            aria-label="Your location"
          >
            <Popup>
              <span className="font-semibold">Your location</span>
            </Popup>
          </Marker>

          {/* Facility markers */}
          {facilities.map((facility) => (
            <Marker
              key={facility.placeId}
              position={[facility.lat, facility.lng]}
              aria-label={`${facility.name}, ${formatDistance(facility.distanceMeters)} away`}
            >
              <Popup minWidth={200}>
                <div className="space-y-1">
                  <p className="font-semibold leading-snug">{facility.name}</p>
                  <p className="text-xs text-gray-600">{facility.address}</p>
                  <p className="text-xs text-gray-500">
                    {formatDistance(facility.distanceMeters)} away
                    {facility.openNow ? (
                      <span className="ml-2 font-semibold text-green-700">Open now</span>
                    ) : (
                      <span className="ml-2 text-gray-400">Hours unknown</span>
                    )}
                  </p>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Get directions to ${facility.name}`}
                    className={[
                      'mt-2 flex min-h-[44px] items-center justify-center rounded-lg',
                      'bg-blue-600 px-3 py-2 text-sm font-semibold text-white',
                      'transition-colors hover:bg-blue-700 focus:outline-none',
                      'focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                    ].join(' ')}
                  >
                    Get Directions
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Accessible list fallback for screen readers */}
      <ul className="sr-only" aria-label="Nearby facilities list">
        {facilities.map((facility) => (
          <li key={facility.placeId}>
            {facility.name} — {formatDistance(facility.distanceMeters)} away
            {facility.openNow ? ', open now' : ''}. Address: {facility.address}.
          </li>
        ))}
      </ul>
    </section>
  )
}
