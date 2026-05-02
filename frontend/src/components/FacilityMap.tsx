import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Facility } from '../types/api'

// Inline SVG icons — no external URLs, no broken asset paths
const facilityIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
  <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#dc2626"/>
  <circle cx="12" cy="12" r="5" fill="white"/>
</svg>`

const facilityIcon = new L.DivIcon({
  html: facilityIconSvg,
  className: '',
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -36],
})

const userIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
  <circle cx="14" cy="14" r="12" fill="#2563eb" stroke="white" stroke-width="3"/>
  <circle cx="14" cy="14" r="5" fill="white"/>
</svg>`

/** Distinct blue icon for the user's own location */
const userIcon = new L.DivIcon({
  html: userIconSvg,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
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
              icon={facilityIcon}
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
