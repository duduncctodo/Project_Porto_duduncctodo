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
