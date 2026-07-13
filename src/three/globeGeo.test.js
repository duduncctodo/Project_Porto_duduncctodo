import { describe, it, expect } from 'vitest'
import { latLonToVector3, HUBS } from './globeGeo'

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

describe('HUBS', () => {
  it('has 8 hubs with valid coordinates', () => {
    expect(HUBS).toHaveLength(8)
    HUBS.forEach((hub) => {
      expect(hub.lat).toBeGreaterThanOrEqual(-90)
      expect(hub.lat).toBeLessThanOrEqual(90)
      expect(hub.lon).toBeGreaterThanOrEqual(-180)
      expect(hub.lon).toBeLessThanOrEqual(180)
    })
  })
})
