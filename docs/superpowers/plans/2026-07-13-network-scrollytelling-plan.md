# Network Scrollytelling Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hologram-globe background with a four-scene, computer-network-themed 3D scrollytelling background (photoreal Earth → data center → network topology → converging signal) that crossfades between scenes as the page scrolls.

**Architecture:** `BackgroundCanvas.jsx` becomes a thin scene manager: a pure scroll-math module (`src/three/scrollytelling.js`) maps DOM section positions to per-scene `{ weight, progress }`, a `SceneDriver` recomputes those once per frame into a shared ref, and four self-contained scene components each fade/animate themselves from that ref. Bloom post-processing gives the realistic glow.

**Tech Stack:** React 19, `@react-three/fiber` ^9, `@react-three/drei` ^10, `three` ^0.185 (all installed), **new:** `@react-three/postprocessing`; NASA-derived 2K Earth textures committed to `public/textures/`. Vitest (installed) for the pure math module.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-13-network-scrollytelling-design.md`.
- `BackgroundCanvas` external contract unchanged: default export, single `revealed` boolean prop, `position: fixed; z-index: -1; pointer-events: none` full-viewport layer, wrapper `opacity: revealed ? 0.6 : 0`. `App.jsx` is NOT modified.
- No drei `<ScrollControls>`/`useScroll` (conflicts with Lenis). Scroll is read from `window.scrollY`.
- All scene motion is a **pure function of scroll position** — no latched one-way state; scrolling up reverses everything.
- At most 2 scenes visible at once; invisible scenes have `group.visible = false`.
- Accent color stays `#00d2ff`. Respect `prefers-reduced-motion` via `frameloop="demand"`.
- Texture URLs are fetched ONCE at build/dev time into `public/textures/` — no runtime fetching from external hosts.
- **Spec amendment:** the spec's "subtle Vignette" is deliberately omitted — the canvas is transparent (`alpha: true`) and a vignette would paint dark corners over the light theme. Bloom only.
- Section ids come from `NAV_LINKS` in `src/data.js`: `hero`, `intro`, `work`, `uni`, `contact`.
- The repo working tree has unrelated modified files (`Hero.jsx`, `WorkExperience.jsx`, `index.css`, `.gitignore`, `src/picture/saya_suka_no_.mp4`). **Never `git add -A`** — always add explicit paths listed in each commit step.

---

## File Structure

- **Modify** `package.json` / `package-lock.json` — add `@react-three/postprocessing`.
- **Create** `public/textures/earth_day.jpg`, `earth_night.jpg`, `earth_bump.png`, `earth_clouds.png` — downloaded once, committed.
- **Create** `src/three/scrollytelling.js` — pure scroll math (`SCENE_SECTION_IDS`, `buildBands`, `sceneStates`). No React/three imports.
- **Create** `src/three/scrollytelling.test.js` — Vitest tests for the above.
- **Create** `src/components/scenes/sceneUtils.js` — shared `fadeGroup(group, weight)` helper.
- **Create** `src/components/scenes/EarthScene.jsx`, `DataCenterScene.jsx`, `TopologyScene.jsx`, `SignalScene.jsx` — one scene each, self-fading, props `{ statesRef, index, pointer }`.
- **Modify** `src/components/BackgroundCanvas.jsx` — full rewrite as scene manager.
- **Modify** `src/three/globeGeo.js` + `src/three/globeGeo.test.js` — trim to `HUBS` + `latLonToVector3` (the land-mask sampling was only used by the deleted particle globe).

---

### Task 1: Dependency + texture assets

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `public/textures/earth_day.jpg`, `public/textures/earth_night.jpg`, `public/textures/earth_bump.png`, `public/textures/earth_clouds.png`

