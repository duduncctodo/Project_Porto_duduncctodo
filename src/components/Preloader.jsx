import { useEffect, useState } from 'react'
import { BOOT_TEXTS } from '../data'

// Typed boot log + progress bar, then reveals hero/canvas via onRevealed
export default function Preloader({ onRevealed }) {
  const [bootLines, setBootLines] = useState(['INITIALIZING SYSTEMS...'])
  const [progress, setProgress] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [removed, setRemoved] = useState(false)

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
          onRevealed(true)
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
  }, [onRevealed])

  if (removed) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[90] backdrop-blur-[40px] bg-surface-dim/70 transition-all duration-[2000ms] ease-in-out pointer-events-none"
        id="intro-blur-overlay"
        style={
          revealed
            ? { backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)', backgroundColor: 'rgba(19, 19, 19, 0)', opacity: 0 }
            : undefined
        }
      ></div>

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
    </>
  )
}
