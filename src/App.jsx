import { useEffect, useRef, useState, useCallback } from 'react'
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

const NAV_LINKS = [
  { id: 'intro', label: 'Intro' },
  { id: 'work', label: 'Experience' },
  { id: 'uni', label: 'Uni Things' },
  { id: 'contact', label: 'Contact' },
]

const WORK_EXPERIENCES = [
  {
    id: '01',
    title: 'Senior Engineer',
    tags: ['System Arch', 'Go'],
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin in ante viverra, rutrum erat non, tincidunt neque.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAxzmSc1rGWwydT-JqGOvHQq9gZkRumnU7zxaYilv4zngw4dXtULQjjP1YBovjwTQ6bMaquK0BqXgHNWD_A_yoxdTfIIc79qJJM3VT8t2exFthASJCPktLJOqElVhgcF4W7z6b4lOQtxIF3AwfQJ4aNjfogBe7kUBd97yyIjZnzAEBA0v0jx9N3EjVkNQrP5114g9rLQ0jFipg9g62TViQjZOR1BUnLFuWmdGvpEFaad7aeQvhLy7ggA5wZb1zAh3cKS3YLH1semCX7',
  },
  {
    id: '02',
    title: 'Systems Analyst',
    tags: ['Data', 'Python'],
    description:
      'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Phasellus eget magna.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAxzmSc1rGWwydT-JqGOvHQq9gZkRumnU7zxaYilv4zngw4dXtULQjjP1YBovjwTQ6bMaquK0BqXgHNWD_A_yoxdTfIIc79qJJM3VT8t2exFthASJCPktLJOqElVhgcF4W7z6b4lOQtxIF3AwfQJ4aNjfogBe7kUBd97yyIjZnzAEBA0v0jx9N3EjVkNQrP5114g9rLQ0jFipg9g62TViQjZOR1BUnLFuWmdGvpEFaad7aeQvhLy7ggA5wZb1zAh3cKS3YLH1semCX7',
  },
  {
    id: '03',
    title: 'Frontend Developer',
    tags: ['React', 'TypeScript'],
    description:
      'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Sed eget nunc vel nisi bibendum convallis.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAxzmSc1rGWwydT-JqGOvHQq9gZkRumnU7zxaYilv4zngw4dXtULQjjP1YBovjwTQ6bMaquK0BqXgHNWD_A_yoxdTfIIc79qJJM3VT8t2exFthASJCPktLJOqElVhgcF4W7z6b4lOQtxIF3AwfQJ4aNjfogBe7kUBd97yyIjZnzAEBA0v0jx9N3EjVkNQrP5114g9rLQ0jFipg9g62TViQjZOR1BUnLFuWmdGvpEFaad7aeQvhLy7ggA5wZb1zAh3cKS3YLH1semCX7',
  },
]

