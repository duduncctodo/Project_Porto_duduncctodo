# R3F Hologram Globe Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `src/components/BackgroundCanvas.jsx`'s hand-rolled Three.js scene with a `@react-three/fiber` + `@react-three/drei` neon-cyan hologram Earth (wireframe shell, continent-silhouette particle cloud, 8 pulsing satellite hubs, bezier data arcs) whose rotation/zoom respond to page scroll and whose camera nudges with the mouse.

**Architecture:** One new pure-logic module (`src/three/globeGeo.js`) holds the land-mask/geo math so it's unit-testable without a WebGL context. One rewritten component file (`src/components/BackgroundCanvas.jsx`) holds the R3F scene (three sub-components + two DOM-input hooks), verified by manual dev-server checks since its output is a rendered 3D canvas, not assertable via unit tests.

**Tech Stack:** React 19, `@react-three/fiber` ^9.6, `@react-three/drei` ^10.7, `three` (already installed, ^0.185), Vitest ^4.1 (new, for the pure geo module only — no jsdom needed, default `node` environment).

## Global Constraints

- No new dependency beyond `@react-three/fiber`, `@react-three/drei`, and `vitest` (dev-only) — spec explicitly ruled out `@react-three/postprocessing` (Bloom) and any GIS/texture asset package.
- Single accent color throughout: `#00d2ff`.
- `BackgroundCanvas`'s external contract is unchanged: default export, single `revealed` boolean prop, fixed full-viewport layer (`position: fixed; inset 0; z-index: -1; pointer-events: none`) — `App.jsx` is not modified.
- Do not use drei's `<ScrollControls>`/`useScroll` — it hijacks page scroll and would conflict with the Lenis smooth-scroll already driving `App.jsx`. Use a plain `window` `scroll` listener instead.
- Respect `prefers-reduced-motion`: render statically, no continuous animation loop.
- Spec: `docs/superpowers/specs/2026-07-11-r3f-hologram-globe-design.md`.

---

## File Structure

- **Create** `src/three/globeGeo.js` — pure functions/data: hand-authored continent bounding boxes, `isLand(lat, lon)`, `latLonToVector3(lat, lon, radius)`, `sampleLandPoints(count, radius)`, `HUBS` (8 cities). No React, no three.js import — plain math, fully unit-testable.
- **Create** `src/three/globeGeo.test.js` — Vitest tests for the above.
- **Modify** `src/components/BackgroundCanvas.jsx` — full rewrite. Keeps the default export contract; internals become `useScrollProgress`, `useNormalizedPointer` (hooks), `HologramGlobe`, `NetworkArcs`, `CameraRig` (R3F components), and the exported `BackgroundCanvas` wrapper assembling them inside `<Canvas>`.
- **Modify** `package.json` — add `@react-three/fiber`, `@react-three/drei` (dependencies), `vitest` (devDependency), and a `test` script.
- **Modify** `vite.config.js` — add Vitest's `test` config block.

---

### Task 1: Install dependencies and wire up Vitest

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` runnable (Vitest); `@react-three/fiber` and `@react-three/drei` importable from any `src/` file for later tasks.

- [ ] **Step 1: Install the runtime dependencies**

Run: `npm install @react-three/fiber@^9.6.1 @react-three/drei@^10.7.7`
Expected: `package.json` `dependencies` gains both packages; install completes with no peer-dependency errors (both support React 19, matching this project's `react@^19.2.7`).

- [ ] **Step 2: Install Vitest as a dev dependency**

Run: `npm install -D vitest@^4.1.10`
Expected: `package.json` `devDependencies` gains `vitest`.

- [ ] **Step 3: Add the `test` script**

Edit `package.json` `scripts`:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview",
    "test": "vitest run"
  },
```

- [ ] **Step 4: Wire Vitest into the existing Vite config**

Replace the full contents of `vite.config.js`:

```js
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    passWithNoTests: true,
  },
})
```

- [ ] **Step 5: Confirm the test runner works with zero tests**

Run: `npm test`
Expected: Vitest starts, reports no test files, exits 0 (thanks to `passWithNoTests: true`) — confirms the runner is wired before any real tests exist.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.js
git commit -m "chore: add react-three/fiber, drei, and vitest"
```

---

### Task 2: Geo/land-mask pure-logic module (TDD)

**Files:**
- Create: `src/three/globeGeo.js`
- Test: `src/three/globeGeo.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces (used by Task 3): `isLand(lat: number, lon: number) => boolean`, `latLonToVector3(lat: number, lon: number, radius: number) => [number, number, number]`, `sampleLandPoints(count: number, radius: number) => Float32Array` (length `count * 3`), `HUBS => Array<{ name: string, lat: number, lon: number }>` (8 entries, all on land).

