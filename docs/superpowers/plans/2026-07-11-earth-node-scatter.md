# Earth-to-Network Scatter Intro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the Hero landmark in `src/components/BackgroundCanvas.jsx` so a stylized Earth (carrying network nodes) moves to center as Hero scrolls, then the Earth body shrinks away while its nodes widen out into a random scatter — and mouse parallax stays off for that whole sequence, only turning on once the scatter is complete.

**Architecture:** Split `createGlobe()`'s single flat group into two sibling groups — `earthGroup` (planet body: new wireframe + fill sphere, plus the existing hub markers/arcs/packets) and `nodeGroup` (the existing fibonacci point cloud, now with precomputed random scatter targets and an `updateScatter(t)` lerp). `animate()` then drives `earthGroup.scale` down to 0 and calls `updateScatter(heroEase)` independently, instead of scaling the whole globe together. Mouse parallax offsets get multiplied by the same `heroEase` value, reusing the easing already computed for the Hero choreography.

**Tech Stack:** React 19, Three.js 0.185 (`src/components/BackgroundCanvas.jsx`), Vite. No test framework in this project (`package.json` has no test script) — verification is `npm run lint` (oxlint) plus running `npm run dev` and visually driving the Hero scroll/mouse in a browser, per each task's Verify step.

## Global Constraints

