import { useEffect, useState } from 'react'
import Lenis from 'lenis'
import { NAV_LINKS } from './data'
import BackgroundCanvas from './components/BackgroundCanvas'
import Preloader from './components/Preloader'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import WorkExperience from './components/WorkExperience'
import UniThings from './components/UniThings'
import Contact from './components/Contact'

function App() {
  const [revealed, setRevealed] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const [activeNav, setActiveNav] = useState('')

  // Theme toggle
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    document.body.style.backgroundColor = isDark ? '#131313' : '#f0f2f8'
  }, [isDark])

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

  return (
    <>
      <BackgroundCanvas revealed={revealed} />
      <Preloader onRevealed={setRevealed} />
      <Navbar isDark={isDark} setIsDark={setIsDark} activeNav={activeNav} setActiveNav={setActiveNav} />

      <main className="w-full max-w-7xl mx-auto px-sm md:px-grid-margin pb-xl">
        <Hero revealed={revealed} isDark={isDark} />
        <WorkExperience isDark={isDark} />
        <UniThings />
        <Contact />
      </main>
    </>
  )
}

export default App
