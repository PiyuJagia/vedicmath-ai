import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronRight, Flame, Lock, Star, Trophy } from 'lucide-react'
import { Link } from 'react-router'
import { CharacterOrchestrator } from '../characters/CharacterContext'
import { CharacterDialogue, HummingbirdCompanion } from '../characters/Characters'
import rocket from '../assets/rocket.svg'
import { LotusLogo } from '../components/brand/LotusLogo'
import { MasteryRings } from '../components/progress/MasteryRings'
import { ProgressRing } from '../components/progress/ProgressRing'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Pill } from '../components/ui/Pill'
import { SUTRAS, type SutraInfo } from '../content/sutras'
import { useLiveCoach } from '../services/LiveCoachContext'
import { countUnlocked, currentSutraIndex, masteryOf, passedAll, sutraStatus, type SutraStatus } from '../services/progressModel'
import { useProgress } from '../services/ProgressContext'
import { useSettings } from '../services/SettingsContext'
import styles from './Explore.module.css'

const STATUS_LABEL: Record<SutraStatus, string> = {
  mastered: 'Mastered',
  in_progress: 'In progress',
  available: 'Available',
  locked: 'Locked',
  coming_soon: 'Coming Soon',
}

export function ExplorePage() {
  const { progress } = useProgress()
  const { settings } = useSettings()
  const { enabled, triggerEvent } = useLiveCoach()
  const admin = settings.role === 'admin'
  const current = currentSutraIndex(SUTRAS, progress, admin)
  const mastered = SUTRAS.filter((sutra) => passedAll(masteryOf(progress, sutra.id))).length
  const unlocked = countUnlocked(SUTRAS, progress, admin)
  const fallback =
    current >= 0
      ? `Welcome back! ${SUTRAS[current].name} is ready for you.`
      : 'Your journey is ready to begin.'
  const [message, setMessage] = useState(fallback)
  const [messageLive, setMessageLive] = useState(false)

  useEffect(() => {
    setMessage(fallback)
    setMessageLive(false)
    if (!enabled || progress.isSample) return
    const sutraName = current >= 0 ? SUTRAS[current].name : 'the first Sutra'
    const note = `current_sutra=${sutraName}; unlocked=${unlocked}; mastered=${mastered}; sample=${Boolean(progress.isSample)}`
    void triggerEvent(
      `explore-welcome-${sutraName}`,
      {
        message: `Brief Hummingbird welcome on Explore. Use only these facts: ${note}.`,
        intent: 'encourage',
        context: { screen: 'explore', progress_note: note, preferred_persona: 'hummingbird' },
      },
      { debounceMs: 400 },
    ).then((reply) => {
      if (reply?.isLive && reply.text) {
        setMessage(reply.text)
        setMessageLive(true)
      }
    })
  }, [current, enabled, fallback, mastered, progress.isSample, triggerEvent, unlocked])

  return (
    <CharacterOrchestrator screen="explore">
      <div className={styles.page}>
        <aside className={styles.side}>
          <p className={styles.eyebrow}>Explore</p>
          <h1>Your Journey Through 16 Sutras</h1>
          <p className={styles.lede}>Unlock each Sutra, learn its magic, and master Vedic Mathematics!</p>
          <Card padding="lg" className={styles.progressCard}>
            <h2>Your Progress</h2>
            <ProgressRing value={unlocked} total={SUTRAS.length} unit="Sutras" size={130} />
            <ul className={styles.stats}>
              <li>
                <Trophy size={20} className={styles.gold} aria-hidden="true" /> {progress.explored.length} Explored
              </li>
              <li>
                <Star size={20} className={styles.gold} aria-hidden="true" /> {mastered} Mastered
              </li>
              <li>
                <Flame size={20} className={styles.flame} aria-hidden="true" /> {progress.streakDays}-Day Streak
              </li>
            </ul>
            {progress.isSample && <Pill tone="neutral">Sample progress</Pill>}
          </Card>
          <Link to="/progress" className={styles.keepGoing}>
            <LotusLogo size={30} className={styles.lotus} />
            <span>
              <strong>Keep going!</strong>
              <br />
              Unlock more Sutras to master Vedic Math.
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </aside>

        <section className={styles.journey} aria-labelledby="journey-title">
          <h2 id="journey-title" className="visually-hidden">
            Sutra journey, from the first Sutra at the bottom to the last at the top
          </h2>
          <div className={styles.top}>
            <img src={rocket} alt="" className={styles.rocket} />
            <div className={styles.birdMessage}>
              <HummingbirdCompanion size={70} />
              <CharacterDialogue character="hummingbird" tail="left" demo={!messageLive}>
                {message}
              </CharacterDialogue>
            </div>
          </div>
          <ol className={styles.path} reversed>
            {SUTRAS.map((sutra, index) => (
              <SutraNode
                key={sutra.id}
                sutra={sutra}
                status={sutraStatus(SUTRAS, index, progress, admin)}
                current={index === current}
                position={index + 1}
              />
            ))}
          </ol>
          <Button to="/" variant="secondary" icon={<ArrowLeft size={16} aria-hidden="true" />} iconPosition="start" className={styles.back}>
            Back to Home
          </Button>
        </section>
      </div>
    </CharacterOrchestrator>
  )
}

function SutraNode({ sutra, status, current, position }: { sutra: SutraInfo; status: SutraStatus; current: boolean; position: number }) {
  const { progress } = useProgress()
  const itemRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    // Start the journey at the learner's current Sutra rather than at the top.
    if (!current) return
    const frame = window.requestAnimationFrame(() => {
      const item = itemRef.current
      if (!item) return
      const box = item.getBoundingClientRect()
      window.scrollTo({ top: Math.max(0, window.scrollY + box.top - window.innerHeight / 2 + box.height / 2) })
    })
    return () => window.cancelAnimationFrame(frame)
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const mastery = masteryOf(progress, sutra.id)
  const open = status !== 'locked' && status !== 'coming_soon'
  const tipId = `tip-${sutra.id}`

  const body = (
    <>
      <span className={styles.node} data-status={status} data-current={current}>
        <MasteryRings subject={sutra.name} mastery={mastery} size={68}>
          {open ? (
            <span className={styles.symbol}>{sutra.symbol}</span>
          ) : (
            <Lock size={18} className={styles.lockIcon} aria-hidden="true" />
          )}
        </MasteryRings>
      </span>
      <span className={styles.label}>
        <span className={styles.name}>{sutra.name}</span>
        <span className={styles.short}>{sutra.short}</span>
        <span className={styles.pills}>
          {current && <Pill tone="lavender">Current</Pill>}
          <Pill tone={status === 'mastered' ? 'teal' : status === 'locked' || status === 'coming_soon' ? 'locked' : 'neutral'}>
            {STATUS_LABEL[status]}
          </Pill>
          {status === 'mastered' && <Trophy size={18} className={styles.gold} aria-label="Achievement earned" />}
        </span>
        <span id={tipId} role="tooltip" className={styles.tip}>
          {sutra.explanation}
        </span>
      </span>
    </>
  )

  return (
    <li className={styles.item} value={position} ref={itemRef}>
      {open ? (
        <Link to={`/sutras/${sutra.id}`} className={styles.row} aria-describedby={tipId}>
          {body}
        </Link>
      ) : (
        <button type="button" className={styles.row} aria-describedby={tipId} aria-disabled="true">
          {body}
        </button>
      )}
    </li>
  )
}
