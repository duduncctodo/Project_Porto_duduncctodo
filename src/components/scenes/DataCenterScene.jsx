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
