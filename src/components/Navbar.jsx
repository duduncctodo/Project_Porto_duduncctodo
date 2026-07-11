import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { NAV_LINKS } from '../data'

// Top nav (theme toggle + links + burger), mobile drawer, and side nav dots
export default function Navbar({ isDark, setIsDark, activeNav, setActiveNav }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const ulRef = useRef(null)
  const linkRefs = useRef({})
  const [indicator, setIndicator] = useState({ left: 0, top: 0, width: 0, height: 0, ready: false })

  // Apple-style condensing: the glass capsule tightens once content scrolls under it
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Sliding glass indicator: measure the active link and glide the pill to it
  useLayoutEffect(() => {
    const update = () => {
      const ul = ulRef.current
      const link = linkRefs.current[activeNav]
      if (!ul || !link) return
      const ulRect = ul.getBoundingClientRect()
      const linkRect = link.getBoundingClientRect()
      setIndicator({
        left: linkRect.left - ulRect.left,
        top: linkRect.top - ulRect.top,
        width: linkRect.width,
        height: linkRect.height,
        ready: true,
      })
    }
    update()
    window.addEventListener('resize', update)
    // JetBrains Mono loads async (font-display: swap) — fallback-font text width
    // differs from the real font, so remeasure once the webfont swap settles.
    document.fonts?.ready?.then(update)
    return () => window.removeEventListener('resize', update)
  }, [activeNav, scrolled])

  const glassBg = isDark ? 'rgba(24,24,26,0.45)' : 'rgba(255,255,255,0.55)'
  const glassBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)'
  const glassShadow = isDark
    ? 'inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.35), 0 8px 32px rgba(0,0,0,0.35)'
    : 'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(31,41,71,0.04), 0 8px 32px rgba(31,41,71,0.14)'
  const activePillBg = isDark ? 'rgba(217,226,255,0.22)' : 'rgba(255,255,255,0.75)'
  const activePillShadow = isDark
    ? 'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.2), 0 4px 16px rgba(217,226,255,0.15)'
    : 'inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(31,41,71,0.05), 0 4px 16px rgba(71,93,144,0.18)'

  return (
    <>
      <div
        className={`fixed inset-x-3 sm:inset-x-6 z-50 flex justify-center transition-all duration-500 ease-out ${
          scrolled ? 'top-2' : 'top-3 md:top-4'
        }`}
      >
        <nav
          className={`liquid-glass relative w-full max-w-6xl grid grid-cols-[1fr_auto_1fr] items-center rounded-full transition-all duration-500 ease-out ${
            scrolled ? 'px-md py-[6px]' : 'px-md py-xs'
          }`}
          id="top-nav"
          style={{
            background: glassBg,
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: `1px solid ${glassBorder}`,
            boxShadow: glassShadow,
          }}
        >
          <div
            className="liquid-glass justify-self-start flex items-center gap-xs font-label-code text-label-code rounded-full px-[6px] py-[3px]"
            style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)' }}
          >
            <span className={`material-symbols-outlined text-[16px] transition-colors ${isDark ? 'text-on-surface-variant/60' : 'text-amber-500'}`}>light_mode</span>
            <button
              id="theme-toggle"
              aria-label="Toggle dark/light mode"
              className={`relative w-10 h-5 rounded-full border transition-colors duration-300 focus:outline-none ${
                isDark ? 'bg-primary/20 border-primary/30' : 'bg-amber-100 border-amber-300'
              }`}
              onClick={() => setIsDark((d) => !d)}
            >
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-md transition-[left] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  isDark ? 'left-[20px] bg-primary' : 'left-[2px] bg-amber-400'
                }`}
              />
            </button>
            <span className={`material-symbols-outlined text-[16px] transition-colors ${isDark ? 'text-primary' : 'text-on-surface-variant/60'}`}>dark_mode</span>
          </div>

          {/* Grid's middle 1fr/auto/1fr track keeps this centered without ever overlapping the side groups */}
          <ul
            ref={ulRef}
            className="hidden md:flex gap-[2px] items-center relative justify-self-center"
          >
            <div
              className="liquid-glass absolute rounded-full pointer-events-none transition-[transform,width,height] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{
                transform: `translate(${indicator.left}px, ${indicator.top}px)`,
                width: indicator.width,
                height: indicator.height,
                opacity: indicator.ready ? 1 : 0,
                background: activePillBg,
                border: `1px solid ${glassBorder}`,
                boxShadow: activePillShadow,
              }}
            />
            {NAV_LINKS.map(({ id, label }) => {
              const isActive = activeNav === id
              return (
                <li key={id} className="relative z-10">
                  <a
                    ref={(el) => { linkRefs.current[id] = el }}
                    className={`font-label-code text-label-code px-sm py-[7px] rounded-full transition-all duration-300 ease-out inline-block ${
                      isActive
                        ? 'text-primary font-bold -translate-y-[1px]'
                        : 'text-on-surface-variant hover:text-primary hover:-translate-y-[1px]'
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

          <div className="justify-self-end flex items-center gap-xs">
            <div className="hidden md:flex items-center gap-xs font-label-code text-[11px] whitespace-nowrap text-on-surface-variant">
              made with stitch.ai and AntiGravity
              <button className="ml-2 p-xs rounded-full text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all duration-200">
                <span className="material-symbols-outlined text-[18px]">terminal</span>
              </button>
            </div>
            <button
              id="burger-btn"
              aria-label="Toggle navigation menu"
              className="md:hidden p-xs rounded-full text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all duration-200 focus:outline-none"
              onClick={() => setMobileMenuOpen((o) => !o)}
            >
              <span className="material-symbols-outlined text-[24px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </nav>
      </div>

      <div
        className="liquid-glass fixed top-[68px] left-3 right-3 sm:left-6 sm:right-6 z-40 md:hidden overflow-hidden rounded-3xl origin-top"
        style={{
          maxHeight: mobileMenuOpen ? '400px' : '0px',
          opacity: mobileMenuOpen ? 1 : 0,
          transform: mobileMenuOpen ? 'scale(1)' : 'scale(0.96)',
          transition: 'max-height 0.45s cubic-bezier(0.25,1,0.5,1), opacity 0.3s ease, transform 0.45s cubic-bezier(0.25,1,0.5,1)',
          background: glassBg,
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: `1px solid ${glassBorder}`,
          boxShadow: glassShadow,
        }}
      >
        <div className="w-full py-md px-md flex flex-col gap-xs">
          {NAV_LINKS.map(({ id, label }) => {
            const isActive = activeNav === id
            return (
              <a
                key={id}
                href={`#${id}`}
                className={`font-label-code text-label-code py-sm px-sm rounded-full transition-all duration-200 block ${
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

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className="liquid-glass fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-sm items-center rounded-full px-[6px] py-sm transition-all duration-500 ease-in-out hidden xl:flex"
        style={{
          background: isDark ? 'rgba(24,24,26,0.35)' : 'rgba(255,255,255,0.45)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: `1px solid ${glassBorder}`,
        }}
      >
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
    </>
  )
}