- [ ] **Step 1: Write the failing tests**

Create `src/three/globeGeo.test.js`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/three/globeGeo.test.js`
Expected: FAIL — `Cannot find module './globeGeo'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/three/globeGeo.js`:

```js
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
  { latMin: -56, latMax: -20, lonMin: -75, lonMax: -53 }, // southern South America
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/three/globeGeo.test.js`
Expected: PASS — 5 tests across 3 describe blocks, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/three/globeGeo.js src/three/globeGeo.test.js
git commit -m "feat: add continent land-mask and geo math for the hologram globe"
```

---

### Task 3: Rewrite BackgroundCanvas.jsx as an R3F/drei scene

**Files:**
- Modify: `src/components/BackgroundCanvas.jsx` (full rewrite)

**Interfaces:**
- Consumes: `isLand` (indirectly via `sampleLandPoints`), `latLonToVector3`, `sampleLandPoints`, `HUBS` from `../three/globeGeo` (Task 2).
- Produces: default export `BackgroundCanvas({ revealed: boolean })` — same external contract `App.jsx` already relies on.

- [ ] **Step 1: Replace the full file contents**

Replace all of `src/components/BackgroundCanvas.jsx`:

```jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, QuadraticBezierLine } from '@react-three/drei'
import { HUBS, latLonToVector3, sampleLandPoints } from '../three/globeGeo'

const CYAN = '#00d2ff'
const RADIUS = 8

// Reads window.scrollY into a ref every scroll event — deliberately not
// drei's <ScrollControls>/useScroll, which hijacks page scroll via its own
// virtual container and would fight the Lenis smooth-scroll already driving
// App.jsx. A plain listener reads the same DOM scroll Lenis produces.
function useScrollProgress() {
  const progress = useRef(0)
  useEffect(() => {
    function handleScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight
      progress.current = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  return progress
}

// Mirrors the mouse-parallax convention already used app-wide (App.jsx):
// skipped entirely on touch devices, normalized to -1..1.
function useNormalizedPointer() {
  const pointer = useRef({ x: 0, y: 0 })
  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return
    function handlePointerMove(event) {
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      }
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [])
  return pointer
}

// Wireframe shell + continent-silhouette particle cloud + 8 pulsing hub
// markers. Self-rotates every frame; scrollProgress speeds up the spin and
// tilts the X axis, so scrolling reads as "the globe reacting."
function HologramGlobe({ scrollProgress }) {
  const groupRef = useRef()
  const hubRefs = useRef([])

  const particleCount = useMemo(() => {
    const width = window.innerWidth
    return width < 640 ? 800 : width < 1200 ? 1400 : 2000
  }, [])
  const particlePositions = useMemo(() => sampleLandPoints(particleCount, RADIUS * 0.99), [particleCount])
  const hubPositions = useMemo(() => HUBS.map((hub) => latLonToVector3(hub.lat, hub.lon, RADIUS * 1.01)), [])

  useFrame((state, delta) => {
    const dt60 = Math.min(3, delta * 60)
    const t = scrollProgress.current
    const spin = 0.0025 + t * 0.006
    groupRef.current.rotation.y += spin * dt60
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, t * 0.4, 0.05)

    const elapsed = state.clock.elapsedTime
    hubRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      const pulse = 1 + Math.sin(elapsed * 2 + i * 1.3) * 0.15
      mesh.scale.setScalar(pulse)
    })
  })

  return (
    <group ref={groupRef}>
      <Sphere args={[RADIUS * 0.98, 24, 16]}>
        <meshBasicMaterial color={CYAN} wireframe transparent opacity={0.25} />
      </Sphere>

      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={CYAN}
          size={0.06}
          transparent
          opacity={0.85}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {hubPositions.map((position, i) => (
        <Sphere
          key={HUBS[i].name}
          ref={(mesh) => (hubRefs.current[i] = mesh)}
          args={[0.28, 12, 12]}
          position={position}
        >
          <meshBasicMaterial color={CYAN} transparent opacity={0.95} />
        </Sphere>
      ))}
    </group>
  )
}

// Bezier arcs ring-connecting each hub to the next, plus small glowing
// packets riding each arc on an endless loop (progress wraps at 1 — no seam).
function NetworkArcs() {
  const hubVectors = useMemo(
    () => HUBS.map((hub) => new THREE.Vector3(...latLonToVector3(hub.lat, hub.lon, RADIUS * 1.01))),
    []
  )

  const arcs = useMemo(
    () =>
      hubVectors.map((start, i) => {
        const end = hubVectors[(i + 1) % hubVectors.length]
        const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(RADIUS * 1.35)
        return { start, mid, end, curve: new THREE.QuadraticBezierCurve3(start, mid, end) }
      }),
    [hubVectors]
  )

  const packetCount = arcs.length * 3
  const packetPositions = useMemo(() => new Float32Array(packetCount * 3), [packetCount])
  const packetState = useMemo(
    () =>
      Array.from({ length: packetCount }, () => ({
        arc: Math.floor(Math.random() * arcs.length),
        progress: Math.random(),
        speed: 0.2 + Math.random() * 0.3,
      })),
    [arcs.length, packetCount]
  )
  const positionAttributeRef = useRef()

  useFrame((_, delta) => {
    const dt60 = Math.min(3, delta * 60)
    packetState.forEach((state, p) => {
      state.progress += state.speed * 0.01 * dt60
      if (state.progress >= 1) {
        state.progress = 0
        state.arc = Math.floor(Math.random() * arcs.length)
        state.speed = 0.2 + Math.random() * 0.3
      }
      const point = arcs[state.arc].curve.getPointAt(state.progress)
      packetPositions[p * 3] = point.x
      packetPositions[p * 3 + 1] = point.y
      packetPositions[p * 3 + 2] = point.z
    })
    if (positionAttributeRef.current) positionAttributeRef.current.needsUpdate = true
  })

  return (
    <group>
      {arcs.map((arc, i) => (
        <QuadraticBezierLine
          key={i}
          start={arc.start.toArray()}
          end={arc.end.toArray()}
          mid={arc.mid.toArray()}
          color={CYAN}
          lineWidth={1}
          transparent
          opacity={0.25}
        />
      ))}

      <points>
        <bufferGeometry>
          <bufferAttribute
            ref={positionAttributeRef}
            attach="attributes-position"
            count={packetCount}
            array={packetPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={CYAN}
          size={0.35}
          transparent
          opacity={0.9}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

// No visible mesh — dollies the camera in as scrollProgress advances and
// applies a subtle mouse-parallax offset, both lerped for smoothness.
function CameraRig({ scrollProgress, pointer }) {
  useFrame(({ camera }) => {
    const t = scrollProgress.current
    const targetZ = 26 - t * 12
    camera.position.z += (targetZ - camera.position.z) * 0.05
    camera.position.x += (pointer.current.x * 1.5 - camera.position.x) * 0.05
    camera.position.y += (-pointer.current.y * 1.5 - camera.position.y) * 0.05
    camera.lookAt(0, 0, 0)
  })
  return null
}

export default function BackgroundCanvas({ revealed }) {
  const scrollProgress = useScrollProgress()
  const pointer = useNormalizedPointer()
  const [reduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        opacity: revealed ? 0.6 : 0,
        transition: 'opacity 1s ease',
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true }}
        camera={{ position: [0, 0, 26], fov: 50 }}
        frameloop={reduceMotion ? 'demand' : 'always'}
      >
        <HologramGlobe scrollProgress={scrollProgress} />
        <NetworkArcs />
        <CameraRig scrollProgress={scrollProgress} pointer={pointer} />
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 2: Manual visual check**

Run: `npm run dev`, open the printed local URL in a browser.
Expected, with dev tools console open:
- A cyan wireframe globe with a particle cloud shaped like continents (not a uniform dust cloud) is visible behind the page content, slowly rotating.
- 8 small brighter cyan dots (hubs) pulse gently; thin cyan arcs connect them in a ring with small bright dots traveling along the arcs continuously (no visible restart/jump).
- No errors in the browser console.

- [ ] **Step 3: Commit**

```bash
git add src/components/BackgroundCanvas.jsx
git commit -m "feat: rewrite background as an r3f/drei neon hologram globe"
```

---

### Task 4: Full manual QA pass

**Files:** none (verification only).

**Interfaces:**
- Consumes: the running dev server from Task 3.
- Produces: nothing — this task is a gate, not a deliverable.

- [ ] **Step 1: Scroll behavior**

With `npm run dev` running, scroll from top to bottom of the page slowly.
Expected: globe rotation visibly speeds up and tilts further as you scroll down; the globe appears to move closer to the camera (dolly zoom) by the bottom of the page; no stutter or sudden jumps.

- [ ] **Step 2: Mouse parallax**

Move the mouse slowly across the viewport without scrolling.
Expected: the view shifts subtly to follow the cursor (small offset, not a large swing). On a touch-only device emulation (Chrome DevTools device toolbar), confirm no pointermove listener errors occur and the view stays static (parallax skipped).

- [ ] **Step 3: Reduced motion**

In Chrome DevTools, open the Rendering tab → "Emulate CSS media feature prefers-reduced-motion" → set to `reduce`, then reload the page.
Expected: the globe renders once (visible, correctly colored/positioned) and does not rotate or animate; no console errors.

- [ ] **Step 4: Resize and full-page integration**

Resize the browser window (or toggle device toolbar between a narrow and wide viewport) and reload at each size.
Expected: canvas fills the viewport at every size with no layout shift of the page content underneath; `Hero`, `WorkExperience`, `UniThings`, `Contact` sections all still render and scroll normally on top of the background layer.

- [ ] **Step 5: Run the full test suite one more time**

Run: `npm test`
Expected: PASS, same 5 geo tests as Task 2, 0 failures.

- [ ] **Step 6: Commit** (only if any fixes were needed in Steps 1-4; otherwise skip — nothing to commit)

```bash
git add -A
git commit -m "fix: address issues found in hologram globe QA pass"
```

---

### Task 5: One-time shrink-and-explode at 50% scroll, with post-explosion depth parallax

Added after manual QA (see design spec's "Amendment (post-QA)" section for the full rationale). Full rewrite of the same file again — this supersedes Task 3's version.

**Files:**
- Modify: `src/components/BackgroundCanvas.jsx` (full rewrite)

**Interfaces:**
- Consumes: same `HUBS`, `latLonToVector3`, `sampleLandPoints` from `../three/globeGeo` (unchanged, no changes to that module).
- Produces: same external contract — default export `BackgroundCanvas({ revealed })`.

**Global constants added:** `EXPLODE_THRESHOLD = 0.5` (scroll fraction where the burst latches), `BURST_DURATION = 1.4` (seconds, time-based once triggered — not scroll-based), `PRE_EXPLODE_SHRINK = 0.85` (shrinks the globe to 15% size by the threshold), `PARALLAX_STRENGTH = 2.5` (post-explosion per-node depth-parallax multiplier). The explosion is a one-way latch (`explosionRef.current.triggered`) shared across `HologramGlobe`, `NetworkArcs`, and `CameraRig` — once true, it never resets from scrolling back up (only a full page reload resets it, since it lives in a `useRef`).

- [ ] **Step 1: Replace the full file contents**

Replace all of `src/components/BackgroundCanvas.jsx`:

```jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, QuadraticBezierLine } from '@react-three/drei'
import { HUBS, latLonToVector3, sampleLandPoints } from '../three/globeGeo'