function App() {
  const [bootLines, setBootLines] = useState(['INITIALIZING SYSTEMS...'])
  const [progress, setProgress] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [removed, setRemoved] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const [activeNav, setActiveNav] = useState('')
  const [workIndex, setWorkIndex] = useState(0)
  const [workSlideDir, setWorkSlideDir] = useState('')
  const [workAnimating, setWorkAnimating] = useState(false)
  const [profileVisible, setProfileVisible] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const canvasRef = useRef(null)
  const profileRef = useRef(null)
  const profileImgRef = useRef(null) // direct DOM for parallax — no state re-render

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

  // Theme toggle
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    document.body.style.backgroundColor = isDark ? '#131313' : '#f0f2f8'
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

  // Active nav highlight on scroll
  useEffect(() => {
    const sections = NAV_LINKS.map(({ id }) => document.getElementById(id)).filter(Boolean)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveNav(entry.target.id)
        })
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  // Profile image IntersectionObserver scroll reveal (bidirectional)
  useEffect(() => {
    const el = profileRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { setProfileVisible(entry.isIntersecting) },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Profile scroll parallax — direct DOM manipulation, zero re-renders
  useEffect(() => {
    const isTouchDevice = () => window.matchMedia('(hover: none)').matches
    if (isTouchDevice()) return
    let rafId
    const handleScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const wrapper = profileRef.current
        const img = profileImgRef.current
        if (!wrapper || !img) return
        const rect = wrapper.getBoundingClientRect()
        const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * 0.06
        img.style.transform = `translateY(${offset}px)`
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(rafId)
    }
  }, [])

  // Mouse parallax on .parallax-element — rAF throttled, no React state
  useEffect(() => {
    const isTouchDevice = () => window.matchMedia('(hover: none)').matches
    if (isTouchDevice()) return
    let rafId
    let pending = false
    let lastX = 0, lastY = 0
    function onMouseMove(e) {
      lastX = e.clientX / window.innerWidth - 0.5
      lastY = e.clientY / window.innerHeight - 0.5
      if (!pending) {
        pending = true
        rafId = requestAnimationFrame(() => {
          pending = false
          const speed = 12
          document.querySelectorAll('.parallax-element').forEach((el) => {
            el.style.transform = `translate(${lastX * speed}px, ${lastY * speed}px)`
          })
        })
      }
    }
    function onMouseLeave() {
      cancelAnimationFrame(rafId)
      pending = false
      document.querySelectorAll('.parallax-element').forEach((el) => {
        el.style.transform = 'translate(0px, 0px)'
      })
    }
    window.addEventListener('mousemove', onMouseMove)
    document.body.addEventListener('mouseleave', onMouseLeave)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', onMouseMove)
      document.body.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  // Work experience carousel
  const navigateWork = useCallback(
    (dir) => {
      if (workAnimating) return
      const newIndex =
        dir === 'next'
          ? (workIndex + 1) % WORK_EXPERIENCES.length
          : (workIndex - 1 + WORK_EXPERIENCES.length) % WORK_EXPERIENCES.length
      setWorkSlideDir(dir === 'next' ? 'slide-out-left' : 'slide-out-right')
      setWorkAnimating(true)
      setTimeout(() => {
        setWorkIndex(newIndex)
        setWorkSlideDir(dir === 'next' ? 'slide-in-right' : 'slide-in-left')
        setTimeout(() => {
          setWorkSlideDir('')
          setWorkAnimating(false)
        }, 400)
      }, 350)
    },
    [workIndex, workAnimating]
  )

  const exp = WORK_EXPERIENCES[workIndex]

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

      {/* Top Navigation — glass blur */}
      <nav
        className="fixed top-0 w-full z-50 flex justify-between items-center px-grid-margin py-sm max-w-full"
        id="top-nav"
        style={{
          background: isDark ? 'rgba(19,19,19,0.4)' : 'rgba(240,242,248,0.50)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 2px 24px 0 rgba(0,0,0,0.12)',
        }}
      >
        {/* Dark/Light mode toggle — top left */}
        <div className="flex items-center gap-xs font-label-code text-label-code">
          <span className={`material-symbols-outlined text-[16px] transition-colors ${isDark ? 'text-on-surface-variant/60' : 'text-amber-500'}`}>light_mode</span>
          <button
            id="theme-toggle"
            aria-label="Toggle dark/light mode"
            className={`relative w-10 h-5 rounded-full border transition-all duration-300 focus:outline-none ${
              isDark ? 'bg-primary/20 border-primary/30' : 'bg-amber-100 border-amber-300'
            }`}
            onClick={() => setIsDark((d) => !d)}
          >
            <div
              className={`absolute top-[2px] left-[2px] w-4 h-4 rounded-full transition-all duration-300 shadow-md ${
                isDark ? 'translate-x-5 bg-primary' : 'translate-x-0 bg-amber-400'
              }`}
            />
          </button>
          <span className={`material-symbols-outlined text-[16px] transition-colors ${isDark ? 'text-primary' : 'text-on-surface-variant/60'}`}>dark_mode</span>
        </div>

        {/* Nav links — desktop only */}
        <ul className="hidden md:flex gap-xs items-center">
          {NAV_LINKS.map(({ id, label }) => {
            const isActive = activeNav === id
            return (
              <li key={id}>
                <a
                  className={`font-label-code text-label-code px-xs py-base rounded-sm transition-all duration-200 ${
                    isActive
                      ? isDark
                        ? 'bg-primary text-on-primary font-bold'
                        : 'bg-on-surface text-inverse-on-surface font-bold'
                      : 'text-on-surface-variant hover:text-primary hover:bg-primary/10'
                  }`}
                  href={`#${id}`}
                  onClick={() => setActiveNav(id)}
                >
                  {label}
                </a>
              </li>
            )
          })}
        </ul>

        {/* Right: label (desktop) + burger (mobile) */}
        <div className="flex items-center gap-xs">
          <div className="hidden md:flex items-center gap-xs font-label-code text-label-code text-on-surface-variant">
            made with stitch.ai and AntiGravity
            <button className="ml-2 p-xs text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">terminal</span>
            </button>
          </div>
          {/* Burger button — mobile only */}
          <button
            id="burger-btn"
            aria-label="Toggle navigation menu"
            className="md:hidden p-xs text-on-surface-variant hover:text-primary transition-colors focus:outline-none"
            onClick={() => setMobileMenuOpen((o) => !o)}
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile menu drawer */}
      <div
        className="fixed top-0 left-0 w-full z-40 md:hidden overflow-hidden"
        style={{
          maxHeight: mobileMenuOpen ? '400px' : '0px',
          transition: 'max-height 0.45s cubic-bezier(0.25,1,0.5,1)',
        }}
      >
        <div
          className="w-full pt-[72px] pb-md px-grid-margin flex flex-col gap-xs"
          style={{
            background: isDark ? 'rgba(19,19,19,0.97)' : 'rgba(240,242,248,0.97)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
          }}
        >
          {NAV_LINKS.map(({ id, label }) => {
            const isActive = activeNav === id
            return (
              <a
                key={id}
                href={`#${id}`}
                className={`font-label-code text-label-code py-sm px-xs rounded-sm transition-all duration-200 block ${
                  isActive
                    ? isDark
                      ? 'bg-primary/15 text-primary font-bold'
                      : 'bg-primary/10 text-primary font-bold'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
                onClick={() => { setActiveNav(id); setMobileMenuOpen(false) }}
              >
                {label}
              </a>
            )
          })}
          <div className="mt-sm font-label-code text-[11px] text-on-surface-variant/50">
            made with stitch.ai and AntiGravity
          </div>
        </div>
      </div>

      {/* Tap-outside overlay to close mobile menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Side Navigation */}
      <aside className="fixed right-grid-margin top-1/2 -translate-y-1/2 z-40 flex flex-col gap-sm items-center bg-transparent transition-all duration-500 ease-in-out hidden xl:flex">
        {NAV_LINKS.map(({ id }) => (
          <a
            key={id}
            className={`nav-dot transition-all duration-300 ${
              activeNav === id
                ? 'text-primary scale-125 opacity-100'
                : 'text-outline-variant opacity-50 hover:text-primary hover:opacity-100'
            }`}
            href={`#${id}`}
            onClick={() => setActiveNav(id)}
          >
            <span className="material-symbols-outlined text-[12px]">radio_button_unchecked</span>
          </a>
        ))}
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

          {/* Profile image: bidirectional scroll-reveal + drop-shadow + scroll parallax (DOM-direct) */}
          <div
            ref={profileRef}
            className="w-full max-w-sm aspect-square z-10"
            style={{
              opacity: profileVisible ? 1 : 0,
              transition: 'opacity 0.85s cubic-bezier(0.25,1,0.5,1)',
            }}
          >
            <img
              ref={profileImgRef}
              alt="Profile"
              className="w-full h-full object-cover rounded-2xl grayscale hover:grayscale-0"
              src={profileImage}
              style={{
                willChange: 'transform, filter',
                transition: 'filter 1s ease 0.25s',
                filter: profileVisible
                  ? isDark
                    ? 'drop-shadow(0 30px 60px rgba(176,198,255,0.25)) drop-shadow(0 8px 24px rgba(0,0,0,0.75)) grayscale(1)'
                    : 'drop-shadow(0 30px 60px rgba(71,93,144,0.22)) drop-shadow(0 8px 24px rgba(71,93,144,0.18)) grayscale(1)'
                  : 'none',
              }}
            />
          </div>

          <div className="glass-panel p-lg w-full max-w-2xl text-center z-10 parallax-element scroll-fade">
            <h2 className="font-headline-lg text-[32px] font-bold text-on-surface mb-sm">Introduction</h2>
            <p className="font-body-md text-on-surface-variant leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            </p>
          </div>
        </section>

        {/* Work Experience Section — Carousel */}
        <section className="relative" id="work">
          <div className="mb-lg flex items-center gap-sm scroll-fade">
            <span className="material-symbols-outlined text-primary text-3xl">work</span>
            <h2 className="font-headline-lg text-[32px] font-bold tracking-wide">WORK EXPERIENCE</h2>
          </div>

          {/* Carousel wrapper with side nav buttons */}
          <div className="relative flex items-center gap-md">

            {/* Prev button — far left */}
            <button
              id="work-prev-btn"
              aria-label="Previous work experience"
              disabled={workAnimating}
              onClick={() => navigateWork('prev')}
              className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 disabled:opacity-30 ${
                isDark
                  ? 'border-outline-variant/50 text-on-surface-variant hover:border-primary hover:text-primary hover:bg-primary/10'
                  : 'border-outline/50 text-on-surface hover:border-primary hover:text-primary hover:bg-primary/10'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>

            {/* Card — centered, full width */}
            <div className="flex-1 relative overflow-hidden">
              <div
                className={`glass-panel p-0 overflow-hidden flex flex-col md:flex-row hover-glow transition-shadow duration-300 work-slide ${workSlideDir}`}
                style={{ minHeight: '340px' }}
              >
                {/* Image side */}
                <div className="md:w-5/12 aspect-[16/9] md:aspect-auto bg-surface-container-highest relative overflow-hidden">
                  <img
                    alt={exp.title}
                    className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-500"
                    src={exp.image}
                  />
                  <span className="absolute top-sm right-sm font-label-code text-on-surface-variant text-[10px] bg-surface/60 px-1 rounded">
                    {exp.id}
                  </span>
                </div>

                {/* Content side */}
                <div className="md:w-7/12 p-lg flex flex-col justify-center">
                  {/* Dot indicators */}
                  <div className="flex gap-1 mb-md">
                    {WORK_EXPERIENCES.map((_, i) => (
                      <div
                        key={i}
                        className={`h-[3px] rounded-full transition-all duration-300 ${
                          i === workIndex ? 'w-8 bg-primary' : 'w-3 bg-outline-variant/60'
                        }`}
                      />
                    ))}
                  </div>

                  <h3 className="font-headline-lg text-[28px] font-bold mb-sm">{exp.title}</h3>
                  <div className="flex gap-xs mb-md flex-wrap">
                    {exp.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-label-code text-[12px] border border-outline-variant/50 px-2 py-1 rounded text-on-surface-variant"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="font-body-md text-on-surface-variant">{exp.description}</p>

                  {/* Counter */}
                  <span className="mt-lg font-label-code text-[11px] text-on-surface-variant/60">
                    {workIndex + 1} / {WORK_EXPERIENCES.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Next button — far right */}
            <button
              id="work-next-btn"
              aria-label="Next work experience"
              disabled={workAnimating}
              onClick={() => navigateWork('next')}
              className="flex-shrink-0 w-10 h-10 rounded-full border border-primary flex items-center justify-center text-primary bg-primary/10 hover:bg-primary/25 transition-all duration-200 disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>

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

    </>
  )
}

export default App
