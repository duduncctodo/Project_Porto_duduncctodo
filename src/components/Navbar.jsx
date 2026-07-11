import { useState } from 'react'
import { NAV_LINKS } from '../data'

// Top nav (theme toggle + links + burger), mobile drawer, and side nav dots
export default function Navbar({ isDark, setIsDark, activeNav, setActiveNav }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
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

        <div className="flex items-center gap-xs">
          <div className="hidden md:flex items-center gap-xs font-label-code text-label-code text-on-surface-variant">
            made with stitch.ai and AntiGravity
            <button className="ml-2 p-xs text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">terminal</span>
            </button>
          </div>
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

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

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
    </>
  )
}