const CYAN = '#00d2ff'
const RADIUS = 8
const EXPLODE_THRESHOLD = 0.5
const BURST_DURATION = 1.4
const PRE_EXPLODE_SHRINK = 0.85
const PARALLAX_STRENGTH = 2.5

// Reads window.scrollY into a ref every scroll event — deliberately not
// drei's <ScrollControls>/useScroll, which hijacks page scroll via its own
// virtual container and would fight the Lenis smooth-scroll already driving
// App.jsx. A plain listener reads the same DOM scroll Lenis produces.
function useScrollProgress() {
  const progress = useRef(0)
  useEffect(() => {
    function handleScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight
      progress.current = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  return progress
}

// Mirrors the mouse-parallax convention already used app-wide (App.jsx):
// skipped entirely on touch devices, normalized to -1..1.
function useNormalizedPointer() {
  const pointer = useRef({ x: 0, y: 0 })
  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return
    function handlePointerMove(event) {
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      }
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [])
  return pointer
}

// A random point well outside the globe's surface — where a node flies to
// once it bursts free.
function randomBurstTarget() {
  const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
  const dist = RADIUS * (2.5 + Math.random() * 3.5)
  return dir.multiplyScalar(dist)
}

// Nearer burst targets (small |z|) get a small depthFactor, farther ones get
// a bigger one — this is what makes the post-explosion mouse parallax read
// as depth instead of one flat camera-wide offset.
function depthParallaxFactor(z, eased) {
  return THREE.MathUtils.clamp(Math.abs(z) / 40, 0.15, 1) * eased
}

// Wireframe shell + continent-silhouette particle cloud + 8 pulsing hub
// markers. Pre-explosion: self-rotates and shrinks in place as scrollProgress
// approaches EXPLODE_THRESHOLD. The instant it crosses that threshold,
// explosionRef latches permanently and every particle/hub animates (time-based,
// not scroll-based) from its shrunk position to an independent random burst
// target, then holds there with per-node depth parallax added on top.
function HologramGlobe({ scrollProgress, pointer, explosionRef }) {
  const groupRef = useRef()
  const shellRef = useRef()
  const nodeGroupRef = useRef()
  const wireMaterialRef = useRef()
  const positionAttributeRef = useRef()
  const hubRefs = useRef([])

  const particleCount = useMemo(() => {
    const width = window.innerWidth
    return width < 640 ? 800 : width < 1200 ? 1400 : 2000
  }, [])
  const basePositions = useMemo(() => sampleLandPoints(particleCount, RADIUS * 0.99), [particleCount])
  const livePositions = useMemo(() => basePositions.slice(), [basePositions])
  const burstTargets = useMemo(() => {
    const arr = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const target = randomBurstTarget()
      arr[i * 3] = target.x
      arr[i * 3 + 1] = target.y
      arr[i * 3 + 2] = target.z
    }
    return arr
  }, [particleCount])

  const hubBasePositions = useMemo(
    () => HUBS.map((hub) => new THREE.Vector3(...latLonToVector3(hub.lat, hub.lon, RADIUS * 1.01))),
    []
  )
  const hubBurstTargets = useMemo(() => HUBS.map(() => randomBurstTarget()), [])

  useFrame((state, delta) => {
    const dt60 = Math.min(3, delta * 60)
    const t = scrollProgress.current
    const elapsed = state.clock.elapsedTime

    if (!explosionRef.current.triggered && t >= EXPLODE_THRESHOLD) {
      explosionRef.current.triggered = true
      explosionRef.current.startTime = elapsed
    }
    const exploded = explosionRef.current.triggered
    const shrinkAtTrigger = 1 - PRE_EXPLODE_SHRINK

    if (!exploded) {
      const spin = 0.0025 + t * 0.006
      groupRef.current.rotation.y += spin * dt60
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, t * 0.4, 0.05)

      const localT = Math.min(1, t / EXPLODE_THRESHOLD)
      const shrink = 1 - localT * PRE_EXPLODE_SHRINK
      shellRef.current.scale.setScalar(shrink)
      nodeGroupRef.current.scale.setScalar(shrink)

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3
        livePositions[i3] = basePositions[i3]
        livePositions[i3 + 1] = basePositions[i3 + 1]
        livePositions[i3 + 2] = basePositions[i3 + 2]
      }
      hubRefs.current.forEach((mesh, i) => {
        if (mesh) mesh.position.copy(hubBasePositions[i])
      })
    } else {
      // shellRef's scale is deliberately left untouched here — it freezes at
      // whatever it was the instant explosion triggered (fading opacity
      // instead), so the wireframe never visibly snaps back to full size.
      nodeGroupRef.current.scale.setScalar(1)
      const burstProgress = Math.min(1, (elapsed - explosionRef.current.startTime) / BURST_DURATION)
      const eased = burstProgress * burstProgress * (3 - 2 * burstProgress)

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3
        const startX = basePositions[i3] * shrinkAtTrigger
        const startY = basePositions[i3 + 1] * shrinkAtTrigger
        const startZ = basePositions[i3 + 2] * shrinkAtTrigger
        const burstX = startX + (burstTargets[i3] - startX) * eased
        const burstY = startY + (burstTargets[i3 + 1] - startY) * eased
        const burstZ = startZ + (burstTargets[i3 + 2] - startZ) * eased
        const depth = depthParallaxFactor(burstTargets[i3 + 2], eased)
        livePositions[i3] = burstX + pointer.current.x * depth * PARALLAX_STRENGTH
        livePositions[i3 + 1] = burstY - pointer.current.y * depth * PARALLAX_STRENGTH
        livePositions[i3 + 2] = burstZ
      }

      hubRefs.current.forEach((mesh, i) => {
        if (!mesh) return
        const start = hubBasePositions[i].clone().multiplyScalar(shrinkAtTrigger)
        const burstPos = start.lerp(hubBurstTargets[i], eased)
        const depth = depthParallaxFactor(hubBurstTargets[i].z, eased)
        mesh.position.set(
          burstPos.x + pointer.current.x * depth * PARALLAX_STRENGTH,
          burstPos.y - pointer.current.y * depth * PARALLAX_STRENGTH,
          burstPos.z
        )
      })

      if (wireMaterialRef.current) wireMaterialRef.current.opacity = 0.25 * (1 - eased)
    }

    if (positionAttributeRef.current) positionAttributeRef.current.needsUpdate = true

    hubRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      const pulse = 1 + Math.sin(elapsed * 2 + i * 1.3) * 0.15
      mesh.scale.setScalar(pulse)
    })
  })

  return (
    <group ref={groupRef}>
      <group ref={shellRef}>
        <Sphere args={[RADIUS * 0.98, 24, 16]}>
          <meshBasicMaterial ref={wireMaterialRef} color={CYAN} wireframe transparent opacity={0.25} />
        </Sphere>
      </group>

      <group ref={nodeGroupRef}>
        <points>
          <bufferGeometry>
            <bufferAttribute
              ref={positionAttributeRef}
              attach="attributes-position"
              count={particleCount}
              array={livePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            color={CYAN}
            size={0.06}
            transparent
            opacity={0.85}
            sizeAttenuation
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>

        {hubBasePositions.map((position, i) => (
          <Sphere
            key={HUBS[i].name}
            ref={(mesh) => (hubRefs.current[i] = mesh)}
            args={[0.28, 12, 12]}
            position={position}
          >
            <meshBasicMaterial color={CYAN} transparent opacity={0.95} />
          </Sphere>
        ))}
      </group>
    </group>
  )
}

