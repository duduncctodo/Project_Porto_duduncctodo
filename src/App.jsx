import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import Lenis from 'lenis'
import profileImage from './picture/profile.png'

const BOOT_TEXTS = [
  'INITIALIZING SYSTEMS...',
  'LOADING ASSETS...',
  'ESTABLISHING SECURE CONNECTION...',
  'BYPASSING SECURITY PROTOCOLS...',
  'DECRYPTING PAYLOAD...',
  'SYSTEM READY.',
]

function App() {
  const [bootLines, setBootLines] = useState(['INITIALIZING SYSTEMS...'])
  const [progress, setProgress] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [removed, setRemoved] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const canvasRef = useRef(null)

  // Preloader: typed boot log + progress bar, then reveal hero/canvas
  useEffect(() => {
    let textIndex = 1
    let value = 0

    const bootInterval = setInterval(() => {
      if (textIndex < BOOT_TEXTS.length) {
        setBootLines((prev) => [...prev, BOOT_TEXTS[textIndex]])
        textIndex++
      }
    }, 300)

    const progressInterval = setInterval(() => {
      value += Math.floor(Math.random() * 8) + 2
      if (value >= 100) {
        setProgress(100)
        clearInterval(progressInterval)
        clearInterval(bootInterval)

        setTimeout(() => {
          setRevealed(true)
          setTimeout(() => setRemoved(true), 2000)
        }, 600)
      } else {
        setProgress(value)
      }
    }, 40)

    return () => {
      clearInterval(bootInterval)
      clearInterval(progressInterval)
    }
  }, [])

  // Theme toggle: mirrors documentElement.classList.toggle('dark', ...)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  // Three.js particle network background
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

  // Lenis smooth scroll (autoRaf covers the requestAnimationFrame loop)
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
      autoRaf: true,
    })
    return () => lenis.destroy()
  }, [])

  // Scroll-triggered fade via IntersectionObserver
  useEffect(() => {
    const fadeElements = document.querySelectorAll('.scroll-fade')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('out-of-view', !entry.isIntersecting)
        })
      },
      { root: null, rootMargin: '-10% 0px -10% 0px', threshold: 0.15 }
    )

    fadeElements.forEach((el) => {
      el.classList.add('out-of-view')
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  // Mouse parallax on .parallax-element
  useEffect(() => {
    function handleMouseMove(e) {
      const mouseX = e.clientX / window.innerWidth - 0.5
      const mouseY = e.clientY / window.innerHeight - 0.5
      const speed = 15
      document.querySelectorAll('.parallax-element').forEach((el) => {
        el.style.transform = `translate(${mouseX * speed}px, ${mouseY * speed}px)`
      })
    }
    function handleMouseLeave() {
      document.querySelectorAll('.parallax-element').forEach((el) => {
        el.style.transform = 'translate(0px, 0px)'
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    document.body.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.body.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <>
      <canvas id="bg-canvas" ref={canvasRef} style={{ opacity: revealed ? 0.6 : 0 }}></canvas>

      {!removed && (
        <div
          className="fixed inset-0 z-[90] backdrop-blur-[40px] bg-surface-dim/70 transition-all duration-[2000ms] ease-in-out pointer-events-none"
          id="intro-blur-overlay"
          style={
            revealed
              ? { backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)', backgroundColor: 'rgba(19, 19, 19, 0)', opacity: 0 }
              : undefined
          }
        ></div>
      )}

      {!removed && (
        <div
          className="fixed inset-0 z-[100] bg-surface-dim flex flex-col items-center justify-center font-label-code text-label-code text-primary transition-opacity duration-[1000ms] ease-out"
          id="preloader"
          style={{ opacity: revealed ? 0 : 1, pointerEvents: revealed ? 'none' : 'auto' }}
        >
          <div className="w-full max-w-md p-sm border border-outline-variant/30 glass-panel">
            <div className="mb-sm h-24 overflow-hidden flex flex-col justify-end" id="boot-sequence">
              {bootLines.map((text, i) => (
                <div className="text-on-surface-variant animate-pulse" key={i}>&gt; {text}</div>
              ))}
            </div>
            <div className="flex items-center gap-sm">
              <div className="flex-grow h-[2px] bg-surface-container-high relative overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-primary transition-all duration-75" id="progress-bar" style={{ width: `${progress}%` }}></div>
              </div>
              <span id="progress-text">{progress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-surface/30 dark:bg-surface/30 backdrop-blur-md border-b border-outline-variant/20 shadow-sm flex justify-between items-center px-grid-margin py-sm max-w-full" id="top-nav">
        <div></div>
        <ul className="hidden md:flex gap-md items-center">
          <li><a className="font-label-code text-label-code text-on-surface-variant hover:text-primary transition-colors hover:bg-primary/10 px-xs py-base rounded-sm" href="#intro">Intro</a></li>
          <li><a className="font-label-code text-label-code text-on-surface-variant hover:text-primary transition-colors hover:bg-primary/10 px-xs py-base rounded-sm" href="#work">Experience</a></li>
          <li><a className="font-label-code text-label-code text-primary border-b border-primary pb-1 px-xs py-base rounded-sm" href="#uni">Uni Things</a></li>
          <li><a className="font-label-code text-label-code text-on-surface-variant hover:text-primary transition-colors hover:bg-primary/10 px-xs py-base rounded-sm" href="#contact">Contact</a></li>
        </ul>
        <div className="flex items-center gap-xs font-label-code text-label-code text-on-surface-variant">
          made with stitch.ai
          <button className="ml-2 p-xs text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]">terminal</span>
          </button>
        </div>
      </nav>

      {/* Side Navigation */}
      <aside className="fixed right-grid-margin top-1/2 -translate-y-1/2 z-40 flex flex-col gap-sm items-center bg-transparent transition-all duration-500 ease-in-out hidden xl:flex">
        <a className="nav-dot text-outline-variant opacity-50 transition-all duration-300 hover:text-primary hover:opacity-100" href="#hero"><span className="material-symbols-outlined text-[12px]">radio_button_unchecked</span></a>
        <a className="nav-dot text-outline-variant opacity-50 transition-all duration-300 hover:text-primary hover:opacity-100" href="#intro"><span className="material-symbols-outlined text-[12px]">radio_button_unchecked</span></a>
        <a className="nav-dot text-outline-variant opacity-50 transition-all duration-300 hover:text-primary hover:opacity-100" href="#work"><span className="material-symbols-outlined text-[12px]">radio_button_unchecked</span></a>
        <a className="nav-dot text-primary scale-125 transition-all duration-300" href="#uni"><span className="material-symbols-outlined text-[12px]">radio_button_unchecked</span></a>
        <a className="nav-dot text-outline-variant opacity-50 transition-all duration-300 hover:text-primary hover:opacity-100" href="#contact"><span className="material-symbols-outlined text-[12px]">radio_button_unchecked</span></a>
      </aside>

      <main className="w-full max-w-7xl mx-auto px-sm md:px-grid-margin pb-xl">
        {/* Hero Section */}
        <section
          className={`relative items-start justify-center flex-col min-h-[90vh] transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${revealed ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.90]'}`}
          id="hero"
        >
          <div className="max-w-4xl scroll-fade parallax-element z-10">
            <h1 className="text-[clamp(3rem,8vw,6rem)] font-headline-xl font-bold leading-none tracking-tighter mb-4 text-on-surface flex flex-col gap-2">
              <span className="text-on-surface-variant/80">see it,</span>
              <span className="glitch-wrapper">
                <span className="glitch" data-text="think it">think it</span>
              </span>
              <span className="text-primary glow-text uppercase tracking-widest mt-4 text-[clamp(4rem,10vw,8rem)]">solve it</span>
            </h1>
          </div>
        </section>

        {/* Intro Section */}
        <section className="relative items-center justify-center flex-col gap-lg" id="intro">
          <div className="absolute inset-0 z-[-1] opacity-40 pointer-events-none flex items-center justify-center">
            <div className="w-[600px] h-[400px] rounded-full bg-primary/5 blur-[100px] absolute"></div>
          </div>
          <div className="w-full max-w-sm aspect-square rounded-2xl overflow-hidden border border-outline-variant/30 shadow-2xl z-10 parallax-element scroll-fade">
            <img alt="Intro Profile" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" src={profileImage} />
          </div>
          <div className="glass-panel p-lg w-full max-w-2xl text-center z-10 parallax-element scroll-fade">
            <h2 className="font-headline-lg text-[32px] font-bold text-on-surface mb-sm">Introduction</h2>
            <p className="font-body-md text-on-surface-variant leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            </p>
          </div>
        </section>

        {/* Work Experience Section */}
        <section className="relative" id="work">
          <div className="mb-lg flex items-center gap-sm scroll-fade">
            <span className="material-symbols-outlined text-primary text-3xl">work</span>
            <h2 className="font-headline-lg text-[32px] font-bold tracking-wide">WORK EXPERIENCE</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md parallax-element">
            <div className="glass-panel p-0 overflow-hidden flex flex-col hover-glow transition-all duration-300 scroll-fade group">
              <div className="w-full aspect-[21/9] bg-surface-container-highest relative overflow-hidden">
                <img alt="Senior Engineer" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxzmSc1rGWwydT-JqGOvHQq9gZkRumnU7zxaYilv4zngw4dXtULQjjP1YBovjwTQ6bMaquK0BqXgHNWD_A_yoxdTfIIc79qJJM3VT8t2exFthASJCPktLJOqElVhgcF4W7z6b4lOQtxIF3AwfQJ4aNjfogBe7kUBd97yyIjZnzAEBA0v0jx9N3EjVkNQrP5114g9rLQ0jFipg9g62TViQjZOR1BUnLFuWmdGvpEFaad7aeQvhLy7ggA5wZb1zAh3cKS3YLH1semCX7" />
                <span className="absolute top-sm right-sm font-label-code text-on-surface-variant text-[10px]">01</span>
              </div>
              <div className="p-md flex flex-col flex-grow">
                <h3 className="font-headline-lg text-[28px] font-bold mb-sm">Senior Engineer</h3>
                <div className="flex gap-xs mb-md">
                  <span className="font-label-code text-[12px] border border-outline-variant/50 px-2 py-1 rounded text-on-surface-variant">System Arch</span>
                  <span className="font-label-code text-[12px] border border-outline-variant/50 px-2 py-1 rounded text-on-surface-variant">Go</span>
                </div>
                <p className="font-body-md text-on-surface-variant">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin in ante viverra, rutrum erat non, tincidunt neque.
                </p>
              </div>
            </div>
            <div className="glass-panel p-0 overflow-hidden flex flex-col hover-glow transition-all duration-300 scroll-fade group" style={{ transitionDelay: '100ms' }}>
              <div className="w-full aspect-[21/9] bg-surface-container-highest relative overflow-hidden">
                <div className="w-full h-full bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuAxzmSc1rGWwydT-JqGOvHQq9gZkRumnU7zxaYilv4zngw4dXtULQjjP1YBovjwTQ6bMaquK0BqXgHNWD_A_yoxdTfIIc79qJJM3VT8t2exFthASJCPktLJOqElVhgcF4W7z6b4lOQtxIF3AwfQJ4aNjfogBe7kUBd97yyIjZnzAEBA0v0jx9N3EjVkNQrP5114g9rLQ0jFipg9g62TViQjZOR1BUnLFuWmdGvpEFaad7aeQvhLy7ggA5wZb1zAh3cKS3YLH1semCX7')] bg-cover bg-center opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-500"></div>
                <span className="absolute top-sm right-sm font-label-code text-on-surface-variant text-[10px]">02</span>
              </div>
              <div className="p-md flex flex-col flex-grow">
                <h3 className="font-headline-lg text-[28px] font-bold mb-sm">Systems Analyst</h3>
                <div className="flex gap-xs mb-md">
                  <span className="font-label-code text-[12px] border border-outline-variant/50 px-2 py-1 rounded text-on-surface-variant">Data</span>
                  <span className="font-label-code text-[12px] border border-outline-variant/50 px-2 py-1 rounded text-on-surface-variant">Python</span>
                </div>
                <p className="font-body-md text-on-surface-variant">
                  Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Phasellus eget magna.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Uni Things Section */}
        <section className="relative" id="uni">
          <div className="mb-lg flex items-center gap-sm scroll-fade">
            <span className="material-symbols-outlined text-primary text-3xl">school</span>
            <h2 className="font-headline-lg text-[32px] font-bold tracking-wide">UNI THINGS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md parallax-element">
            <div className="glass-panel p-0 overflow-hidden flex flex-col hover-glow transition-all duration-300 scroll-fade group">
              <div className="w-full aspect-[4/3] bg-surface-container-highest relative overflow-hidden">
                <img alt="Research Lab" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500 grayscale group-hover:grayscale-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDbCXrOtyK61gTu4FSqwm9ELpYYh6pSGI723taKy65pD_F7VqVl-sRFJJyxke3dkHepY5G-1V7SqleDVHeVlmRlOkXsu9dnmg_mtif7fkQUMdgOrp-K_TK5mlnU-j8t_GTUurd85lkS75b4ksvHYWTU8VwN1nj0duKU5huKFfNjiQx_YJrAm9EjjiUnkpFQRMsHgDOD4zpeeihhWM3uLLqMDDSDuK1YXDmKbnkH2b7lERz8MhGBfA-GpTIysaEbRDdj0wCAkcgRvZt-" />
              </div>
              <div className="p-md flex flex-col flex-grow bg-surface-dim/50">
                <span className="material-symbols-outlined text-on-surface-variant mb-sm text-[28px]">science</span>
                <h3 className="font-headline-lg text-[20px] font-bold mb-xs">Research Lab</h3>
                <p className="font-body-md text-[14px] text-on-surface-variant">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam erat volutpat.
                </p>
              </div>
            </div>
            <div className="glass-panel p-0 overflow-hidden flex flex-col hover-glow transition-all duration-300 scroll-fade group" style={{ transitionDelay: '100ms' }}>
              <div className="w-full aspect-[4/3] bg-surface-container-highest relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuAxzmSc1rGWwydT-JqGOvHQq9gZkRumnU7zxaYilv4zngw4dXtULQjjP1YBovjwTQ6bMaquK0BqXgHNWD_A_yoxdTfIIc79qJJM3VT8t2exFthASJCPktLJOqElVhgcF4W7z6b4lOQtxIF3AwfQJ4aNjfogBe7kUBd97yyIjZnzAEBA0v0jx9N3EjVkNQrP5114g9rLQ0jFipg9g62TViQjZOR1BUnLFuWmdGvpEFaad7aeQvhLy7ggA5wZb1zAh3cKS3YLH1semCX7')] bg-cover bg-center opacity-30 grayscale mix-blend-overlay"></div>
                <h4 className="font-headline-xl font-bold text-on-surface z-10 text-center uppercase tracking-widest text-[24px]">Byte<br />Breakers</h4>
              </div>
              <div className="p-md flex flex-col flex-grow bg-surface-dim/50">
                <span className="material-symbols-outlined text-on-surface-variant mb-sm text-[28px]">code</span>
                <h3 className="font-headline-lg text-[20px] font-bold mb-xs">Hackathon Club</h3>
                <p className="font-body-md text-[14px] text-on-surface-variant">
                  Suspendisse potenti. Nullam id dolor id nibh ultricies vehicula ut id elit.
                </p>
              </div>
            </div>
            <div className="glass-panel p-0 overflow-hidden flex flex-col hover-glow transition-all duration-300 scroll-fade group" style={{ transitionDelay: '200ms' }}>
              <div className="w-full aspect-[4/3] bg-surface-container-highest relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-surface-container-lowest to-surface-container-high opacity-80"></div>
                <h4 className="font-headline-xl font-bold text-on-surface z-10 text-center uppercase tracking-widest text-[24px]">Archi-Tech<br />Studio</h4>
              </div>
              <div className="p-md flex flex-col flex-grow bg-surface-dim/50">
                <span className="material-symbols-outlined text-on-surface-variant mb-sm text-[28px]">architecture</span>
                <h3 className="font-headline-lg text-[20px] font-bold mb-xs">Design Studio</h3>
                <p className="font-body-md text-[14px] text-on-surface-variant">
                  Cras justo odio, dapibus ac facilisis in, egestas eget quam.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="relative items-center text-center pb-0" id="contact">
          <div className="mb-lg scroll-fade">
            <h2 className="text-[clamp(3rem,8vw,6rem)] font-headline-xl font-bold leading-none tracking-tighter mb-0 text-on-surface">CONTACT</h2>
          </div>
          <div className="flex gap-sm w-full justify-center max-w-2xl mx-auto parallax-element scroll-fade">
            <a className="font-label-code text-on-surface-variant hover:text-primary transition-colors border-b border-outline-variant pb-1" href="#">Email</a>
            <span className="text-outline-variant">/</span>
            <a className="font-label-code text-on-surface-variant hover:text-primary transition-colors border-b border-outline-variant pb-1" href="#">LinkedIn</a>
            <span className="text-outline-variant">/</span>
            <a className="font-label-code text-on-surface-variant hover:text-primary transition-colors border-b border-outline-variant pb-1" href="#">Twitter</a>
          </div>
        </section>
      </main>

      {/* Theme Toggle */}
      <div className="w-full flex justify-start px-sm md:px-grid-margin mt-xl mb-4 z-50 relative">
        <div className="flex items-center gap-xs glass-panel px-4 py-2 rounded-full shadow-lg">
          <span className="material-symbols-outlined text-[14px] text-on-surface-variant">light_mode</span>
          <button
            className={`relative w-8 h-4 rounded-full bg-surface-container-high border border-outline-variant/30 transition-colors duration-300 focus:outline-none ${isDark ? 'bg-primary/20' : ''}`}
            onClick={() => setIsDark((d) => !d)}
          >
            <div className={`absolute top-[2px] left-[2px] w-3 h-3 rounded-full bg-primary transition-transform duration-300 ${isDark ? 'translate-x-4' : ''}`}></div>
          </button>
          <span className="material-symbols-outlined text-[14px] text-primary">dark_mode</span>
        </div>
      </div>
    </>
  )
}

export default App
