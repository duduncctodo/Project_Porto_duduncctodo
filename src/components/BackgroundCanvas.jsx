import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Three.js particle network background
export default function BackgroundCanvas({ revealed }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 50

    const particles = new THREE.BufferGeometry()
    const particleCount = 1000
    const posArray = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 100
    }
    particles.setAttribute('position', new THREE.BufferAttribute(posArray, 3))

    const material = new THREE.PointsMaterial({
      size: 0.2,
      color: 0xd9e2ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    })

    const particleMesh = new THREE.Points(particles, material)
    scene.add(particleMesh)

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x44464f,
      transparent: true,
      opacity: 0.15,
    })

    const lineGeometry = new THREE.BufferGeometry()
    const linePositions = new Float32Array(500 * 3 * 2)
    for (let i = 0; i < 500 * 3 * 2; i += 6) {
      const p1 = Math.floor(Math.random() * particleCount) * 3
      const p2 = Math.floor(Math.random() * particleCount) * 3
      linePositions[i] = posArray[p1]
      linePositions[i + 1] = posArray[p1 + 1]
      linePositions[i + 2] = posArray[p1 + 2]
      linePositions[i + 3] = posArray[p2]
      linePositions[i + 4] = posArray[p2 + 1]
      linePositions[i + 5] = posArray[p2 + 2]
    }
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
    scene.add(lines)

    let mouseX = 0
    let mouseY = 0
    const windowHalfX = window.innerWidth / 2
    const windowHalfY = window.innerHeight / 2

    function handleMouseMove(event) {
      mouseX = (event.clientX - windowHalfX) * 0.05
      mouseY = (event.clientY - windowHalfY) * 0.05
    }
    document.addEventListener('mousemove', handleMouseMove)

    const clock = new THREE.Clock()
    let frameId

    function animate() {
      frameId = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()

      const targetX = mouseX * 0.5
      const targetY = mouseY * 0.5

      particleMesh.rotation.y += 0.001
      lines.rotation.y += 0.001

      const positions = particleMesh.geometry.attributes.position.array
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3
        positions[i3 + 1] += Math.sin(elapsedTime * 0.5 + positions[i3]) * 0.02
      }
      particleMesh.geometry.attributes.position.needsUpdate = true

      camera.position.x += (targetX - camera.position.x) * 0.05
      camera.position.y += (-targetY - camera.position.y) * 0.05
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
      renderer.dispose()
    }
  }, [])

  return <canvas id="bg-canvas" ref={canvasRef} style={{ opacity: revealed ? 0.6 : 0 }}></canvas>
}