// Bezier arcs ring-connecting each hub to the next, plus small glowing
// packets riding each arc on an endless loop (progress wraps at 1 — no seam)
// while pre-explosion. Once explosionRef latches, arcs and packets fade to
// 0 opacity over the same BURST_DURATION window as the node burst (they are
// the "structured backbone" that dissolves — the nodes persist instead).
function NetworkArcs({ scrollProgress, explosionRef }) {
  const hubVectors = useMemo(
    () => HUBS.map((hub) => new THREE.Vector3(...latLonToVector3(hub.lat, hub.lon, RADIUS * 1.01))),
    []
  )

  const arcs = useMemo(
    () =>
      hubVectors.map((start, i) => {
        const end = hubVectors[(i + 1) % hubVectors.length]
        const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(RADIUS * 1.35)
        return { start, mid, end, curve: new THREE.QuadraticBezierCurve3(start, mid, end) }
      }),
    [hubVectors]
  )

  const packetCount = arcs.length * 3
  const packetPositions = useMemo(() => new Float32Array(packetCount * 3), [packetCount])
  const packetState = useMemo(
    () =>
      Array.from({ length: packetCount }, () => ({
        arc: Math.floor(Math.random() * arcs.length),
        progress: Math.random(),
        speed: 0.2 + Math.random() * 0.3,
      })),
    [arcs.length, packetCount]
  )
  const positionAttributeRef = useRef()
  const arcRefs = useRef([])
  const packetMaterialRef = useRef()

  useFrame((state, delta) => {
    if (!explosionRef.current.triggered) {
      const dt60 = Math.min(3, delta * 60)
      packetState.forEach((state, p) => {
        state.progress += state.speed * 0.01 * dt60
        if (state.progress >= 1) {
          state.progress = 0
          state.arc = Math.floor(Math.random() * arcs.length)
          state.speed = 0.2 + Math.random() * 0.3
        }
        const point = arcs[state.arc].curve.getPointAt(state.progress)
        packetPositions[p * 3] = point.x
        packetPositions[p * 3 + 1] = point.y
        packetPositions[p * 3 + 2] = point.z
      })
      if (positionAttributeRef.current) positionAttributeRef.current.needsUpdate = true
      return
    }

    const elapsed = state.clock.elapsedTime
    const burstProgress = Math.min(1, (elapsed - explosionRef.current.startTime) / BURST_DURATION)
    const eased = burstProgress * burstProgress * (3 - 2 * burstProgress)
    const fadeOpacity = 0.25 * (1 - eased)
    const packetFadeOpacity = 0.9 * (1 - eased)
    arcRefs.current.forEach((line) => {
      if (line?.material) line.material.opacity = fadeOpacity
    })
    if (packetMaterialRef.current) packetMaterialRef.current.opacity = packetFadeOpacity
  })

  return (
    <group>
      {arcs.map((arc, i) => (
        <QuadraticBezierLine
          key={i}
          ref={(line) => (arcRefs.current[i] = line)}
          start={arc.start.toArray()}
          end={arc.end.toArray()}
          mid={arc.mid.toArray()}
          color={CYAN}
          lineWidth={1}
          transparent
          opacity={0.25}
        />
      ))}

      <points>
        <bufferGeometry>
          <bufferAttribute
            ref={positionAttributeRef}
            attach="attributes-position"
            count={packetCount}
            array={packetPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={packetMaterialRef}
          color={CYAN}
          size={0.35}
          transparent
          opacity={0.9}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

// No visible mesh — dollies the camera in as scrollProgress advances
// (unchanged across the whole 0..1 range, including after the explosion, so
// continuing to scroll reads as flying through the exploded node field) and
// applies mouse-parallax to the camera itself ONLY before the explosion;
// afterward the per-node depth parallax in HologramGlobe takes over and this
// tapers its own offset back to center so the two don't double up.
function CameraRig({ scrollProgress, pointer, explosionRef }) {
  useFrame(({ camera }) => {
    const t = scrollProgress.current
    const targetZ = 26 - t * 12
    camera.position.z += (targetZ - camera.position.z) * 0.05

    const exploded = explosionRef.current.triggered
    const targetX = exploded ? 0 : pointer.current.x * 1.5
    const targetY = exploded ? 0 : -pointer.current.y * 1.5
    camera.position.x += (targetX - camera.position.x) * 0.05
    camera.position.y += (targetY - camera.position.y) * 0.05
    camera.lookAt(0, 0, 0)
  })
  return null
}

export default function BackgroundCanvas({ revealed }) {
  const scrollProgress = useScrollProgress()
  const pointer = useNormalizedPointer()
  const explosionRef = useRef({ triggered: false, startTime: 0 })
  const [reduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        opacity: revealed ? 0.6 : 0,
        transition: 'opacity 1s ease',
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true }}
        camera={{ position: [0, 0, 26], fov: 50 }}
        frameloop={reduceMotion ? 'demand' : 'always'}
      >
        <HologramGlobe scrollProgress={scrollProgress} pointer={pointer} explosionRef={explosionRef} />
        <NetworkArcs scrollProgress={scrollProgress} explosionRef={explosionRef} />
        <CameraRig scrollProgress={scrollProgress} pointer={pointer} explosionRef={explosionRef} />
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 2: Verification (build + smoke check; visual confirmation deferred)**

Run: `npm run build` — must succeed with no errors.
Run: `npm test` — must still show the 6 geo tests passing (this task doesn't touch `src/three/globeGeo.js`).
Run `npm run dev` briefly to confirm clean startup (no console/terminal errors), then stop it. Full visual/interactive confirmation of the shrink-explode-parallax behavior happens in Step 3 (manual, in an actual browser).

- [ ] **Step 3: Manual visual check**

With `npm run dev` running, open the local URL in a browser:
- Scroll slowly from the top: the globe should visibly shrink (along with its wireframe and arcs) as you approach the halfway point of the page.
- Right around 50% scrolled, within about 1.5 seconds, the wireframe/arcs/packets should fade out while the particles and 8 hub markers burst outward into a scattered field.
- Continue scrolling past that point: the camera should keep moving closer (dolly), and rotation should no longer visibly spin the scattered field.
- Move the mouse (without scrolling) after the burst: nearer scattered nodes should shift more than farther ones (depth parallax), and the camera itself should no longer visibly follow the mouse (that offset transferred to the nodes).
- Scroll back up above 50%: the exploded field should NOT reassemble into the globe (one-way latch) — confirm this explicitly, since it's the one behavior a screenshot can't show a static state for.
- No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/BackgroundCanvas.jsx docs/superpowers/specs/2026-07-11-r3f-hologram-globe-design.md
git commit -m "feat: add one-time shrink-and-explode at 50% scroll with depth parallax"
```
