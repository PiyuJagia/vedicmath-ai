import { useEffect, useState } from 'react'
import { Lock, Map, Rocket, Search } from 'lucide-react'
import { CharacterOrchestrator } from '../characters/CharacterContext'
import { CharacterDialogue, HummingbirdCompanion, RabbitAssistant } from '../characters/Characters'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { DifficultySelector } from '../components/ui/DifficultySelector'
import { Pill } from '../components/ui/Pill'
import { SUTRAS } from '../content/sutras'
import { canFly, rocketAccess } from '../game/rocket/model'
import { useLiveCoach } from '../services/LiveCoachContext'
import { isGameUnlocked } from '../services/progressModel'
import { useProgress } from '../services/ProgressContext'
import { useSettings } from '../services/SettingsContext'
import { DIFFICULTY_LABELS, type Difficulty } from '../types/learning'
import styles from './Play.module.css'

const GAMES = [
  { id: 'rocket', name: 'Number Rocket', text: 'Solve problems to lift your rocket higher.', Icon: Rocket },
  { id: 'treasure', name: 'Islands of Courage', text: 'Cross the sea, brave the lava, and reach the sky with Nikhilam.', Icon: Map },
  { id: 'detective', name: 'Math Detective', text: 'Spot the mistake and fix it.', Icon: Search },
] as const

const PLAYABLE = SUTRAS.filter((sutra) => sutra.lessonId)

export function PlayPage() {
  const { progress } = useProgress()
  const { settings } = useSettings()
  const { enabled, triggerEvent } = useLiveCoach()
  const [sutraId, setSutraId] = useState(PLAYABLE[0].id)
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const sutra = PLAYABLE.find((item) => item.id === sutraId) ?? PLAYABLE[0]
  const unlocked = isGameUnlocked(progress, sutra.id, difficulty, settings.role === 'admin')
  const rocketOpen = canFly(rocketAccess(progress, settings.role === 'admin'))
  const islandsOpen = sutra.id === 'nikhilam' && unlocked
  const fallback = unlocked
    ? `${sutra.name} ${DIFFICULTY_LABELS[difficulty]} games are unlocked. Great practising!`
    : `Pass ${sutra.name} ${DIFFICULTY_LABELS[difficulty]} practice to unlock these games.`
  const [birdText, setBirdText] = useState(fallback)
  const [birdLive, setBirdLive] = useState(false)

  useEffect(() => {
    setBirdText(fallback)
    setBirdLive(false)
    if (!enabled) return
    const note = `sutra=${sutra.name}; difficulty=${difficulty}; games_unlocked=${unlocked}`
    void triggerEvent(
      `play-encourage-${sutra.id}-${difficulty}-${unlocked}`,
      {
        message: `Hummingbird line for Play to Win. Facts only: ${note}.`,
        intent: 'encourage',
        context: {
          screen: 'play',
          sutra_id: sutra.id,
          difficulty,
          progress_note: note,
          preferred_persona: 'hummingbird',
        },
      },
      { debounceMs: 500 },
    ).then((reply) => {
      if (reply?.isLive && reply.text) {
        setBirdText(reply.text)
        setBirdLive(true)
      }
    })
  }, [difficulty, enabled, fallback, sutra.id, sutra.name, triggerEvent, unlocked])

  return (
    <CharacterOrchestrator screen="play">
      <div className={styles.page}>
        <div className={styles.heading}>
          <div>
            <h1>Play to Win</h1>
            <p className={styles.lede}>Pass Practice with Coach to unlock each game.</p>
          </div>
          <div className={styles.bird}>
            <HummingbirdCompanion size={72} />
            <CharacterDialogue character="hummingbird" tail="left" demo={!birdLive}>
              {birdText}
            </CharacterDialogue>
          </div>
        </div>

        <div className={styles.filters}>
          <label className={styles.select}>
            <span className="visually-hidden">Sutra</span>
            <select value={sutraId} onChange={(event) => setSutraId(event.target.value)}>
              {PLAYABLE.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
        </div>

        <div className={styles.grid}>
          {GAMES.map(({ id, name, text, Icon }) => (
            <Card key={id} padding="lg" className={styles.game} data-locked={id === 'rocket' ? !rocketOpen : id === 'treasure' ? !islandsOpen : !unlocked}>
              <div className={styles.art} aria-hidden="true">
                <Icon size={64} strokeWidth={1.25} />
              </div>
              <h2>{name}</h2>
              <p>{text}</p>
              {id === 'rocket' ? (
                rocketOpen ? (
                  <div className={styles.status}>
                    <Pill tone="teal">Nikhilam and Ekadhikena · Beginner</Pill>
                    <Button to="/play/rocket">Play Number Rocket</Button>
                  </div>
                ) : (
                  <p className={styles.lock}>
                    <Lock size={18} aria-hidden="true" />
                    Pass Nikhilam Beginner practice, or open the Ekadhikena lessons, to fly
                  </p>
                )
              ) : id === 'treasure' ? (
                islandsOpen ? (
                  <div className={styles.status}>
                    <Pill tone="teal">Nikhilam · {DIFFICULTY_LABELS[difficulty]}</Pill>
                    <Button to={`/play/islands?level=${difficulty}`}>Play Islands of Courage</Button>
                  </div>
                ) : sutra.id !== 'nikhilam' ? (
                  <p className={styles.lock}>Choose Nikhilam above to explore Islands of Courage.</p>
                ) : (
                  <div className={styles.status}>
                    <p className={styles.lock}><Lock size={18} aria-hidden="true" />Pass Nikhilam {DIFFICULTY_LABELS[difficulty]} practice to unlock</p>
                    <Button variant="secondary" to={`/sutras/nikhilam/practice?level=${difficulty}`}>Practise Nikhilam</Button>
                  </div>
                )
              ) : unlocked ? (
                <div className={styles.status}>
                  <Pill tone="teal">Unlocked</Pill>
                  <Pill tone="neutral">Game coming soon</Pill>
                </div>
              ) : (
                <p className={styles.lock}>
                  <Lock size={18} aria-hidden="true" />
                  Pass {sutra.name} {DIFFICULTY_LABELS[difficulty]} practice to unlock
                </p>
              )}
            </Card>
          ))}
        </div>

        <div className={styles.footer}>
          <RabbitAssistant state="present" size={70} />
          <p className={styles.note}>
            Number Rocket is ready to fly. Islands of Courage turns Nikhilam steps into three adventures. Math Detective is coming soon.
          </p>
        </div>
      </div>
    </CharacterOrchestrator>
  )
}
