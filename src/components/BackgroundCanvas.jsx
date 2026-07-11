import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, QuadraticBezierLine } from '@react-three/drei'
import { HUBS, latLonToVector3, sampleLandPoints } from '../three/globeGeo'

const CYAN = '#00d2ff'
const RADIUS = 8
const EXPLODE_THRESHOLD = 0.5
const PRE_EXPLODE_SHRINK = 0.85
const PARALLAX_STRENGTH = 6

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

// Pure function of scroll progress alone (no latched/time-based state), so
// scrolling back up always retraces the exact same shrink/burst it took
// going down — reassembly is automatic, not something to special-case.
// 0 -> EXPLODE_THRESHOLD: shrinkFactor eases 1 -> 0.15 (globe shrinking).
// EXPLODE_THRESHOLD -> 1: burstEase eases 0 -> 1 (nodes scattering).
function burstState(t) {
  const shrink = Math.min(1, t / EXPLODE_THRESHOLD) * PRE_EXPLODE_SHRINK
  const burst = Math.max(0, (t - EXPLODE_THRESHOLD) / (1 - EXPLODE_THRESHOLD))
  const burstEase = burst * burst * (3 - 2 * burst)
  return { shrinkFactor: 1 - shrink, burstEase }
}

// Farther burst targets (large |z|) get a bigger depthFactor than nearer
// ones, so mouse movement visibly shifts nodes relative to each other
// instead of moving the whole field by one flat amount. Scaled by burstEase
// so parallax fades in as nodes scatter and fades back out as they reform.
function depthParallaxFactor(z, burstEase) {
  return THREE.MathUtils.clamp(Math.abs(z) / 60, 0.1, 1) * burstEase
}

// Each hub's burst target is a deterministic push outward along its OWN
// base direction (not a random point) — deliberate: HologramGlobe and
// NetworkArcs each independently compute hub positions every frame, and
// only a deterministic target guarantees both land on the exact same point
// without sharing any random state, which is what keeps the arcs visually
// attached to the hub markers as they scatter.
function computeHubPositions(hubBasePositions, hubBurstTargets, t, pointer) {
  const { shrinkFactor, burstEase } = burstState(t)
  return hubBasePositions.map((base, i) => {
    const target = hubBurstTargets[i]
    const pos = base.clone().multiplyScalar(shrinkFactor).lerp(target, burstEase)
    const depth = depthParallaxFactor(target.z, burstEase)
    pos.x += pointer.current.x * depth * PARALLAX_STRENGTH
    pos.y += -pointer.current.y * depth * PARALLAX_STRENGTH
    return pos
  })
}

// Wireframe shell + continent-silhouette particle cloud + 8 pulsing hub
// markers. Self-rotates (slowing as it scatters) and shrinks as scrollProgress
// approaches EXPLODE_THRESHOLD; past that point every particle/hub eases from
// its shrunk position to its own burst target, with depth parallax layered on
// top. Everything here is a pure function of the current scroll position, so
// scrolling back up smoothly reverses the whole sequence.
function HologramGlobe({ scrollProgress, pointer }) {
  const groupRef = useRef()
  const shellRef = useRef()
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
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
      const dist = RADIUS * (2.5 + Math.random() * 3.5)
      arr[i * 3] = dir.x * dist
      arr[i * 3 + 1] = dir.y * dist
      arr[i * 3 + 2] = dir.z * dist
    }
    return arr
  }, [particleCount])

  const hubBasePositions = useMemo(
    () => HUBS.map((hub) => new THREE.Vector3(...latLonToVector3(hub.lat, hub.lon, RADIUS * 1.01))),
    []
  )
  const hubBurstTargets = useMemo(
    () => hubBasePositions.map((base) => base.clone().normalize().multiplyScalar(RADIUS * 4.5)),
    [hubBasePositions]
  )

  useFrame((state, delta) => {
    const dt60 = Math.min(3, delta * 60)
    const t = scrollProgress.current
    const elapsed = state.clock.elapsedTime
    const { shrinkFactor, burstEase } = burstState(t)

    const spin = 0.0025 + t * 0.006
    groupRef.current.rotation.y += spin * dt60 * (1 - burstEase)
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, t * 0.4 * (1 - burstEase), 0.05)

    shellRef.current.scale.setScalar(shrinkFactor)
    if (wireMaterialRef.current) wireMaterialRef.current.opacity = 0.25 * (1 - burstEase)

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      const startX = basePositions[i3] * shrinkFactor
      const startY = basePositions[i3 + 1] * shrinkFactor
      const startZ = basePositions[i3 + 2] * shrinkFactor
      const burstX = startX + (burstTargets[i3] - startX) * burstEase
      const burstY = startY + (burstTargets[i3 + 1] - startY) * burstEase
      const burstZ = startZ + (burstTargets[i3 + 2] - startZ) * burstEase
      const depth = depthParallaxFactor(burstTargets[i3 + 2], burstEase)
      livePositions[i3] = burstX + pointer.current.x * depth * PARALLAX_STRENGTH
      livePositions[i3 + 1] = burstY - pointer.current.y * depth * PARALLAX_STRENGTH
      livePositions[i3 + 2] = burstZ
    }
    if (positionAttributeRef.current) positionAttributeRef.current.needsUpdate = true

    const hubPositions = computeHubPositions(hubBasePositions, hubBurstTargets, t, pointer)
    hubRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      mesh.position.copy(hubPositions[i])
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
        <Sphere key={HUBS[i].name} ref={(mesh) => (hubRefs.current[i] = mesh)} args={[0.28, 12, 12]} position={position}>
          <meshBasicMaterial color={CYAN} transparent opacity={0.95} />
        </Sphere>
      ))}
    </group>
  )
}

