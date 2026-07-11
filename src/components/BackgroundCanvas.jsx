import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Static network graph (nodes + k-NN edges + moving data packets). Scroll drives
// a camera Z dolly "flying through" the graph; mouse drives X/Y parallax.
export default function BackgroundCanvas({ revealed }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const cameraZStart = 50
    const cameraZEnd = -40
    camera.position.z = cameraZStart

    // Node/edge count tiered once at mount by viewport width (no resize re-tiering).
    const width = window.innerWidth
    const particleCount = width < 640 ? 350 : width < 1200 ? 700 : 1200
    const k = width < 640 ? 2 : 3

    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 100
    }

    // k-nearest-neighbor edges so the layout reads as an intentional topology.
    const edgeSet = new Set()
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      const dists = []
      for (let j = 0; j < particleCount; j++) {
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

    const particles = new THREE.BufferGeometry()
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      size: 0.2,
      color: 0xb0c6ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    })
    const particleMesh = new THREE.Points(particles, material)
    scene.add(particleMesh)

    const linePositions = new Float32Array(edges.length * 3 * 2)
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
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x44464f,
      transparent: true,
      opacity: 0.15,
    })
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
    scene.add(lines)

    // A subset of edges carry a moving "packet" that loops to a new random edge/speed on arrival.
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
    const packets = new THREE.Points(packetGeometry, packetMaterial)
    scene.add(packets)

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

    function animate() {
      frameId = requestAnimationFrame(animate)

      const targetX = mouseX * 0.5
      const targetY = mouseY * 0.5

      const scrollRange = document.documentElement.scrollHeight - window.innerHeight
      const targetT = scrollRange > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollRange)) : 0
      smoothedT += (targetT - smoothedT) * 0.05

      for (let p = 0; p < packetCount; p++) {
        const state = packetState[p]
        state.progress += state.speed * 0.01
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

      const targetZ = cameraZStart + (cameraZEnd - cameraZStart) * smoothedT
      camera.position.x += (targetX - camera.position.x) * 0.05
      camera.position.y += (-targetY - camera.position.y) * 0.05
      camera.position.z += (targetZ - camera.position.z) * 0.05
      camera.lookAt(scene.position)

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
      particles.dispose()
      material.dispose()
      lineGeometry.dispose()
      lineMaterial.dispose()
      packetGeometry.dispose()
      packetMaterial.dispose()
      renderer.dispose()
    }
  }, [])

  return <canvas id="bg-canvas" ref={canvasRef} style={{ opacity: revealed ? 0.6 : 0 }}></canvas>
}