**Interfaces:**
- Consumes: nothing.
- Produces: `@react-three/postprocessing` importable; four texture files servable at `/textures/<name>` by Vite (used by Task 4's EarthScene).

- [ ] **Step 1: Install the post-processing package**

Run: `npm install @react-three/postprocessing`
Expected: installs cleanly with no peer-dependency errors (it peers on the installed `@react-three/fiber` v9 / React 19).

- [ ] **Step 2: Download the Earth textures (PowerShell)**

```powershell
New-Item -ItemType Directory -Force public/textures
curl.exe -L -o public/textures/earth_day.jpg   https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg
curl.exe -L -o public/textures/earth_night.jpg https://unpkg.com/three-globe/example/img/earth-night.jpg
curl.exe -L -o public/textures/earth_bump.png  https://unpkg.com/three-globe/example/img/earth-topology.png
curl.exe -L -o public/textures/earth_clouds.png https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/planets/earth_clouds_1024.png
```

(Sources: three-globe example images — NASA Blue Marble / Black Marble derivatives, public domain; clouds from the three.js examples repo, pinned to tag r128.)

- [ ] **Step 3: Verify the downloads are real images, not error pages**

Run: `Get-ChildItem public/textures | Select-Object Name, Length`
Expected: 4 files, each **> 50 KB** (day map ~1 MB). If any file is a few hundred bytes it's an error page — re-download.

- [ ] **Step 4: Confirm git will track them**

Run: `git check-ignore public/textures/earth_day.jpg`
Expected: no output, exit code 1 (NOT ignored). If ignored, fix `.gitignore` before continuing.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json public/textures
git commit -m "chore: add react-three/postprocessing and Earth texture assets"
```

---

### Task 2: Pure scroll math — `scrollytelling.js` (TDD)

**Files:**
- Create: `src/three/scrollytelling.js`
- Test: `src/three/scrollytelling.test.js`

**Interfaces:**
- Consumes: nothing (pure module, no imports).
- Produces (used by Task 3's BackgroundCanvas):
  - `SCENE_SECTION_IDS: string[][]` — `[['hero','intro'],['work'],['uni'],['contact']]`, one entry per scene in page order.
  - `buildBands(groups: Array<Array<{top:number,height:number}>>) => Array<{start:number,end:number}>` — contiguous scroll bands, one per scene.
  - `sceneStates(bands, scrollCenter: number, fade: number) => Array<{weight:number,progress:number}>` — weight 0..1 (trapezoid crossfade), progress 0..1 within band.

- [ ] **Step 1: Write the failing tests**

Create `src/three/scrollytelling.test.js`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/three/scrollytelling.test.js`
Expected: FAIL — `Cannot find module './scrollytelling'`.

- [ ] **Step 3: Write the implementation**

Create `src/three/scrollytelling.js`:

```js
// Pure scroll math for the four-scene scrollytelling background.
// No React or three.js imports — fully unit-testable.

// One entry per scene, in page order. Each scene owns one or more of the
// page's section ids (from NAV_LINKS in src/data.js).
export const SCENE_SECTION_IDS = [['hero', 'intro'], ['work'], ['uni'], ['contact']]

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x))
}

function ramp(x, a, b) {
  return clamp((x - a) / (b - a), 0, 1)
}

// groups: one array of section rects ({ top, height } in document pixels)
// per scene, in page order. Returns contiguous bands — interior boundaries
// sit at the midpoint of the gap between adjacent scenes' sections, the
// first band starts at 0 and the last ends at the bottom of its sections,
// so every scroll position belongs to exactly one band.
export function buildBands(groups) {
  const spans = groups.map((sections) => ({
    top: Math.min(...sections.map((s) => s.top)),
    bottom: Math.max(...sections.map((s) => s.top + s.height)),
  }))
  return spans.map((span, i) => ({
    start: i === 0 ? 0 : (spans[i - 1].bottom + spans[i].top) / 2,
    end: i === spans.length - 1 ? span.bottom : (span.bottom + spans[i + 1].top) / 2,
  }))
}

// scrollCenter: scrollY + viewportHeight/2. fade: half-width of the
// crossfade zone in pixels. Weight is a trapezoid per band — rises over
// [start-fade, start+fade], full inside, falls over [end-fade, end+fade] —
// so two adjacent scenes always sum to 1 through a transition. The first
// band's start edge and last band's end edge are clamped fully on, so the
// page top/bottom never show an un-faded scene.
export function sceneStates(bands, scrollCenter, fade) {
  return bands.map(({ start, end }, i) => {
    const wIn = i === 0 ? 1 : ramp(scrollCenter, start - fade, start + fade)
    const wOut = i === bands.length - 1 ? 1 : 1 - ramp(scrollCenter, end - fade, end + fade)
    return {
      weight: Math.min(wIn, wOut),
      progress: clamp((scrollCenter - start) / (end - start), 0, 1),
    }
  })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/three/scrollytelling.test.js`
Expected: PASS — 7 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/three/scrollytelling.js src/three/scrollytelling.test.js
git commit -m "feat: add pure scroll-band math for scene crossfades"
```

---

### Task 3: EarthScene + BackgroundCanvas scene-manager rewrite

This task replaces the old globe/explode background with the new manager showing scene 1 only. Scenes 2–4 are added in Tasks 4–6.

**Files:**
- Create: `src/components/scenes/sceneUtils.js`
- Create: `src/components/scenes/EarthScene.jsx`
- Modify: `src/components/BackgroundCanvas.jsx` (full rewrite)

**Interfaces:**
- Consumes: `SCENE_SECTION_IDS`, `buildBands`, `sceneStates` from `../three/scrollytelling` (Task 2); `HUBS`, `latLonToVector3` from `../../three/globeGeo`; textures from Task 1.
- Produces:
  - `fadeGroup(group, weight)` from `sceneUtils.js` — used by every scene (Tasks 4–6).
  - Scene component contract used by Tasks 4–6: default export `Scene({ statesRef, index, pointer })`; reads `statesRef.current[index]` each frame; root `<group ref={groupRef} visible={false}>` (Earth alone starts visible); calls `fadeGroup(groupRef.current, weight)` first thing in its `useFrame` and returns early when invisible.
  - `BackgroundCanvas` renders `<SceneDriver>`, the scenes, `<CameraRig>`, and Bloom.

- [ ] **Step 1: Create the shared fade helper**

Create `src/components/scenes/sceneUtils.js`:

```js
// Shared per-frame scene fade. Hides the group entirely near weight 0
// (three.js skips invisible subtrees), otherwise scales every material's
// opacity and every light's intensity by weight. Base values are captured
// from the first call, so JSX opacity/intensity props are the single source
// of truth. Scenes that animate a material's opacity themselves must write
// it AFTER calling fadeGroup and multiply by weight on their own.
export function fadeGroup(group, weight) {
  group.visible = weight > 0.001
  if (!group.visible) return
  group.traverse((obj) => {
    if (obj.isLight) {
      if (obj.userData.baseIntensity === undefined) obj.userData.baseIntensity = obj.intensity
      obj.intensity = obj.userData.baseIntensity * weight
      return
    }
    const mat = obj.material
    if (!mat || typeof mat.opacity !== 'number') return
    if (mat.userData.baseOpacity === undefined) {
      mat.userData.baseOpacity = mat.opacity
      mat.transparent = true
    }
    mat.opacity = mat.userData.baseOpacity * weight
  })
}
```

- [ ] **Step 2: Create EarthScene**

Create `src/components/scenes/EarthScene.jsx`:

```jsx
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useTexture, QuadraticBezierLine } from '@react-three/drei'
import { HUBS, latLonToVector3 } from '../../three/globeGeo'
import { fadeGroup } from './sceneUtils'

