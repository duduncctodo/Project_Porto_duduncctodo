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
