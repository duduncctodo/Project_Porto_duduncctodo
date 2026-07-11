import { useCallback, useState } from 'react'
import { WORK_EXPERIENCES } from '../data'

// Work experience carousel — fully self-contained (own index/animation state)
export default function WorkExperience({ isDark }) {
  const [workIndex, setWorkIndex] = useState(0)
  const [workSlideDir, setWorkSlideDir] = useState('')
  const [workAnimating, setWorkAnimating] = useState(false)

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
    <section className="relative" id="work">
      <div className="mb-lg flex items-center gap-sm scroll-fade">
        <span className="material-symbols-outlined text-primary text-3xl">work</span>
        <h2 className="font-headline-lg text-[32px] font-bold tracking-wide">WORK EXPERIENCE</h2>
      </div>

      <div className="relative flex items-center gap-md">
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

        <div className="flex-1 relative overflow-hidden">
          <div
            className={`glass-panel p-0 overflow-hidden flex flex-col md:flex-row hover-glow transition-shadow duration-300 work-slide ${workSlideDir}`}
            style={{ minHeight: '340px' }}
          >
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

            <div className="md:w-7/12 p-lg flex flex-col justify-center">
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

              <span className="mt-lg font-label-code text-[11px] text-on-surface-variant/60">
                {workIndex + 1} / {WORK_EXPERIENCES.length}
              </span>
            </div>
          </div>
        </div>

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
  )
}
