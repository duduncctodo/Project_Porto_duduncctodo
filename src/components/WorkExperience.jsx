import { useState } from 'react'
import { WORK_EXPERIENCES } from '../data'

// Work experience carousel — same recipe as the navbar's sliding pill: activeIndex
// is the only source of truth, each card's transform is derived from it, and a
// single CSS transition glides the change. No per-frame JS driving = no jank.
export default function WorkExperience({ isDark }) {
  const [activeIndex, setActiveIndex] = useState(0)

  const goTo = (index) => {
    if (index < 0 || index >= WORK_EXPERIENCES.length) return
    setActiveIndex(index)
  }

  const glassBg = isDark ? 'rgba(24,24,26,0.45)' : 'rgba(255,255,255,0.55)'
  const glassBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)'
  const glassShadow = isDark
    ? 'inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.35), 0 8px 32px rgba(0,0,0,0.35)'
    : 'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(31,41,71,0.04), 0 8px 32px rgba(31,41,71,0.14)'

  return (
    <section className="relative" id="work">
      <div className="mb-lg flex items-center gap-sm scroll-fade">
        <span className="material-symbols-outlined text-primary text-3xl">work</span>
        <h2 className="font-headline-lg text-[32px] font-bold tracking-wide">WORK EXPERIENCE</h2>
      </div>

      <div className="relative flex items-center gap-md">
        <button
          id="work-prev-btn"
          aria-label="Previous work experience"
          disabled={activeIndex === 0}
          onClick={() => goTo(activeIndex - 1)}
          className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 disabled:opacity-30 ${
            isDark
              ? 'border-outline-variant/50 text-on-surface-variant hover:border-primary hover:text-primary hover:bg-primary/10'
              : 'border-outline/50 text-on-surface hover:border-primary hover:text-primary hover:bg-primary/10'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>

        <div className="work-stage flex-1 relative overflow-hidden" style={{ height: '420px' }}>
          {WORK_EXPERIENCES.map((exp, i) => {
            const slot = i - activeIndex
            const abs = Math.abs(slot)
            const isActive = slot === 0
            return (
              <div
                key={exp.id}
                className="work-card liquid-glass absolute top-1/2 left-1/2 h-full [--card-w:78%] sm:[--card-w:66%] md:[--card-w:48%] flex flex-col"
                style={{
                  '--slot': slot,
                  transform: `translate(calc(-50% + var(--slot) * (var(--card-w) + 24px)), -50%) scale(${isActive ? 1 : 0.8})`,
                  opacity: abs > 1 ? 0 : isActive ? 1 : 0.4,
                  zIndex: 10 - abs,
                  pointerEvents: isActive ? 'auto' : 'none',
                  background: glassBg,
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: `1px solid ${glassBorder}`,
                  boxShadow: glassShadow,
                  borderRadius: '20px',
                }}
              >
                <div className="h-[190px] shrink-0 bg-surface-container-highest relative overflow-hidden rounded-t-[20px]">
                  <img alt={exp.title} className="w-full h-full object-cover" src={exp.image} />
                  <span className="absolute top-sm right-sm font-label-code text-on-surface-variant text-[10px] bg-surface/60 px-1 rounded">
                    {exp.id}
                  </span>
                </div>

                <div className="p-md md:p-lg flex flex-col justify-center flex-1 overflow-hidden">
                  <h3 className="font-headline-lg text-[20px] md:text-[24px] font-bold mb-xs md:mb-sm">
                    {exp.title}
                  </h3>
                  <div className={`flex gap-xs mb-sm flex-wrap ${isActive ? '' : 'hidden md:flex'}`}>
                    {exp.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-label-code text-[11px] border border-outline-variant/50 px-2 py-1 rounded text-on-surface-variant"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p
                    className={`font-body-md text-on-surface-variant text-sm ${
                      isActive ? 'line-clamp-4' : 'line-clamp-2'
                    }`}
                  >
                    {exp.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <button
          id="work-next-btn"
          aria-label="Next work experience"
          disabled={activeIndex === WORK_EXPERIENCES.length - 1}
          onClick={() => goTo(activeIndex + 1)}
          className="flex-shrink-0 w-10 h-10 rounded-full border border-primary flex items-center justify-center text-primary bg-primary/10 hover:bg-primary/25 transition-all duration-200 disabled:opacity-30"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
      </div>

      <div className="flex justify-center gap-1 mt-md">
        {WORK_EXPERIENCES.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to work experience ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-[3px] rounded-full transition-all duration-300 ${
              i === activeIndex ? 'w-8 bg-primary' : 'w-3 bg-outline-variant/60'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