// Bezier arcs ring-connecting each hub to the next, plus small glowing
// packets riding each arc on an endless loop (progress wraps at 1 — no seam).
// Arcs never fade and never detach: every frame they're redrawn between the
// SAME live hub positions HologramGlobe is displaying (via the shared pure
// computeHubPositions/burstState functions), so the network stays visibly
// connected through the whole shrink/scatter/reassemble sequence.
function NetworkArcs({ scrollProgress, pointer }) {
  const hubBasePositions = useMemo(
    () => HUBS.map((hub) => new THREE.Vector3(...latLonToVector3(hub.lat, hub.lon, RADIUS * 1.01))),
    []
  )
  const hubBurstTargets = useMemo(
    () => hubBasePositions.map((base) => base.clone().normalize().multiplyScalar(RADIUS * 4.5)),
    [hubBasePositions]
  )
  const hubCount = hubBasePositions.length

  const packetCount = hubCount * 3
  const packetPositions = useMemo(() => new Float32Array(packetCount * 3), [packetCount])
  const packetState = useMemo(
    () =>
      Array.from({ length: packetCount }, () => ({
        arc: Math.floor(Math.random() * hubCount),
        progress: Math.random(),
        speed: 0.2 + Math.random() * 0.3,
      })),
    [hubCount, packetCount]
  )
  const positionAttributeRef = useRef()
  const arcRefs = useRef([])

  useFrame((_, delta) => {
    const t = scrollProgress.current
    const hubPositions = computeHubPositions(hubBasePositions, hubBurstTargets, t, pointer)

    // ponytail: one QuadraticBezierCurve3 allocated per packet per frame —
    // negligible at packetCount<=24, upgrade to a reused scratch curve if
    // this list ever grows much larger.
    const arcCurves = hubPositions.map((start, i) => {
      const end = hubPositions[(i + 1) % hubCount]
      const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(RADIUS * 1.35)
      return new THREE.QuadraticBezierCurve3(start, mid, end)
    })

    arcRefs.current.forEach((line, i) => {
      if (!line) return
      const curve = arcCurves[i]
      line.setPoints(curve.v0.toArray(), curve.v2.toArray(), curve.v1.toArray())
    })

    const dt60 = Math.min(3, delta * 60)
    packetState.forEach((state, p) => {
      state.progress += state.speed * 0.01 * dt60
      if (state.progress >= 1) {
        state.progress = 0
        state.arc = Math.floor(Math.random() * hubCount)
        state.speed = 0.2 + Math.random() * 0.3
      }
      const point = arcCurves[state.arc].getPointAt(state.progress)
      packetPositions[p * 3] = point.x
      packetPositions[p * 3 + 1] = point.y
      packetPositions[p * 3 + 2] = point.z
    })
    if (positionAttributeRef.current) positionAttributeRef.current.needsUpdate = true
  })

  return (
    <group>
      {hubBasePositions.map((_, i) => (
        <QuadraticBezierLine
          key={HUBS[i].name}
          ref={(line) => (arcRefs.current[i] = line)}
          start={[0, 0, 0]}
          end={[0, 0, 0]}
          mid={[0, 0, 0]}
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

// No visible mesh — dollies the camera in as scrollProgress advances
// (unchanged across the whole 0..1 range, so continuing to scroll past the
// burst reads as flying through the scattered field) and applies
// mouse-parallax to the camera itself, tapering that offset to zero as
// burstEase rises so the per-node depth parallax takes over instead of
// stacking with it — and tapering back in as scrolling back up reassembles
// the globe.
function CameraRig({ scrollProgress, pointer }) {
  useFrame(({ camera }) => {
    const t = scrollProgress.current
    const { burstEase } = burstState(t)
    const targetZ = 26 - t * 12
    camera.position.z += (targetZ - camera.position.z) * 0.05

    const parallaxWeight = 1 - burstEase
    const targetX = pointer.current.x * 1.5 * parallaxWeight
    const targetY = -pointer.current.y * 1.5 * parallaxWeight
    camera.position.x += (targetX - camera.position.x) * 0.05
    camera.position.y += (targetY - camera.position.y) * 0.05
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
        <HologramGlobe scrollProgress={scrollProgress} pointer={pointer} />
        <NetworkArcs scrollProgress={scrollProgress} pointer={pointer} />
        <CameraRig scrollProgress={scrollProgress} pointer={pointer} />
      </Canvas>
    </div>
  )
}
