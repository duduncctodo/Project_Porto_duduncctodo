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
