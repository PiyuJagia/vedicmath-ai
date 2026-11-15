import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import coachArt from '../../assets/characters/coach-boy.png'
import styles from './Rocket.module.css'

/**
 * After every second win the coach stops by. Message text is live Rishi when
 * LiveCoach is enabled; otherwise an engine-fact template (never labeled Live AI).
 */
export function CoachVisit({ message, onReplay, onClose }: { message: string; onReplay: () => void; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className={styles.coachPop} role="dialog" aria-modal="true" aria-labelledby="coach-visit-title">
      <div className={styles.coachCard}>
        <img src={coachArt} alt="The coach" className={styles.coachImg} />
        <div className={styles.coachBody}>
          <span className={styles.eyebrow} id="coach-visit-title">
            Two wins · the coach has something to say
          </span>
          <p className={styles.coachBubble}>
            <span className={styles.who}>Coach</span>
            {message}
          </p>
          <div className={styles.row}>
            <button type="button" className={styles.primaryBtn} onClick={onReplay}>
              Replay a launch with me
            </button>
            <button ref={closeRef} type="button" className={styles.ghostBtn} onClick={onClose}>
              Keep flying
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
