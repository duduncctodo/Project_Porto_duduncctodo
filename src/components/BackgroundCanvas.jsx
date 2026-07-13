import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { SCENE_SECTION_IDS, buildBands, sceneStates } from '../three/scrollytelling'
import EarthScene from './scenes/EarthScene'
import DataCenterScene from './scenes/DataCenterScene'
import TopologyScene from './scenes/TopologyScene'

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

// Measures each scene's page sections into contiguous scroll bands.
// Re-measured on resize plus once late — images/fonts can shift layout
// after first paint.
function useSectionBands() {
  const bandsRef = useRef(null)
  useEffect(() => {
    function measure() {
      const groups = SCENE_SECTION_IDS.map((ids) =>
        ids
          .map((id) => {
            const el = document.getElementById(id)
            if (!el) return null
            const rect = el.getBoundingClientRect()
            return { top: rect.top + window.scrollY, height: rect.height }
          })
          .filter(Boolean)
      )
      if (groups.every((g) => g.length > 0)) bandsRef.current = buildBands(groups)
    }
    measure()
    const late = setTimeout(measure, 1500)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(late)
      window.removeEventListener('resize', measure)
    }
  }, [])
  return bandsRef
}

// Recomputes every scene's { weight, progress } once per frame from the
// live scroll position. Lenis writes the real window.scrollY, so reading
// it here stays in sync with the smooth scroll without any listener.
function SceneDriver({ bandsRef, statesRef }) {
  useFrame(() => {
    if (!bandsRef.current) return
    const center = window.scrollY + window.innerHeight / 2
    statesRef.current = sceneStates(bandsRef.current, center, window.innerHeight * 0.15)
  })
  return null
}

// Pointer parallax on the camera itself; scenes add their own subtle
// per-scene motion on top.
function CameraRig({ pointer }) {
  useFrame(({ camera }) => {
    camera.position.x += (pointer.current.x * 1.0 - camera.position.x) * 0.05
    camera.position.y += (-pointer.current.y * 1.0 - camera.position.y) * 0.05
    camera.lookAt(0, 0, 0)
  })
  return null
}

export default function BackgroundCanvas({ revealed }) {
  const pointer = useNormalizedPointer()
  const bandsRef = useSectionBands()
  const statesRef = useRef(SCENE_SECTION_IDS.map((_, i) => ({ weight: i === 0 ? 1 : 0, progress: 0 })))
  const [reduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  // ponytail: bloom keyed off initial width only — a resize across 640px
  // needs a reload to toggle it; add a resize listener if that ever matters.
  const [postEnabled] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 640)

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
        <SceneDriver bandsRef={bandsRef} statesRef={statesRef} />
        <Suspense fallback={null}>
          <EarthScene statesRef={statesRef} index={0} pointer={pointer} />
        </Suspense>
        <DataCenterScene statesRef={statesRef} index={1} pointer={pointer} />
        <TopologyScene statesRef={statesRef} index={2} pointer={pointer} />
        <CameraRig pointer={pointer} />
        {postEnabled && (
          <EffectComposer>
            <Bloom intensity={0.9} luminanceThreshold={0.3} mipmapBlur />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}
