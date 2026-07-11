import { describe, it, expect } from 'vitest'
import { isLand, latLonToVector3, sampleLandPoints, HUBS } from './globeGeo'

describe('isLand', () => {
  it('returns true for a point inside a continent', () => {
    expect(isLand(40.71, -74.01)).toBe(true) // New York
  })

  it('returns false for open ocean', () => {
    expect(isLand(0, -160)).toBe(false) // mid-Pacific
  })

  it('agrees with every hub coordinate (hubs must sit on land)', () => {
    HUBS.forEach((hub) => {
      expect(isLand(hub.lat, hub.lon)).toBe(true)
    })
  })
})

describe('latLonToVector3', () => {
  it('places the point at the requested radius', () => {
    const [x, y, z] = latLonToVector3(12, 34, 10)
    const magnitude = Math.sqrt(x * x + y * y + z * z)
    expect(magnitude).toBeCloseTo(10, 5)
  })

  it('maps the north pole to the +Y axis', () => {
    const [x, y, z] = latLonToVector3(90, 0, 5)
    expect(x).toBeCloseTo(0, 5)
    expect(y).toBeCloseTo(5, 5)
    expect(z).toBeCloseTo(0, 5)
  })
})

describe('sampleLandPoints', () => {
  it('returns exactly the requested number of points, all on the sphere', () => {
    const radius = 8
    const count = 200
    const positions = sampleLandPoints(count, radius)
    expect(positions.length).toBe(count * 3)
    for (let i = 0; i < count; i++) {
      const x = positions[i * 3]
      const y = positions[i * 3 + 1]
      const z = positions[i * 3 + 2]
      const magnitude = Math.sqrt(x * x + y * y + z * z)
      expect(magnitude).toBeCloseTo(radius, 5)
    }
  })
})
