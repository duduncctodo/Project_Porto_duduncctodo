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

  function updatePackets() {
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

// Microcontroller chip landmark: body + two rows of pins + radiating trace lines.
function createChip(pinsPerSide) {
  const group = new THREE.Group()
  const disposables = []

  const bodyGeometry = new THREE.BoxGeometry(6, 0.6, 6)
  const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1b20 })
  group.add(new THREE.Mesh(bodyGeometry, bodyMaterial))
  disposables.push(bodyGeometry, bodyMaterial)

  const pinGeometry = new THREE.BoxGeometry(0.8, 0.15, 0.25)
  const pinMaterial = new THREE.MeshBasicMaterial({ color: 0xb0c6ff })
  disposables.push(pinGeometry, pinMaterial)
  const half = 6 / 2
  for (let side = 0; side < 2; side++) {
    const sign = side === 0 ? 1 : -1
    for (let i = 0; i < pinsPerSide; i++) {
      const pin = new THREE.Mesh(pinGeometry, pinMaterial)
      pin.position.set(sign * (half + 0.5), 0, (i - (pinsPerSide - 1) / 2) * 0.9)
      pin.rotation.y = Math.PI / 2
      group.add(pin)
    }
  }

  const traceCount = 8
  const tracePositions = new Float32Array(traceCount * 6)
  for (let i = 0; i < traceCount; i++) {
    const angle = (i / traceCount) * Math.PI * 2
    const i6 = i * 6
    tracePositions[i6] = Math.cos(angle) * 3.5
    tracePositions[i6 + 1] = 0
    tracePositions[i6 + 2] = Math.sin(angle) * 3.5
    tracePositions[i6 + 3] = Math.cos(angle) * 9
    tracePositions[i6 + 4] = 0
    tracePositions[i6 + 5] = Math.sin(angle) * 9
  }
  const traceGeometry = new THREE.BufferGeometry()
  traceGeometry.setAttribute('position', new THREE.BufferAttribute(tracePositions, 3))
  const traceMaterial = new THREE.LineBasicMaterial({ color: 0xb0c6ff, transparent: true, opacity: 0.25 })
  group.add(new THREE.LineSegments(traceGeometry, traceMaterial))
  disposables.push(traceGeometry, traceMaterial)

  return { group, dispose: () => disposables.forEach((d) => d.dispose()) }
}

// Circuit-journey background: camera flies along a fixed curve whose
// progress is driven by scroll, weighted per section so each section reads
// as a distinct stop rather than an arbitrary point in a continuous blend.
export default function BackgroundCanvas({ revealed }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

    const curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 0, 40),
        new THREE.Vector3(0, 0, 15),
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
    const pinsPerSide = { sm: 4, md: 6, lg: 8 }[tier]

    const chip = createChip(pinsPerSide)
    const grid = new THREE.GridHelper(40, 20, 0x44464f, 0x2a2c33)
    grid.material.transparent = true
    grid.material.opacity = 0.3
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

    scene.add(chip.group, grid, workCluster.group, uniCluster.group, connector)

    // Sections double as landmark anchors: 'hero' (chip) is not in NAV_LINKS
    // (nav only links scroll-to sections below the fold), so it's prepended.
    const sectionIds = ['hero', ...NAV_LINKS.map((l) => l.id)]
    const sectionEls = sectionIds.map((id) => document.getElementById(id)).filter(Boolean)
    const totalHeight = sectionEls.reduce((sum, el) => sum + el.offsetHeight, 0) || 1
    let acc = 0
    const sectionRanges = sectionEls.map((el) => {
      const startT = acc / totalHeight
      acc += el.offsetHeight
      return { top: el.offsetTop, height: el.offsetHeight, startT }
    })

    const landmarkTargets = [chip.group, grid, workCluster.group, uniCluster.group, connector]
    landmarkTargets.forEach((obj, i) => {
      const t = i === landmarkTargets.length - 1 ? 1 : (sectionRanges[i]?.startT ?? i / (landmarkTargets.length - 1))
      obj.position.copy(curve.getPointAt(t))
    })

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

    function animate() {
      frameId = requestAnimationFrame(animate)

      const targetX = mouseX * 0.5
      const targetY = mouseY * 0.5

      const targetT = targetTFromScroll()
      smoothedT += (targetT - smoothedT) * 0.05

      workCluster.updatePackets()
      uniCluster.updatePackets()

      const curvePos = curve.getPointAt(smoothedT)
      const tangent = curve.getTangentAt(smoothedT)
      camera.position.x += (curvePos.x + targetX - camera.position.x) * 0.05
      camera.position.y += (curvePos.y - targetY - camera.position.y) * 0.05
      camera.position.z += (curvePos.z - camera.position.z) * 0.05
      lookTarget.copy(curvePos).add(tangent)
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
      chip.dispose()
      grid.geometry.dispose()
      grid.material.dispose()
      workCluster.dispose()
      uniCluster.dispose()
      connectorGeometry.dispose()
      connectorMaterial.dispose()
      renderer.dispose()
    }
  }, [])

  return <canvas id="bg-canvas" ref={canvasRef} style={{ opacity: revealed ? 0.6 : 0 }}></canvas>
}
