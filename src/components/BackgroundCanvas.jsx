import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { NAV_LINKS } from '../data'

// Builds one node/edge/packet cluster (k-NN graph + moving data packets),
// the same visual system as before, now sized for use as a landmark instead
// of filling the whole scene.
function createNetworkCluster(count, k, spread) {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count * 3; i++) positions[i] = (Math.random() - 0.5) * spread

  const edgeSet = new Set()
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const dists = []
    for (let j = 0; j < count; j++) {
      if (j === i) continue
      const j3 = j * 3
      const dx = positions[i3] - positions[j3]
      const dy = positions[i3 + 1] - positions[j3 + 1]
      const dz = positions[i3 + 2] - positions[j3 + 2]
      dists.push([dx * dx + dy * dy + dz * dz, j])
    }
    dists.sort((a, b) => a[0] - b[0])
    for (let n = 0; n < k; n++) {
      const j = dists[n][1]
      edgeSet.add(i < j ? `${i}_${j}` : `${j}_${i}`)
    }
  }
  const edges = Array.from(edgeSet, (key) => key.split('_').map(Number))

  const group = new THREE.Group()

  const nodeGeometry = new THREE.BufferGeometry()
  nodeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const nodeMaterial = new THREE.PointsMaterial({
    size: 0.2,
    color: 0xb0c6ff,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  })
  group.add(new THREE.Points(nodeGeometry, nodeMaterial))

  const linePositions = new Float32Array(edges.length * 6)
  for (let e = 0; e < edges.length; e++) {
    const [a, b] = edges[e]
    const e6 = e * 6
    linePositions[e6] = positions[a * 3]
    linePositions[e6 + 1] = positions[a * 3 + 1]
    linePositions[e6 + 2] = positions[a * 3 + 2]
    linePositions[e6 + 3] = positions[b * 3]
    linePositions[e6 + 4] = positions[b * 3 + 1]
    linePositions[e6 + 5] = positions[b * 3 + 2]
  }
  const lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x44464f, transparent: true, opacity: 0.15 })
  group.add(new THREE.LineSegments(lineGeometry, lineMaterial))

  const packetCount = Math.min(40, Math.floor(edges.length * 0.15))
  const packetPositions = new Float32Array(packetCount * 3)
  const packetState = Array.from({ length: packetCount }, () => ({
    edge: Math.floor(Math.random() * edges.length),
    progress: Math.random(),
    speed: 0.15 + Math.random() * 0.25,
  }))
  const packetGeometry = new THREE.BufferGeometry()
  packetGeometry.setAttribute('position', new THREE.BufferAttribute(packetPositions, 3))
  const packetMaterial = new THREE.PointsMaterial({
    size: 0.6,
    color: 0xb0c6ff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  })
  group.add(new THREE.Points(packetGeometry, packetMaterial))

  function updatePackets(dt60 = 1) {
    for (let p = 0; p < packetCount; p++) {
      const state = packetState[p]
      state.progress += state.speed * 0.01 * dt60
      if (state.progress >= 1) {
        state.progress = 0
        state.edge = Math.floor(Math.random() * edges.length)
        state.speed = 0.15 + Math.random() * 0.25
      }
      const [a, b] = edges[state.edge]
      const p3 = p * 3
      packetPositions[p3] = positions[a * 3] + (positions[b * 3] - positions[a * 3]) * state.progress
      packetPositions[p3 + 1] = positions[a * 3 + 1] + (positions[b * 3 + 1] - positions[a * 3 + 1]) * state.progress
      packetPositions[p3 + 2] = positions[a * 3 + 2] + (positions[b * 3 + 2] - positions[a * 3 + 2]) * state.progress
    }
    packetGeometry.attributes.position.needsUpdate = true
  }

  function dispose() {
    nodeGeometry.dispose()
    nodeMaterial.dispose()
    lineGeometry.dispose()
    lineMaterial.dispose()
    packetGeometry.dispose()
    packetMaterial.dispose()
  }

  return { group, updatePackets, dispose }
}

