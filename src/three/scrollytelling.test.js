import { describe, it, expect } from 'vitest'
import { SCENE_SECTION_IDS, buildBands, sceneStates } from './scrollytelling'

// hero+intro: 0..1400, work: 1500..2700, uni: 2800..3700, contact: 3800..4500
const groups = [
  [{ top: 0, height: 800 }, { top: 800, height: 600 }],
  [{ top: 1500, height: 1200 }],
  [{ top: 2800, height: 900 }],
  [{ top: 3800, height: 700 }],
]
const FADE = 100

describe('SCENE_SECTION_IDS', () => {
  it('lists 4 scenes covering the 5 nav sections in page order', () => {
    expect(SCENE_SECTION_IDS).toEqual([['hero', 'intro'], ['work'], ['uni'], ['contact']])
  })
})

describe('buildBands', () => {
  it('produces contiguous bands with boundaries at gap midpoints', () => {
    const bands = buildBands(groups)
    expect(bands).toEqual([
      { start: 0, end: 1450 },
      { start: 1450, end: 2750 },
      { start: 2750, end: 3750 },
      { start: 3750, end: 4500 },
    ])
  })
})

describe('sceneStates', () => {
  const bands = buildBands(groups)

  it('gives the first scene full weight at the top of the page', () => {
    const states = sceneStates(bands, 400, FADE)
    expect(states[0].weight).toBe(1)
    expect(states[1].weight).toBe(0)
    expect(states[2].weight).toBe(0)
    expect(states[3].weight).toBe(0)
  })

  it('gives the last scene full weight at the bottom of the page', () => {
    const states = sceneStates(bands, 4400, FADE)
    expect(states[3].weight).toBe(1)
    expect(states[2].weight).toBe(0)
  })

  it('crossfades to 0.5/0.5 exactly at a boundary, summing to 1', () => {
    const states = sceneStates(bands, 1450, FADE)
    expect(states[0].weight).toBeCloseTo(0.5, 5)
    expect(states[1].weight).toBeCloseTo(0.5, 5)
    expect(states[0].weight + states[1].weight).toBeCloseTo(1, 5)
  })

  it('never has more than 2 scenes with weight > 0', () => {
    for (let center = 0; center <= 4500; center += 25) {
      const active = sceneStates(bands, center, FADE).filter((s) => s.weight > 0)
      expect(active.length).toBeLessThanOrEqual(2)
    }
  })

  it('reports local progress 0 at band start, 1 at band end, clamped outside', () => {
    const states = sceneStates(bands, 2100, FADE) // work band: 1450..2750
    expect(states[1].progress).toBeCloseTo(0.5, 5)
    expect(sceneStates(bands, 1450, FADE)[1].progress).toBe(0)
    expect(sceneStates(bands, 2750, FADE)[1].progress).toBe(1)
    expect(sceneStates(bands, 100, FADE)[1].progress).toBe(0)
    expect(sceneStates(bands, 4499, FADE)[1].progress).toBe(1)
  })

  it('is a pure function: same input, same output (scroll back = exact reverse)', () => {
    const a = sceneStates(bands, 1990, FADE)
    const b = sceneStates(bands, 1990, FADE)
    expect(a).toEqual(b)
  })
})
