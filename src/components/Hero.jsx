import { useEffect, useRef, useState } from 'react'
import profileImage from '../picture/profile.png'

// Hero heading + Intro section (profile image with scroll-reveal + parallax)
export default function Hero({ revealed, isDark }) {
  const [profileVisible, setProfileVisible] = useState(false)
  const profileRef = useRef(null)
  const profileImgRef = useRef(null) // direct DOM for parallax — no state re-render

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

  return (
    <>
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
    </>
  )
}
