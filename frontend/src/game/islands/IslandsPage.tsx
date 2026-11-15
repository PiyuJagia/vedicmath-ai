import { useEffect, useRef, useState } from 'react'
import { GameCoach } from './GameCoach'
import { Maximize } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { Breadcrumbs } from '../../components/layout/Breadcrumbs'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DifficultySelector } from '../../components/ui/DifficultySelector'
import { Pill } from '../../components/ui/Pill'
import { isGameUnlocked } from '../../services/progressModel'
import { useProgress } from '../../services/ProgressContext'
import { useSettings } from '../../services/SettingsContext'
import { loadStored, saveStored } from '../../services/storage'
import { DIFFICULTIES, DIFFICULTY_LABELS } from '../../types/learning'
import { islandLevel, isWorldCompletion, WORLD_NAMES, worldWins, type WorldWins } from './model'
import styles from './Islands.module.css'

export function IslandsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const difficulty = islandLevel(params.get('level'))
  const { progress } = useProgress()
  const { settings, reducedMotion } = useSettings()
  const unlocked = isGameUnlocked(progress, 'nikhilam', difficulty, settings.role === 'admin')
  const locked = DIFFICULTIES.filter((level) => !isGameUnlocked(progress, 'nikhilam', level, settings.role === 'admin'))
  const iframe = useRef<HTMLIFrameElement>(null)
  const frameContainer = useRef<HTMLDivElement>(null)
  const [wins, setWins] = useState<WorldWins>(() => loadStored<WorldWins>('islands-of-courage', {}))
  const [fullscreenError, setFullscreenError] = useState(false)

  useEffect(() => {
    saveStored('islands-of-courage', wins)
  }, [wins])

  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== iframe.current?.contentWindow || !unlocked) return
      if (event.data && typeof event.data === 'object' && 'type' in event.data && event.data.type === 'islands:exit') {
        navigate('/play')
        return
      }
      if (!isWorldCompletion(event.data, difficulty)) return
      setWins((current) => ({ ...current, [difficulty]: worldWins(current, difficulty) + 1 }))
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [difficulty, navigate, unlocked])

  const gameUrl = `/games/islands-of-courage/index.html?level=${difficulty}&motion=${reducedMotion ? 'off' : 'on'}`

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ label: 'Play to Win', to: '/play' }, { label: 'Islands of Courage' }]} />
      <div className={styles.heading}>
        <div>
          <h1>Islands of Courage</h1>
          <p>Three worlds. One brave explorer. Every Nikhilam step brings you closer.</p>
        </div>
        <Button to="/play" variant="secondary">Back to Play to Win</Button>
      </div>
      <div className={styles.controls}>
        <DifficultySelector
          value={difficulty}
          onChange={(level) => setParams({ level })}
          disabledLevels={locked}
        />
        <Pill tone="teal">{WORLD_NAMES[difficulty]}</Pill>
        {worldWins(wins, difficulty) > 0 && <Pill tone="gold">Badge earned · {WORLD_NAMES[difficulty]}</Pill>}
        {unlocked && (
          <Button
            variant="secondary"
            icon={<Maximize size={16} aria-hidden="true" />}
            onClick={() => {
              setFullscreenError(false)
              if (!frameContainer.current?.requestFullscreen) {
                setFullscreenError(true)
                return
              }
              void frameContainer.current.requestFullscreen().catch(() => setFullscreenError(true))
            }}
          >
            Full screen
          </Button>
        )}
      </div>
      {fullscreenError && <p role="status">Full screen is not available in this browser. You can keep playing below.</p>}
      {!unlocked ? (
        <Card padding="lg" className={styles.locked}>
          <h2>Practise Nikhilam {DIFFICULTY_LABELS[difficulty]} to open {WORLD_NAMES[difficulty]}</h2>
          <p>Pass this level in Practice with Coach, then come back for your adventure.</p>
          <Button to={`/sutras/nikhilam/practice?level=${difficulty}`}>Practise Nikhilam {DIFFICULTY_LABELS[difficulty]}</Button>
        </Card>
      ) : (
        <div ref={frameContainer} className={styles.frameContainer}>
          <GameCoach key={`coach-${difficulty}`} frame={iframe} difficulty={difficulty} />
          <iframe
            key={difficulty}
            ref={iframe}
            className={styles.frame}
            src={gameUrl}
            title={`Islands of Courage — ${WORLD_NAMES[difficulty]}`}
            allow="fullscreen"
            allowFullScreen
          />
        </div>
      )}
      {locked.length > 0 && (
        <p className={styles.note}>Pass each Nikhilam practice level to unlock its matching world. Game badges do not change your practice mastery.</p>
      )}
    </div>
  )
}