- Single file only: `src/components/BackgroundCanvas.jsx`. Do not touch `createNetworkCluster`, `workCluster`/`uniCluster`, the curve, or section-anchor logic (per spec's Out of Scope).
- No new dependencies, no external texture/model assets — Earth is procedural (wireframe + faint fill sphere), matching the existing dot/line/additive-glow aesthetic.
- Reuse `heroEase` (already computed in `animate()`) as the single driver for both the shrink/scatter and the parallax gating — no new state variables.
- Every step that changes code ends with `npm run lint` passing and a manual visual check in the running dev server (`npm run dev`).

---

### Task 1: Split `createGlobe()` into `earthGroup` (wireframe + fill Earth body) and `nodeGroup` (scatterable node cloud)

**Files:**
- Modify: `src/components/BackgroundCanvas.jsx:113-224` (the `createGlobe` function)
- Modify: `src/components/BackgroundCanvas.jsx:270-271` (the `introHub` extraction, which currently removes the marker from `globe.group`)

**Interfaces:**
- Consumes: nothing new — same `createGlobe(pointCount, hubCount, radius)` signature.
- Produces: `createGlobe(...)` now returns `{ group, earthGroup, nodeGroup, hubMarkers, updatePackets, updateScatter, setFade, dispose }` — Task 2 and Task 3 rely on `earthGroup` (for `.scale`) and `updateScatter(t)` (a function taking `t` in `[0,1]`, lerping node positions from sphere → scatter targets).

- [ ] **Step 1: Replace the `createGlobe` function body**

Replace the block currently at `src/components/BackgroundCanvas.jsx:109-224` — starting from the existing comment `// Network globe landmark: Fibonacci-sphere point cloud, a handful of bright` (line 109) through the function's closing `}` (line 224), i.e. the leading comment AND the whole function together — with:

```js
// Network globe landmark: a stylized Earth body (wireframe + faint fill,
// no external texture/model) wearing a shell of network nodes. Split into
// two sibling groups so Task 2 can shrink the Earth body and scatter the
// node cloud independently instead of animating them as one lump:
// - earthGroup: the planet body + hub markers/arcs/packets (the
//   "structured backbone" that dissolves with the planet).
// - nodeGroup: the fibonacci point cloud, reinterpreted as atmosphere
//   nodes, with precomputed random scatter targets for updateScatter().
// hubMarkers[] is exposed so one marker can be pulled out and reused as
// the standalone "Intro" landmark.
function createGlobe(pointCount, hubCount, radius) {
  const group = new THREE.Group()
  const earthGroup = new THREE.Group()
  const nodeGroup = new THREE.Group()
  group.add(earthGroup, nodeGroup)
  const disposables = []

  // Earth body: faint solid fill for a sense of mass + a lat/long
  // wireframe shell on top, both procedural.
  const earthFillGeometry = new THREE.SphereGeometry(radius * 0.92, 24, 16)
  const earthFillMaterial = new THREE.MeshBasicMaterial({ color: 0x0a0d16, transparent: true, opacity: 0.55 })
  earthGroup.add(new THREE.Mesh(earthFillGeometry, earthFillMaterial))
  disposables.push(earthFillGeometry, earthFillMaterial)

  const earthWireGeometry = new THREE.SphereGeometry(radius * 0.94, 24, 16)
  const earthWireMaterial = new THREE.MeshBasicMaterial({ color: 0x44464f, wireframe: true, transparent: true, opacity: 0.35 })
  earthGroup.add(new THREE.Mesh(earthWireGeometry, earthWireMaterial))
  disposables.push(earthWireGeometry, earthWireMaterial)

  const positions = new Float32Array(pointCount * 3)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < pointCount; i++) {
    const y = 1 - (i / (pointCount - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i
    positions[i * 3] = Math.cos(theta) * r * radius
    positions[i * 3 + 1] = y * radius
    positions[i * 3 + 2] = Math.sin(theta) * r * radius
  }

  // One random scatter target per node, well outside the sphere, so
  // updateScatter() can lerp each node from its sphere position out to a
  // random position as the Earth shrinks away beside it.
  const scatterTargets = new Float32Array(pointCount * 3)
  for (let i = 0; i < pointCount; i++) {
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
    const dist = radius * (2 + Math.random() * 2.5)
    scatterTargets[i * 3] = dir.x * dist
    scatterTargets[i * 3 + 1] = dir.y * dist
    scatterTargets[i * 3 + 2] = dir.z * dist
  }
  // Live buffer bound to the Points attribute; `positions` stays the
  // untouched sphere layout so updateScatter can always lerp from a clean
  // base (needed since scroll can move t forwards or backwards).
  const nodePositions = positions.slice()

  const pointGeometry = new THREE.BufferGeometry()
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3))
  const pointMaterial = new THREE.PointsMaterial({
    size: 0.22,
    color: 0xb0c6ff,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
  })
  nodeGroup.add(new THREE.Points(pointGeometry, pointMaterial))
  disposables.push(pointGeometry, pointMaterial)

  function updateScatter(t) {
    for (let i = 0; i < pointCount; i++) {
      const i3 = i * 3
      nodePositions[i3] = positions[i3] + (scatterTargets[i3] - positions[i3]) * t
      nodePositions[i3 + 1] = positions[i3 + 1] + (scatterTargets[i3 + 1] - positions[i3 + 1]) * t
      nodePositions[i3 + 2] = positions[i3 + 2] + (scatterTargets[i3 + 2] - positions[i3 + 2]) * t
    }
    pointGeometry.attributes.position.needsUpdate = true
  }

  const hubGeometry = new THREE.SphereGeometry(0.35, 12, 12)
  disposables.push(hubGeometry)
  const hubMarkers = []
  for (let h = 0; h < hubCount; h++) {
    const i = Math.floor((h / hubCount) * pointCount)
    const hubMaterial = new THREE.MeshBasicMaterial({ color: 0xeaf0ff, transparent: true, opacity: 1 })
    const marker = new THREE.Mesh(hubGeometry, hubMaterial)
    marker.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
    disposables.push(hubMaterial)
    hubMarkers.push(marker)
    earthGroup.add(marker)
  }

  const arcMaterial = new THREE.LineBasicMaterial({ color: 0x44464f, transparent: true, opacity: 0.2 })
  disposables.push(arcMaterial)
  const arcCurves = []
  for (let h = 0; h < hubCount; h++) {
    const a = hubMarkers[h].position
    const b = hubMarkers[(h + 1) % hubCount].position
    const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(radius * 1.35)
    const arcCurve = new THREE.QuadraticBezierCurve3(a, mid, b)
    arcCurves.push(arcCurve)
    const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcCurve.getPoints(16))
    earthGroup.add(new THREE.Line(arcGeometry, arcMaterial))
    disposables.push(arcGeometry)
  }

  // Packets of light traveling the arcs — same "data moving" idea as the
  // cluster packets, so the globe reads as live before the camera ever
  // reaches a cluster.
  const packetCount = hubCount * 3
  const packetPositions = new Float32Array(packetCount * 3)
  const packetState = Array.from({ length: packetCount }, () => ({
    arc: Math.floor(Math.random() * arcCurves.length),
    progress: Math.random(),
    speed: 0.2 + Math.random() * 0.3,
  }))
  const packetGeometry = new THREE.BufferGeometry()
  packetGeometry.setAttribute('position', new THREE.BufferAttribute(packetPositions, 3))
  const packetMaterial = new THREE.PointsMaterial({
    size: 0.5,
    color: 0xeaf0ff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  })
  earthGroup.add(new THREE.Points(packetGeometry, packetMaterial))
  disposables.push(packetGeometry, packetMaterial)

  const fadeMaterials = [earthFillMaterial, earthWireMaterial, pointMaterial, arcMaterial, packetMaterial, ...hubMarkers.map((m) => m.material)]
  const baseOpacities = fadeMaterials.map((m) => m.opacity)

  let elapsed = 0
  function updatePackets(dt60 = 1) {
    elapsed += dt60 / 60
    for (let p = 0; p < packetCount; p++) {
      const state = packetState[p]
      state.progress += state.speed * 0.01 * dt60
      if (state.progress >= 1) {
        state.progress = 0
        state.arc = Math.floor(Math.random() * arcCurves.length)
        state.speed = 0.2 + Math.random() * 0.3
      }
      const pos = arcCurves[state.arc].getPointAt(state.progress)
      packetPositions[p * 3] = pos.x
      packetPositions[p * 3 + 1] = pos.y
      packetPositions[p * 3 + 2] = pos.z
    }
    packetGeometry.attributes.position.needsUpdate = true

    // Hub markers breathe like a status light — a subtle "alive" pulse.
    hubMarkers.forEach((marker, h) => {
      const pulse = 1 + Math.sin(elapsed * 2 + h * 1.3) * 0.15
      marker.scale.setScalar(pulse)
    })
  }

  // Fades every part of the globe together (0 = invisible, 1 = full), used
  // to dissolve it once the camera passes it and the network cluster ahead
  // takes over — the globe "breaking apart" into the wider network.
  function setFade(amount) {
    fadeMaterials.forEach((m, i) => { m.opacity = baseOpacities[i] * amount })
  }

  return { group, earthGroup, nodeGroup, hubMarkers, updatePackets, updateScatter, setFade, dispose: () => disposables.forEach((d) => d.dispose()) }
}
```

- [ ] **Step 2: Fix the `introHub` extraction to remove from `earthGroup`, not `group`**

Hub markers are now children of `earthGroup`, not the outer `group`, so the existing removal call is now wrong. Find (around line 270):

```js
    const globe = createGlobe(globePointCount, hubCount, 8)
    // Pull one hub marker out of the self-rotating globe group so it can sit
    // still at its own point on the curve — the "entry point" for Intro.
    const introHub = globe.hubMarkers[0]
    globe.group.remove(introHub)
```

Replace the last line with:

```js
    const globe = createGlobe(globePointCount, hubCount, 8)
    // Pull one hub marker out of the self-rotating globe group so it can sit
    // still at its own point on the curve — the "entry point" for Intro.
    const introHub = globe.hubMarkers[0]
    globe.earthGroup.remove(introHub)
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Visual check**

Run: `npm run dev`, open the printed local URL in a browser.
Expected: Hero section shows a globe made of a faint dark filled sphere with a wireframe grid on top, dotted nodes around it, a few bright pulsing hub markers connected by curved arcs with traveling light packets — visually equivalent to before (still a landmark that moves/shrinks/fades together as you scroll Hero), just now reading as a stylized planet instead of a bare dot sphere. No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/BackgroundCanvas.jsx
git commit -m "$(cat <<'EOF'
feat: give globe landmark a wireframe Earth body and scatterable node group

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Drive independent Earth-shrink + node-scatter from `heroEase`

**Files:**
- Modify: `src/components/BackgroundCanvas.jsx` inside `animate()`, the line `globe.group.scale.setScalar(1 - heroEase * 0.82)`

**Interfaces:**
- Consumes: `globe.earthGroup` (Object3D) and `globe.updateScatter(t)` from Task 1.
- Produces: no new exports — this is the last piece needed for the Hero shrink/scatter behavior described in the spec.

- [ ] **Step 1: Replace the unified scale line with independent Earth shrink + node scatter**

Find (inside `animate()`):

```js
      globe.group.scale.setScalar(1 - heroEase * 0.82)
      globe.setFade(1 - Math.max(0, heroLocalT - 0.6) / 0.4)
```

Replace with:

```js
      globe.earthGroup.scale.setScalar(1 - heroEase)
      globe.updateScatter(heroEase)
      globe.setFade(1 - Math.max(0, heroLocalT - 0.6) / 0.4)
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Visual check**

Run: `npm run dev`, open the app, scroll slowly through the Hero section.
Expected: the wireframe/fill Earth body visibly shrinks to nothing by the end of the Hero scroll range, while the dotted node cloud visibly widens out and breaks apart into random-looking scattered positions (no longer a tight sphere), then the whole scattered cloud fades away per the existing fade-out. Scrolling back up should reform the sphere (scatter is driven by `heroEase`, which is continuous both directions).

- [ ] **Step 4: Commit**

```bash
git add src/components/BackgroundCanvas.jsx
git commit -m "$(cat <<'EOF'
feat: shrink Earth body and scatter its nodes independently through Hero scroll

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Gate mouse parallax by `heroEase`

**Files:**
- Modify: `src/components/BackgroundCanvas.jsx` inside `animate()` — move the `heroLocalT`/`heroEase` computation earlier and use it to scale `targetX`/`targetY`.

**Interfaces:**
- Consumes: `heroEndT`, `smoothedT`, `mouseX`, `mouseY` (all already defined in `animate()`'s closure).
- Produces: no new exports — final task in this plan.

- [ ] **Step 1: Move `heroLocalT`/`heroEase` up and gate the parallax targets**

Find the full block (inside `animate()`, from the `dt60` line through `lookTarget.copy`):

```js
      const dt60 = Math.min(3, clock.getDelta() * 60)

      const targetX = mouseX * 0.5
      const targetY = mouseY * 0.5

      const targetT = targetTFromScroll()
      const follow = 1 - Math.pow(1 - 0.05, dt60)
      smoothedT += (targetT - smoothedT) * follow

      // Globe self-rotates independent of scroll — a slight wobble on top of
      // the spin keeps it from reading as a mechanically perfect loop.
      globe.group.rotation.y += 0.006 * dt60
      globe.group.rotation.x = Math.sin(clock.elapsedTime * 0.15) * 0.06

      const curvePos = curve.getPointAt(smoothedT)
      const tangent = curve.getTangentAt(smoothedT)
      camera.position.x += (curvePos.x + targetX - camera.position.x) * follow
      camera.position.y += (curvePos.y - targetY - camera.position.y) * follow
      camera.position.z += (curvePos.z - camera.position.z) * follow
      lookTarget.copy(curvePos).add(tangent)

      // Hero choreography: right+zoomed -> center+small as Hero scrolls by,
      // fading out near the end so it reads as dissolving into the network
      // cluster the camera arrives at next. Anchored to the camera's current
      // position/facing (not a fixed world point) so it stays in view no
      // matter how far the camera itself travels during Hero's scroll range.
      const heroLocalT = Math.min(1, smoothedT / heroEndT)
      const heroEase = heroLocalT * heroLocalT * (3 - 2 * heroLocalT)
      const heroRight = tangent.clone().cross(worldUp).normalize()
```

Replace with:

```js
      const dt60 = Math.min(3, clock.getDelta() * 60)

      const targetT = targetTFromScroll()
      const follow = 1 - Math.pow(1 - 0.05, dt60)
      smoothedT += (targetT - smoothedT) * follow

      // Hero choreography driver, computed up front: 0 while the Earth is
      // still centering/shrinking/scattering, reaching 1 (and staying
      // there) once Hero's scroll range is done. Reused below both to gate
      // mouse parallax (off until the nodes finish scattering, per design)
      // and to drive the Earth's own shrink/scatter/position animation.
      const heroLocalT = Math.min(1, smoothedT / heroEndT)
      const heroEase = heroLocalT * heroLocalT * (3 - 2 * heroLocalT)

      // Parallax stays off for the whole Earth->scatter sequence so mouse
      // movement never fights the intro choreography, then ramps in as
      // heroEase reaches 1 — right as the nodes finish scattering.
      const targetX = mouseX * 0.5 * heroEase
      const targetY = mouseY * 0.5 * heroEase

      // Globe self-rotates independent of scroll — a slight wobble on top of
      // the spin keeps it from reading as a mechanically perfect loop.
      globe.group.rotation.y += 0.006 * dt60
      globe.group.rotation.x = Math.sin(clock.elapsedTime * 0.15) * 0.06

      const curvePos = curve.getPointAt(smoothedT)
      const tangent = curve.getTangentAt(smoothedT)
      camera.position.x += (curvePos.x + targetX - camera.position.x) * follow
      camera.position.y += (curvePos.y - targetY - camera.position.y) * follow
      camera.position.z += (curvePos.z - camera.position.z) * follow
      lookTarget.copy(curvePos).add(tangent)

      // Hero choreography: right+zoomed -> center+small as Hero scrolls by,
      // fading out near the end so it reads as dissolving into the network
      // cluster the camera arrives at next. Anchored to the camera's current
      // position/facing (not a fixed world point) so it stays in view no
      // matter how far the camera itself travels during Hero's scroll range.
      const heroRight = tangent.clone().cross(worldUp).normalize()
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Visual check**

Run: `npm run dev`, open the app at the top of the page (Hero start, `heroEase` ≈ 0).
Expected: moving the mouse produces little to no camera shift while the Earth/scatter animation is playing. Scroll to the end of the Hero section (or past it) and move the mouse again — camera should now shift with the mouse as it did before this change (`heroEase` = 1). No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/BackgroundCanvas.jsx
git commit -m "$(cat <<'EOF'
feat: gate mouse parallax by hero progress so it never fights the Earth intro

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
