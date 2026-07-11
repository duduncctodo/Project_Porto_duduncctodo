const DEG_TO_RAD = Math.PI / 180

// ponytail: hand-authored bounding boxes approximating each continent's
// footprint — not real coastline data (no GIS dataset or texture asset
// exists in this project, and none is fetched over the network). Swap for
// three-globe + real GeoJSON if pixel-accurate coastlines are ever needed.
const LAND_REGIONS = [
  { latMin: 48, latMax: 72, lonMin: -168, lonMax: -95 }, // Alaska / northern Canada
  { latMin: 25, latMax: 49, lonMin: -125, lonMax: -66 }, // contiguous US
  { latMin: 14, latMax: 25, lonMin: -107, lonMax: -86 }, // Mexico
  { latMin: 7, latMax: 14, lonMin: -92, lonMax: -77 }, // Central America
  { latMin: -20, latMax: 7, lonMin: -80, lonMax: -35 }, // northern South America
  { latMin: -56, latMax: -20, lonMin: -75, lonMax: -44 }, // southern South America
  { latMin: 60, latMax: 83, lonMin: -55, lonMax: -20 }, // Greenland
  { latMin: 36, latMax: 71, lonMin: -10, lonMax: 40 }, // Europe
  { latMin: 4, latMax: 37, lonMin: -18, lonMax: 51 }, // northern Africa
  { latMin: -35, latMax: 4, lonMin: 11, lonMax: 41 }, // southern Africa
  { latMin: 5, latMax: 77, lonMin: 40, lonMax: 145 }, // Asia
  { latMin: -10, latMax: 5, lonMin: 95, lonMax: 141 }, // maritime SE Asia
  { latMin: -44, latMax: -10, lonMin: 112, lonMax: 154 }, // Australia
]

export const HUBS = [
  { name: 'San Francisco', lat: 37.77, lon: -122.42 },
  { name: 'New York', lat: 40.71, lon: -74.01 },
  { name: 'London', lat: 51.51, lon: -0.13 },
  { name: 'Dubai', lat: 25.2, lon: 55.27 },
  { name: 'Singapore', lat: 1.35, lon: 103.82 },
  { name: 'Tokyo', lat: 35.68, lon: 139.69 },
  { name: 'Sydney', lat: -33.87, lon: 151.21 },
  { name: 'Sao Paulo', lat: -23.55, lon: -46.63 },
]

export function isLand(lat, lon) {
  return LAND_REGIONS.some((r) => lat >= r.latMin && lat <= r.latMax && lon >= r.lonMin && lon <= r.lonMax)
}

export function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * DEG_TO_RAD
  const theta = (lon + 180) * DEG_TO_RAD
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ]
}

// Rejection-samples points uniformly over the sphere's surface, keeping only
// those that land inside LAND_REGIONS, so point density matches each
// continent's real proportion of the globe instead of a naive lat/lon grid.
export function sampleLandPoints(count, radius) {
  const positions = new Float32Array(count * 3)
  let i = 0
  let guard = 0
  const maxGuard = count * 500
  while (i < count && guard < maxGuard) {
    guard++
    const u = Math.random()
    const v = Math.random()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    const lat = 90 - phi * (180 / Math.PI)
    const lon = theta * (180 / Math.PI) - 180
    if (!isLand(lat, lon)) continue
    const [x, y, z] = latLonToVector3(lat, lon, radius)
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
    i++
  }
  return positions
}
