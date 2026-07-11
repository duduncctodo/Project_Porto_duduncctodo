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