const R = 8
const CYAN = '#00d2ff'
const TEX = (name) => `${import.meta.env.BASE_URL}textures/${name}`

// Photoreal night Earth: NASA day/night/cloud textures, fresnel atmosphere
// rim, star shell, and the 8 HUBS cities ring-connected by arcs with
// traveling packets. Arcs/hubs/packets live inside the spinning group, so
// they stay glued to their cities with zero per-frame curve rebuilding.
export default function EarthScene({ statesRef, index, pointer }) {
  const groupRef = useRef()
  const spinRef = useRef()
  const cloudsRef = useRef()
  const packetAttrRef = useRef()

  const [dayMap, nightMap, cloudsMap, bumpMap] = useTexture([
    TEX('earth_day.jpg'),
    TEX('earth_night.jpg'),
    TEX('earth_clouds.png'),
    TEX('earth_bump.png'),
  ])
  dayMap.colorSpace = THREE.SRGBColorSpace
  nightMap.colorSpace = THREE.SRGBColorSpace

  const hubPositions = useMemo(
    () => HUBS.map((h) => new THREE.Vector3(...latLonToVector3(h.lat, h.lon, R * 1.005))),
    []
  )
  const arcs = useMemo(
    () =>
      hubPositions.map((start, i) => {
        const end = hubPositions[(i + 1) % hubPositions.length]
        const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.3)
        return { start, mid, end, curve: new THREE.QuadraticBezierCurve3(start, mid, end) }
      }),
    [hubPositions]
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

  const starPositions = useMemo(() => {
    const count = 900
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
      const dist = 60 + Math.random() * 80
      arr[i * 3] = dir.x * dist
      arr[i * 3 + 1] = dir.y * dist
      arr[i * 3 + 2] = dir.z * dist
    }
    return arr
  }, [])

  // drei <Stars> and a plain fresnel glow both use ShaderMaterials fadeGroup
  // can't fade via .opacity, so the atmosphere exposes its own uniform.
  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 1 } },
        vertexShader: /* glsl */ `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          varying vec3 vNormal;
          uniform float uOpacity;
          void main() {
            float rim = pow(max(0.0, 0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
            gl_FragColor = vec4(0.25, 0.55, 1.0, 1.0) * rim * uOpacity;
          }`,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    []
  )

  useFrame((_, delta) => {
    const { weight, progress } = statesRef.current[index]
    fadeGroup(groupRef.current, weight)
    atmosphereMaterial.uniforms.uOpacity.value = weight
    if (!groupRef.current.visible) return

    const dt60 = Math.min(3, delta * 60)
    spinRef.current.rotation.y += 0.0018 * dt60
    cloudsRef.current.rotation.y += 0.0024 * dt60

    // dolly: the globe drifts toward the camera across its scroll band
    groupRef.current.position.z = -4 + progress * 9
    groupRef.current.position.x += (pointer.current.x * 1.2 - groupRef.current.position.x) * 0.04
    groupRef.current.position.y += (-pointer.current.y * 1.2 - groupRef.current.position.y) * 0.04

    packetState.forEach((s, p) => {
      s.progress += s.speed * 0.01 * dt60
      if (s.progress >= 1) {
        s.progress = 0
        s.arc = Math.floor(Math.random() * arcs.length)
        s.speed = 0.2 + Math.random() * 0.3
      }
      const pt = arcs[s.arc].curve.getPointAt(s.progress)
      packetPositions[p * 3] = pt.x
      packetPositions[p * 3 + 1] = pt.y
      packetPositions[p * 3 + 2] = pt.z
    })
    if (packetAttrRef.current) packetAttrRef.current.needsUpdate = true
  })

  return (
    <group ref={groupRef}>
      <directionalLight position={[20, 6, 12]} intensity={1.7} />
      <ambientLight intensity={0.07} />

      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={900} array={starPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color="#ffffff" size={0.4} transparent opacity={0.8} sizeAttenuation depthWrite={false} />
      </points>

      <group ref={spinRef}>
        <mesh>
          <sphereGeometry args={[R, 64, 64]} />
          <meshStandardMaterial
            map={dayMap}
            emissiveMap={nightMap}
            emissive="#ffd9a0"
            emissiveIntensity={1.15}
            bumpMap={bumpMap}
            bumpScale={0.06}
            roughness={0.95}
            metalness={0}
          />
        </mesh>

        {arcs.map((arc, i) => (
          <QuadraticBezierLine
            key={HUBS[i].name}
            start={arc.start.toArray()}
            end={arc.end.toArray()}
            mid={arc.mid.toArray()}
            color={CYAN}
            lineWidth={1}
            transparent
            opacity={0.35}
          />
        ))}

        {hubPositions.map((p, i) => (
          <mesh key={HUBS[i].name} position={p}>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshBasicMaterial color={CYAN} transparent opacity={0.95} toneMapped={false} />
          </mesh>
        ))}

        <points>
          <bufferGeometry>
            <bufferAttribute
              ref={packetAttrRef}
              attach="attributes-position"
              count={packetCount}
              array={packetPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            color={CYAN}
            size={0.3}
            transparent
            opacity={0.9}
            sizeAttenuation
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </points>
      </group>

      <mesh ref={cloudsRef}>
        <sphereGeometry args={[R * 1.015, 48, 48]} />
        <meshStandardMaterial map={cloudsMap} transparent opacity={0.32} depthWrite={false} />
      </mesh>

      <mesh material={atmosphereMaterial}>
        <sphereGeometry args={[R * 1.22, 48, 48]} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 3: Rewrite BackgroundCanvas as the scene manager**

Replace all of `src/components/BackgroundCanvas.jsx`:

```jsx
import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { SCENE_SECTION_IDS, buildBands, sceneStates } from '../three/scrollytelling'
import EarthScene from './scenes/EarthScene'

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

// Measures each scene's page sections into contiguous scroll bands.
// Re-measured on resize plus once late — images/fonts can shift layout
// after first paint.
function useSectionBands() {
  const bandsRef = useRef(null)
  useEffect(() => {
    function measure() {
      const groups = SCENE_SECTION_IDS.map((ids) =>
        ids
          .map((id) => {
            const el = document.getElementById(id)
            if (!el) return null
            const rect = el.getBoundingClientRect()
            return { top: rect.top + window.scrollY, height: rect.height }
          })
          .filter(Boolean)
      )
      if (groups.every((g) => g.length > 0)) bandsRef.current = buildBands(groups)
    }
    measure()
    const late = setTimeout(measure, 1500)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(late)
      window.removeEventListener('resize', measure)
    }
  }, [])
  return bandsRef
}

// Recomputes every scene's { weight, progress } once per frame from the
// live scroll position. Lenis writes the real window.scrollY, so reading
// it here stays in sync with the smooth scroll without any listener.
function SceneDriver({ bandsRef, statesRef }) {
  useFrame(() => {
    if (!bandsRef.current) return
    const center = window.scrollY + window.innerHeight / 2
    statesRef.current = sceneStates(bandsRef.current, center, window.innerHeight * 0.15)
  })
  return null
}

// Pointer parallax on the camera itself; scenes add their own subtle
// per-scene motion on top.
function CameraRig({ pointer }) {
  useFrame(({ camera }) => {
    camera.position.x += (pointer.current.x * 1.0 - camera.position.x) * 0.05
    camera.position.y += (-pointer.current.y * 1.0 - camera.position.y) * 0.05
    camera.lookAt(0, 0, 0)
  })
  return null
}

export default function BackgroundCanvas({ revealed }) {
  const pointer = useNormalizedPointer()
  const bandsRef = useSectionBands()
  const statesRef = useRef(SCENE_SECTION_IDS.map((_, i) => ({ weight: i === 0 ? 1 : 0, progress: 0 })))
  const [reduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  // ponytail: bloom keyed off initial width only — a resize across 640px
  // needs a reload to toggle it; add a resize listener if that ever matters.
  const [postEnabled] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 640)

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
        <SceneDriver bandsRef={bandsRef} statesRef={statesRef} />
        <Suspense fallback={null}>
          <EarthScene statesRef={statesRef} index={0} pointer={pointer} />
        </Suspense>
        <CameraRig pointer={pointer} />
        {postEnabled && (
          <EffectComposer>
            <Bloom intensity={0.9} luminanceThreshold={0.3} mipmapBlur />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 4: Build + test smoke check**

Run: `npm run build`
Expected: succeeds, no errors (warnings about chunk size are fine — three + postprocessing is big).
Run: `npm test`
Expected: PASS — scrollytelling tests + existing globeGeo tests.

- [ ] **Step 5: Manual visual check**

Run: `npm run dev`, open the local URL:
- A realistic Earth (real continents, blue oceans, drifting cloud layer, blue rim glow, stars behind) renders behind the hero content, rotating slowly.
- Cyan arcs connect 8 city dots and rotate WITH the globe; bright packets travel along the arcs and glow (bloom).
- Page text is still readable over it; moving the mouse shifts the view subtly.
- Scrolling into the Work section fades the Earth out completely (nothing replaces it yet — scenes 2–4 come next).
- No console errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/BackgroundCanvas.jsx src/components/scenes/sceneUtils.js src/components/scenes/EarthScene.jsx
git commit -m "feat: rewrite background as scene-managed scrollytelling with photoreal Earth"
```

---

### Task 4: DataCenterScene

**Files:**
- Create: `src/components/scenes/DataCenterScene.jsx`
- Modify: `src/components/BackgroundCanvas.jsx` (add import + one JSX line)

**Interfaces:**
- Consumes: `fadeGroup` from `./sceneUtils`; scene contract from Task 3 (`{ statesRef, index, pointer }`, index **1**).
- Produces: default export `DataCenterScene` rendered by BackgroundCanvas.

- [ ] **Step 1: Create the scene**

Create `src/components/scenes/DataCenterScene.jsx`:

```jsx
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { fadeGroup } from './sceneUtils'

const RACKS_PER_SIDE = 12
const RACK_GAP = 2.2
const AISLE_HALF = 2.6
const LEDS_PER_RACK = 10
const LED_COLORS = ['#39ff8e', '#00d2ff', '#ffb347']

// Procedural server-rack aisle: two instanced rack rows, instanced blinking
// LEDs on the aisle-facing sides, glossy dark floor, cool point lights.
// localProgress slides the racks past the camera — the "walk down the
// aisle" dolly.
export default function DataCenterScene({ statesRef, index, pointer }) {
  const groupRef = useRef()
  const slideRef = useRef()
  const rackMeshRef = useRef()
  const ledMeshRef = useRef()
  const scratchColor = useMemo(() => new THREE.Color(), [])

  const racks = useMemo(() => {
    const list = []
    for (const side of [-1, 1]) {
      for (let i = 0; i < RACKS_PER_SIDE; i++) {
        list.push({ x: side * AISLE_HALF, z: -i * RACK_GAP, side })
      }
    }
    return list
  }, [])

  const leds = useMemo(
    () =>
      racks.flatMap((rack) =>
        Array.from({ length: LEDS_PER_RACK }, () => ({
          x: rack.x - rack.side * 0.49,
          y: 0.25 + Math.random() * 1.8,
          z: rack.z + (Math.random() - 0.5) * 0.7,
          color: new THREE.Color(LED_COLORS[Math.floor(Math.random() * LED_COLORS.length)]),
          speed: 2 + Math.random() * 6,
          phase: Math.random() * Math.PI * 2,
          duty: Math.random() * 0.6 - 0.1,
        }))
      ),
    [racks]
  )

  useEffect(() => {
    const dummy = new THREE.Object3D()
    racks.forEach((rack, i) => {
      dummy.position.set(rack.x, 1.1, rack.z)
      dummy.updateMatrix()
      rackMeshRef.current.setMatrixAt(i, dummy.matrix)
    })
    rackMeshRef.current.instanceMatrix.needsUpdate = true

    leds.forEach((led, i) => {
      dummy.position.set(led.x, led.y, led.z)
      dummy.updateMatrix()
      ledMeshRef.current.setMatrixAt(i, dummy.matrix)
      ledMeshRef.current.setColorAt(i, led.color)
    })
    ledMeshRef.current.instanceMatrix.needsUpdate = true
    ledMeshRef.current.instanceColor.needsUpdate = true
  }, [racks, leds])

  useFrame((state) => {
    const { weight, progress } = statesRef.current[index]
    fadeGroup(groupRef.current, weight)
    if (!groupRef.current.visible) return

    slideRef.current.position.z = progress * RACKS_PER_SIDE * RACK_GAP * 0.75
    groupRef.current.rotation.y = pointer.current.x * 0.06
    groupRef.current.rotation.x = -pointer.current.y * 0.04

    const now = state.clock.elapsedTime
    leds.forEach((led, i) => {
      // >1 colors push the lit LEDs over the bloom threshold
      const on = Math.sin(now * led.speed + led.phase) > led.duty ? 2.5 : 0.15
      scratchColor.copy(led.color).multiplyScalar(on)
      ledMeshRef.current.setColorAt(i, scratchColor)
    })
    ledMeshRef.current.instanceColor.needsUpdate = true
  })

  return (
    <group ref={groupRef} position={[0, -1.3, 12]} visible={false}>
      <ambientLight intensity={0.12} />
      <pointLight position={[0, 3, 4]} intensity={26} color="#7fd4ff" distance={18} decay={2} />
      <pointLight position={[0, 3, -8]} intensity={26} color="#7fd4ff" distance={18} decay={2} />
      <pointLight position={[0, 3, -20]} intensity={26} color="#4d7dff" distance={18} decay={2} />

      <group ref={slideRef}>
        <instancedMesh ref={rackMeshRef} args={[null, null, racks.length]}>
          <boxGeometry args={[0.95, 2.2, 1.0]} />
          <meshStandardMaterial color="#171a20" metalness={0.85} roughness={0.35} />
        </instancedMesh>

        <instancedMesh ref={ledMeshRef} args={[null, null, leds.length]}>
          <boxGeometry args={[0.02, 0.03, 0.09]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -RACKS_PER_SIDE * RACK_GAP * 0.5]}>
          <planeGeometry args={[9, RACKS_PER_SIDE * RACK_GAP + 30]} />
          <meshStandardMaterial color="#0b0d11" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  )
}
```

- [ ] **Step 2: Mount it in BackgroundCanvas**

In `src/components/BackgroundCanvas.jsx`, add the import:

```jsx
import DataCenterScene from './scenes/DataCenterScene'
```

and directly after the `</Suspense>` closing tag of EarthScene, add:

```jsx
        <DataCenterScene statesRef={statesRef} index={1} pointer={pointer} />
```

- [ ] **Step 3: Manual visual check**

Run: `npm run dev`:
- Scroll into the Work Experience section: the Earth crossfades out while a dark server-rack aisle fades in — two rows of metallic racks under cool blue lights, LEDs blinking green/cyan/amber with a visible glow.
- Keep scrolling within the section: the racks slide toward/past you (aisle fly-through). Scroll back up: everything reverses smoothly into the Earth.
- Mouse movement sways the aisle slightly. No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/scenes/DataCenterScene.jsx src/components/BackgroundCanvas.jsx
git commit -m "feat: add data-center aisle scene for the work section"
```

---

### Task 5: TopologyScene

**Files:**
- Create: `src/components/scenes/TopologyScene.jsx`
- Modify: `src/components/BackgroundCanvas.jsx` (add import + one JSX line)

**Interfaces:**
- Consumes: `fadeGroup` from `./sceneUtils`; scene contract from Task 3, index **2**.
- Produces: default export `TopologyScene` rendered by BackgroundCanvas.

- [ ] **Step 1: Create the scene**

Create `src/components/scenes/TopologyScene.jsx`:

```jsx
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { fadeGroup } from './sceneUtils'

const NODE_COUNT = 26
const PACKET_COUNT = 40
const CYAN = '#00d2ff'

// Seeded PRNG so the node layout (and therefore the edge graph and packet
// routes) is identical every render/reload.
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 3D network graph: glossy PBR sphere nodes each wired to their 2 nearest
// neighbors, an emissive router core, and glowing packets flowing along the
// edges.
export default function TopologyScene({ statesRef, index, pointer }) {
  const groupRef = useRef()
  const spinRef = useRef()
  const nodeMeshRef = useRef()
  const packetAttrRef = useRef()

  const nodes = useMemo(() => {
    const rand = mulberry32(1337)
    return Array.from({ length: NODE_COUNT }, () => {
      const dir = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize()
      return dir.multiplyScalar(3 + rand() * 6)
    })
  }, [])

  const edges = useMemo(() => {
    const pairs = new Set()
    nodes.forEach((node, i) => {
      nodes
        .map((other, j) => ({ j, d: node.distanceToSquared(other) }))
        .filter(({ j }) => j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
        .forEach(({ j }) => pairs.add(i < j ? `${i}-${j}` : `${j}-${i}`))
    })
    return [...pairs].map((key) => key.split('-').map(Number))
  }, [nodes])

  const edgePositions = useMemo(() => {
    const arr = new Float32Array(edges.length * 6)
    edges.forEach(([a, b], i) => {
      arr.set(nodes[a].toArray(), i * 6)
      arr.set(nodes[b].toArray(), i * 6 + 3)
    })
    return arr
  }, [edges, nodes])

  const packetPositions = useMemo(() => new Float32Array(PACKET_COUNT * 3), [])
  const packetState = useMemo(
    () =>
      Array.from({ length: PACKET_COUNT }, () => ({
        edge: Math.floor(Math.random() * edges.length),
        progress: Math.random(),
        speed: 0.3 + Math.random() * 0.5,
      })),
    [edges.length]
  )

  useEffect(() => {
    const dummy = new THREE.Object3D()
    nodes.forEach((p, i) => {
      dummy.position.copy(p)
      dummy.updateMatrix()
      nodeMeshRef.current.setMatrixAt(i, dummy.matrix)
    })
    nodeMeshRef.current.instanceMatrix.needsUpdate = true
  }, [nodes])

  useFrame((_, delta) => {
    const { weight, progress } = statesRef.current[index]
    fadeGroup(groupRef.current, weight)
    if (!groupRef.current.visible) return

    const dt60 = Math.min(3, delta * 60)
    spinRef.current.rotation.y += 0.001 * dt60
    groupRef.current.position.z = -5 + progress * 10
    groupRef.current.rotation.x = -pointer.current.y * 0.05 + progress * 0.15
    groupRef.current.rotation.y = pointer.current.x * 0.05

    packetState.forEach((s, p) => {
      s.progress += s.speed * 0.01 * dt60
      if (s.progress >= 1) {
        s.progress = 0
        s.edge = Math.floor(Math.random() * edges.length)
      }
      const [a, b] = edges[s.edge]
      packetPositions[p * 3] = nodes[a].x + (nodes[b].x - nodes[a].x) * s.progress
      packetPositions[p * 3 + 1] = nodes[a].y + (nodes[b].y - nodes[a].y) * s.progress
      packetPositions[p * 3 + 2] = nodes[a].z + (nodes[b].z - nodes[a].z) * s.progress
    })
    if (packetAttrRef.current) packetAttrRef.current.needsUpdate = true
  })

  return (
    <group ref={groupRef} visible={false}>
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 0]} intensity={40} color={CYAN} distance={30} decay={2} />
      <directionalLight position={[10, 12, 8]} intensity={0.5} />

      <group ref={spinRef}>
        <mesh>
          <sphereGeometry args={[0.7, 24, 24]} />
          <meshBasicMaterial color="#8ff0ff" toneMapped={false} />
        </mesh>

        <instancedMesh ref={nodeMeshRef} args={[null, null, NODE_COUNT]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#c9d4e2" metalness={0.9} roughness={0.25} />
        </instancedMesh>

        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={edges.length * 2}
              array={edgePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={CYAN} transparent opacity={0.3} />
        </lineSegments>

        <points>
          <bufferGeometry>
            <bufferAttribute
              ref={packetAttrRef}
              attach="attributes-position"
              count={PACKET_COUNT}
              array={packetPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            color={CYAN}
            size={0.25}
            transparent
            opacity={0.95}
            sizeAttenuation
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </points>
      </group>
    </group>
  )
}
```

- [ ] **Step 2: Mount it in BackgroundCanvas**

Add the import:

```jsx
import TopologyScene from './scenes/TopologyScene'
```

and after the `<DataCenterScene …/>` line, add:

```jsx
        <TopologyScene statesRef={statesRef} index={2} pointer={pointer} />
```

- [ ] **Step 3: Manual visual check**

Run: `npm run dev`:
- Scroll into Uni Things: the data center fades into a slowly rotating 3D graph — metallic sphere nodes lit cyan from a glowing core, connected by thin cyan lines, with bright packets flowing along the edges.
- Scrolling within the section drifts the graph toward you and tilts it slightly; scrolling back reverses. No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/scenes/TopologyScene.jsx src/components/BackgroundCanvas.jsx
git commit -m "feat: add network topology scene for the uni section"
```

---

### Task 6: SignalScene

**Files:**
- Create: `src/components/scenes/SignalScene.jsx`
- Modify: `src/components/BackgroundCanvas.jsx` (add import + one JSX line)

**Interfaces:**
- Consumes: `fadeGroup` from `./sceneUtils`; scene contract from Task 3, index **3**.
- Produces: default export `SignalScene` rendered by BackgroundCanvas.

- [ ] **Step 1: Create the scene**

Create `src/components/scenes/SignalScene.jsx`:

```jsx
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { fadeGroup } from './sceneUtils'

const CYAN = '#00d2ff'
const CORE_R = 1.1
const RIM = 26

// "All connections meet here": particles spiral inward to a glowing core;
// convergence pull strengthens with localProgress, plus expanding pulse
// rings. Particles that reach the core respawn at the rim (endless flow).
export default function SignalScene({ statesRef, index, pointer }) {
  const groupRef = useRef()
  const attrRef = useRef()
  const coreRef = useRef()
  const ringRefs = useRef([])

  const count = useMemo(() => (window.innerWidth < 640 ? 700 : 1600), [])
  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        radius: CORE_R + Math.random() * (RIM - CORE_R),
        angle: Math.random() * Math.PI * 2,
        tilt: (Math.random() - 0.5) * 0.9,
        angularSpeed: 0.2 + Math.random() * 0.5,
        inSpeed: 0.8 + Math.random() * 1.6,
      })),
    [count]
  )
  const positions = useMemo(() => new Float32Array(count * 3), [count])

  useFrame((state, delta) => {
    const { weight, progress } = statesRef.current[index]
    fadeGroup(groupRef.current, weight)
    if (!groupRef.current.visible) return

    const dt = Math.min(0.05, delta)
    const pull = 0.35 + progress * 1.4

    particles.forEach((s, i) => {
      s.angle += s.angularSpeed * dt * (1 + (RIM - s.radius) / RIM)
      s.radius -= s.inSpeed * pull * dt
      if (s.radius <= CORE_R) s.radius = RIM - Math.random() * 4
      positions[i * 3] = Math.cos(s.angle) * s.radius
      positions[i * 3 + 1] = Math.sin(s.angle * 0.7) * s.tilt * s.radius * 0.5
      positions[i * 3 + 2] = Math.sin(s.angle) * s.radius * 0.8
    })
    if (attrRef.current) attrRef.current.needsUpdate = true

    const now = state.clock.elapsedTime
    coreRef.current.scale.setScalar(1 + Math.sin(now * 2.4) * 0.08)
    // rings animate their own opacity, so they multiply weight themselves
    // (fadeGroup ran first — see sceneUtils contract)
    ringRefs.current.forEach((ring, i) => {
      if (!ring) return
      const k = (now * 0.45 + i / 3) % 1
      ring.scale.setScalar(1 + k * 9)
      ring.material.opacity = (1 - k) * 0.4 * weight
    })

    groupRef.current.rotation.y = pointer.current.x * 0.08
    groupRef.current.rotation.x = -pointer.current.y * 0.05
    groupRef.current.position.z = 2 + progress * 6
  })

  return (
    <group ref={groupRef} position={[0, 0, 2]} visible={false}>
      <mesh ref={coreRef}>
        <sphereGeometry args={[CORE_R, 32, 32]} />
        <meshBasicMaterial color="#9df3ff" toneMapped={false} />
      </mesh>

      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => (ringRefs.current[i] = m)} rotation={[-Math.PI / 2.6, 0, 0]}>
          <ringGeometry args={[CORE_R * 1.15, CORE_R * 1.22, 48]} />
          <meshBasicMaterial
            color={CYAN}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}

      <points>
        <bufferGeometry>
          <bufferAttribute ref={attrRef} attach="attributes-position" count={count} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          color={CYAN}
          size={0.14}
          transparent
          opacity={0.85}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  )
}
```

- [ ] **Step 2: Mount it in BackgroundCanvas**

Add the import:

```jsx
import SignalScene from './scenes/SignalScene'
```

and after the `<TopologyScene …/>` line, add:

```jsx
        <SignalScene statesRef={statesRef} index={3} pointer={pointer} />
```

- [ ] **Step 3: Manual visual check**

Run: `npm run dev`:
- Scroll to Contact: the topology fades into a bright glowing core (blooming) with cyan particles spiraling inward and pulse rings expanding outward.
- Scrolling deeper into the section speeds up the inward pull. Scrolling all the way back to the top walks the whole story backward smoothly. No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/scenes/SignalScene.jsx src/components/BackgroundCanvas.jsx
git commit -m "feat: add converging signal scene for the contact section"
```

---

### Task 7: globeGeo cleanup + full QA pass

**Files:**
- Modify: `src/three/globeGeo.js` (trim), `src/three/globeGeo.test.js` (trim)

**Interfaces:**
- Consumes: nothing new.
- Produces: `globeGeo.js` exporting only `HUBS` and `latLonToVector3` (EarthScene's exact imports).

- [ ] **Step 1: Trim globeGeo to what EarthScene uses**

Replace all of `src/three/globeGeo.js` (deletes `LAND_REGIONS`, `isLand`, `sampleLandPoints` — they only fed the deleted particle-globe):

```js
const DEG_TO_RAD = Math.PI / 180

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

export function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * DEG_TO_RAD
  const theta = (lon + 180) * DEG_TO_RAD
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ]
}
```

Replace all of `src/three/globeGeo.test.js`:

```js
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
```

- [ ] **Step 2: Run the full test suite and build**

Run: `npm test`
Expected: PASS — scrollytelling + trimmed globeGeo tests, 0 failures.
Run: `npm run build`
Expected: success.

- [ ] **Step 3: Full manual QA**

With `npm run dev` running:
1. **Full story:** scroll top → bottom slowly: Earth → data center → topology → signal, each crossfade smooth (~15% viewport overlap), no scene popping or double-brightness flashes. Scroll bottom → top: exact reverse.
2. **Fast scroll:** fling the page with the mouse wheel — no crash, no stuck scene weights (states are recomputed per frame from scroll position, so a missed frame can't latch anything).
3. **Both themes:** toggle dark/light via the navbar. Content must stay readable over the canvas in both; check the light theme especially (transparent canvas + bloom). If bloom makes the light theme unusable, note it — acceptable fallback is enabling the composer only when `document.documentElement.classList.contains('dark')` at mount.
4. **Mouse parallax:** subtle camera + scene sway on mouse move; static on touch emulation (Chrome DevTools device toolbar).
5. **Reduced motion:** DevTools Rendering tab → emulate `prefers-reduced-motion: reduce`, reload: a static frame renders (Earth visible at top), no animation, no errors.
6. **Mobile viewport:** 375px-wide emulation, reload: scenes render, bloom is OFF (initial width < 640), scroll story still works.
7. **Console:** zero errors throughout.

- [ ] **Step 4: Commit**

```bash
git add src/three/globeGeo.js src/three/globeGeo.test.js
git commit -m "refactor: trim globeGeo to the hub data the earth scene uses"
```

(If QA in Step 3 required fixes, commit those separately with explicit paths and a `fix:` message.)
