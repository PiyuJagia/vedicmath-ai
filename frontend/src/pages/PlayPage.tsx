import { useState } from 'react'
import { Lock, Map, Rocket, Search } from 'lucide-react'
import { CharacterOrchestrator } from '../characters/CharacterContext'
import { CharacterDialogue, HummingbirdCompanion, RabbitAssistant } from '../characters/Characters'
import { Card } from '../components/ui/Card'
import { DifficultySelector } from '../components/ui/DifficultySelector'
import { Pill } from '../components/ui/Pill'
import { SUTRAS } from '../content/sutras'
import { isGameUnlocked } from '../services/progressModel'
import { useProgress } from '../services/ProgressContext'
import { useSettings } from '../services/SettingsContext'
import { DIFFICULTY_LABELS, type Difficulty } from '../types/learning'
import styles from './Play.module.css'

const GAMES = [
  { id: 'rocket', name: 'Number Rocket', text: 'Solve problems to lift your rocket higher.', Icon: Rocket },
  { id: 'treasure', name: 'Treasure Trail', text: 'Solve puzzles to reveal the map.', Icon: Map },
  { id: 'detective', name: 'Math Detective', text: 'Spot the mistake and fix it.', Icon: Search },
] as const

const PLAYABLE = SUTRAS.filter((sutra) => sutra.lessonId)

export function PlayPage() {
  const { progress } = useProgress()
  const { settings } = useSettings()
  const [sutraId, setSutraId] = useState(PLAYABLE[0].id)
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const sutra = PLAYABLE.find((item) => item.id === sutraId) ?? PLAYABLE[0]
  const unlocked = isGameUnlocked(progress, sutra.id, difficulty, settings.role === 'admin')

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
            <CharacterDialogue character="hummingbird" tail="left">
              {unlocked
                ? `${sutra.name} ${DIFFICULTY_LABELS[difficulty]} games are unlocked. Great practising!`
                : `Pass ${sutra.name} ${DIFFICULTY_LABELS[difficulty]} practice to unlock these games.`}
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
            <Card key={id} padding="lg" className={styles.game} data-locked={!unlocked}>
              <div className={styles.art} aria-hidden="true">
                <Icon size={64} strokeWidth={1.25} />
              </div>
              <h2>{name}</h2>
              <p>{text}</p>
              {unlocked ? (
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
            Games will use maths from the Python engine. Until those game endpoints exist, this page shows previews and unlock status.
          </p>
        </div>
      </div>
    </CharacterOrchestrator>
  )
}
