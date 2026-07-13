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