// Network globe landmark: a stylized Earth body (wireframe + faint fill,
// no external texture/model) wearing a shell of network nodes. Split into
// two sibling groups so the Earth body can shrink away while the nodes
// break off and scatter instead of animating together as one lump:
// - earthGroup: the planet body + its connecting arcs/packets (the
//   "structured backbone" that dissolves with the planet).
// - nodeGroup: the fibonacci point cloud AND the hub markers — the
//   nodes themselves, each with a precomputed random scatter target
//   (updateScatter()) sampled from the same point they started on, so
//   they read as pieces of the globe breaking off rather than new
//   objects appearing. Their materials are excluded from setFade() so
//   they stay visible after the Earth has dissolved.
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

  // Two-beat motion so the break-up reads as cause and effect instead of
  // two unrelated animations: for the first half of the scroll the nodes
  // shrink IN PLACE with the earth (same inward pull as earthGroup's own
  // scale-down, so they stay visibly stuck to its shrinking surface); only
  // in the second half do they release and burst out to scatterTargets.
  let lastScatterT = -1
  function updateScatter(t) {
    if (t === lastScatterT) return
    lastScatterT = t
    const shrink = Math.min(1, t / 0.5) * 0.85
    const burst = Math.max(0, (t - 0.5) / 0.5)
    const burstEase = burst * burst * (3 - 2 * burst)
    for (let i = 0; i < pointCount; i++) {
      const i3 = i * 3
      const ax = positions[i3] * (1 - shrink)
      const ay = positions[i3 + 1] * (1 - shrink)
      const az = positions[i3 + 2] * (1 - shrink)
      nodePositions[i3] = ax + (scatterTargets[i3] - ax) * burstEase
      nodePositions[i3 + 1] = ay + (scatterTargets[i3 + 1] - ay) * burstEase
      nodePositions[i3 + 2] = az + (scatterTargets[i3 + 2] - az) * burstEase
    }
    pointGeometry.attributes.position.needsUpdate = true
    for (let h = 0; h < hubMarkers.length; h++) {
      const attached = hubBasePositions[h].clone().multiplyScalar(1 - shrink)
      hubMarkers[h].position.lerpVectors(attached, hubScatterTargets[h], burstEase)
    }
  }

  // Hub markers are the most visible "nodes" on the globe, so they live in
  // nodeGroup (not earthGroup) and get their own scatter target sampled
  // from the same scatterTargets buffer as the point cloud — they're
  // literally pieces of the globe's surface, breaking off and drifting
  // out to where "their" point would have gone, instead of shrinking away
  // with the planet body.
  const hubGeometry = new THREE.SphereGeometry(0.35, 12, 12)
  disposables.push(hubGeometry)
  const hubMarkers = []
  const hubBasePositions = []
  const hubScatterTargets = []
  for (let h = 0; h < hubCount; h++) {
    const i = Math.floor((h / hubCount) * pointCount)
    const hubMaterial = new THREE.MeshBasicMaterial({ color: 0xeaf0ff, transparent: true, opacity: 1 })
    const marker = new THREE.Mesh(hubGeometry, hubMaterial)
    marker.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
    disposables.push(hubMaterial)
    hubMarkers.push(marker)
    hubBasePositions.push(marker.position.clone())
    hubScatterTargets.push(new THREE.Vector3(scatterTargets[i * 3], scatterTargets[i * 3 + 1], scatterTargets[i * 3 + 2]))
    nodeGroup.add(marker)
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

  // Only the planet body and its arcs/packets dissolve — the scattered
  // nodes (points + hub markers) are meant to persist as the lasting
  // "network" left behind once the Earth has broken apart, so their
  // materials are deliberately excluded here.
  const fadeMaterials = [earthFillMaterial, earthWireMaterial, arcMaterial, packetMaterial]
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

// Global-network background: camera flies along a fixed curve whose
// progress is driven by scroll, weighted per section so each section reads
// as a distinct stop rather than an arbitrary point in a continuous blend.
export default function BackgroundCanvas({ revealed }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

    // First two points sweep around the globe (establishing/orbit shot);
    // the rest is the unchanged dive toward the cluster/connector landmarks.
    const curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 4, 50),
        new THREE.Vector3(20, -2, 22),
        new THREE.Vector3(18, -6, -5),
        new THREE.Vector3(18, -6, -30),
        new THREE.Vector3(-16, -12, -55),
        new THREE.Vector3(-16, -12, -80),
        new THREE.Vector3(10, -18, -105),
        new THREE.Vector3(10, -18, -130),
      ],
      false,
      'catmullrom',
      0.5
    )

    // Tiered once at mount by viewport width — no resize re-tiering.
    const width = window.innerWidth
    const tier = width < 640 ? 'sm' : width < 1200 ? 'md' : 'lg'
    const clusterCount = { sm: 150, md: 300, lg: 500 }[tier]
    const clusterK = tier === 'sm' ? 2 : 3
    const globePointCount = { sm: 400, md: 700, lg: 1000 }[tier]
    const hubCount = { sm: 4, md: 5, lg: 6 }[tier]

    const globe = createGlobe(globePointCount, hubCount, 8)
    // Pull one hub marker out of the self-rotating globe group so it can sit
    // still at its own point on the curve — the "entry point" for Intro.
    const introHub = globe.hubMarkers[0]
    globe.nodeGroup.remove(introHub)
    introHub.scale.setScalar(1.8)
    const workCluster = createNetworkCluster(clusterCount, clusterK, 30)
    const uniCluster = createNetworkCluster(clusterCount, clusterK, 30)

    const connectorGeometry = new THREE.BufferGeometry()
    connectorGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3))
    const connectorMaterial = new THREE.PointsMaterial({
      size: 3,
      color: 0xeaf0ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    })
    const connector = new THREE.Points(connectorGeometry, connectorMaterial)

    scene.add(globe.group, introHub, workCluster.group, uniCluster.group, connector)

    // Sections double as landmark anchors — NAV_LINKS already starts with
    // 'hero' (the "Beranda" link), so it's used as-is, not prepended again.
    const sectionEls = NAV_LINKS.map((l) => document.getElementById(l.id)).filter(Boolean)
    const totalHeight = sectionEls.reduce((sum, el) => sum + el.offsetHeight, 0) || 1
    let acc = 0
    const sectionRanges = sectionEls.map((el) => {
      const startT = acc / totalHeight
      acc += el.offsetHeight
      return { top: el.offsetTop, height: el.offsetHeight, startT }
    })

    const landmarkTargets = [introHub, workCluster.group, uniCluster.group, connector]
    landmarkTargets.forEach((obj, i) => {
      const t = i === landmarkTargets.length - 1 ? 1 : (sectionRanges[i + 1]?.startT ?? (i + 1) / landmarkTargets.length)
      obj.position.copy(curve.getPointAt(t))
    })

    // Hero opening: globe starts zoomed-in and off to the right, then (as
    // Hero is scrolled through) drifts to center and shrinks. Positioned
    // relative to the camera each frame (not a fixed world point) — the
    // curve's own P0->P1 stretch covers far more ground than this offset,
    // so a world-anchored globe gets flown straight through mid-scroll.
    const worldUp = new THREE.Vector3(0, 1, 0)
    const heroEndT = sectionRanges[1]?.startT ?? 0.2
    const heroTangent0 = curve.getTangentAt(0)
    const heroRight0 = heroTangent0.clone().cross(worldUp).normalize()
    globe.group.position.copy(camera.position).addScaledVector(heroTangent0, 15).addScaledVector(heroRight0, 9)

    function targetTFromScroll() {
      const y = window.scrollY
      for (let i = sectionRanges.length - 1; i >= 0; i--) {
        const r = sectionRanges[i]
        if (y >= r.top || i === 0) {
          const local = r.height > 0 ? Math.min(1, Math.max(0, (y - r.top) / r.height)) : 0
          const weight = (sectionRanges[i + 1]?.startT ?? 1) - r.startT
          return Math.min(1, r.startT + local * weight)
        }
      }
      return 0
    }

    let mouseX = 0
    let mouseY = 0
    const windowHalfX = window.innerWidth / 2
    const windowHalfY = window.innerHeight / 2

    function handleMouseMove(event) {
      mouseX = (event.clientX - windowHalfX) * 0.05
      mouseY = (event.clientY - windowHalfY) * 0.05
    }
    document.addEventListener('mousemove', handleMouseMove)

    let frameId
    let smoothedT = 0
    const lookTarget = new THREE.Vector3()
    const clock = new THREE.Clock()

    function animate() {
      frameId = requestAnimationFrame(animate)

      // Normalize against a 60fps baseline so lerp/rotation speeds (tuned
      // for ~60fps) stay consistent on 90/120Hz screens instead of racing.
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

      // The other landmarks sit further down the same curve the camera
      // generally faces from frame one, so their points can bleed into the
      // wide-FOV Hero shot before the camera ever reaches them. Keep the
      // Hero view exclusively the globe's own nodes until Hero is done.
      const inHero = heroEase < 1
      introHub.visible = !inHero
      workCluster.group.visible = !inHero
      uniCluster.group.visible = !inHero
      connector.visible = !inHero

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
      globe.group.position
        .copy(camera.position)
        .addScaledVector(tangent, 15)
        .addScaledVector(heroRight, 9 * (1 - heroEase))
      globe.earthGroup.scale.setScalar(1 - heroEase)
      globe.updateScatter(heroEase)
      globe.setFade(1 - Math.max(0, heroLocalT - 0.6) / 0.4)

      globe.updatePackets(dt60)
      workCluster.updatePackets(dt60)
      uniCluster.updatePackets(dt60)
      camera.lookAt(lookTarget)

      renderer.render(scene, camera)
    }
    animate()

    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('mousemove', handleMouseMove)
      globe.dispose()
      workCluster.dispose()
      uniCluster.dispose()
      connectorGeometry.dispose()
      connectorMaterial.dispose()
      renderer.dispose()
    }
  }, [])

  return <canvas id="bg-canvas" ref={canvasRef} style={{ opacity: revealed ? 0.6 : 0 }}></canvas>
}
