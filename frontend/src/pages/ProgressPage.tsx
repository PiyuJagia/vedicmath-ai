import { Check, Flame, Gamepad2, Lock, Trophy } from 'lucide-react'
import { CharacterOrchestrator } from '../characters/CharacterContext'
import { CharacterDialogue, HummingbirdCompanion } from '../characters/Characters'
import { LotusLogo } from '../components/brand/LotusLogo'
import { MasteryLegend, MasteryRings } from '../components/progress/MasteryRings'
import { ProgressRing } from '../components/progress/ProgressRing'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Pill } from '../components/ui/Pill'
import { SUTRAS, findSutra } from '../content/sutras'
import { learningSummary } from '../content/summary'
import { countPassedLevels, countUnlocked, currentSutraIndex, masteryOf, passedAny, sutraStatus } from '../services/progressModel'
import { useProgress } from '../services/ProgressContext'
import { useSettings } from '../services/SettingsContext'
import { DIFFICULTIES, DIFFICULTY_LABELS } from '../types/learning'
import styles from './Progress.module.css'

const SECTION_LABEL = { theory: 'Theory', learn: "Let's Learn More", practice: 'Practice with Coach' } as const

export function ProgressPage() {
  const { progress } = useProgress()
  const { settings } = useSettings()
  const admin = settings.role === 'admin'
  const lessonSutras = SUTRAS.filter((sutra) => sutra.lessonId)
  const current = currentSutraIndex(SUTRAS, progress, admin)
  const next = current >= 0 ? SUTRAS[current] : undefined
  const gamesUnlocked = lessonSutras.reduce(
    (total, sutra) => total + DIFFICULTIES.filter((level) => admin || masteryOf(progress, sutra.id)[level]).length,
    0,
  )

  const badges = [
    { id: 'first-pass', name: 'First level passed', earned: countPassedLevels(progress) > 0, Icon: Check },
    { id: 'explorer', name: 'Explored 3 Sutras', earned: progress.explored.length >= 3, Icon: LotusLogo },
    { id: 'streak', name: '5-day streak', earned: progress.streakDays >= 5, Icon: Flame },
    { id: 'master', name: 'Mastered a Sutra', earned: lessonSutras.some((sutra) => DIFFICULTIES.every((level) => masteryOf(progress, sutra.id)[level])), Icon: Trophy },
  ]

  return (
    <CharacterOrchestrator screen="progress">
      <div className={styles.page}>
        <div className={styles.heading}>
          <h1>My Progress</h1>
          {progress.isSample && <Pill tone="neutral">Sample data</Pill>}
          <div className={styles.bird}>
            <HummingbirdCompanion size={64} />
            <CharacterDialogue character="hummingbird" tail="left">
              {countPassedLevels(progress) > 0 ? `You have passed ${countPassedLevels(progress)} level${countPassedLevels(progress) === 1 ? '' : 's'}. Keep it up!` : 'Pass your first Practice to start collecting badges.'}
            </CharacterDialogue>
          </div>
        </div>

        <div className={styles.top}>
          <Card tone="lavender" padding="lg" className={styles.summary}>
            <h2>
              <LotusLogo size={24} /> Learning summary
            </h2>
            <p>{learningSummary(settings.displayName, progress, next?.name)}</p>
          </Card>
          <Card className={styles.stat}>
            <ProgressRing value={countUnlocked(SUTRAS, progress, admin)} total={SUTRAS.length} unit="" size={84} />
            <span>Sutras unlocked</span>
          </Card>
          <Card className={styles.stat}>
            <Trophy size={30} className={styles.gold} aria-hidden="true" />
            <strong>{progress.explored.length}</strong>
            <span>Sutras explored</span>
          </Card>
          <Card className={styles.stat}>
            <Flame size={30} className={styles.flame} aria-hidden="true" />
            <strong>{progress.streakDays}-Day</strong>
            <span>Streak</span>
          </Card>
          <Card className={styles.stat}>
            <Gamepad2 size={30} className={styles.purple} aria-hidden="true" />
            <strong>{gamesUnlocked}</strong>
            <span>Game levels unlocked</span>
          </Card>
        </div>

        <div className={styles.middle}>
          <Card padding="lg" className={styles.mastery}>
            <h2>Mastery</h2>
            <ul>
              {lessonSutras.map((sutra) => {
                const index = SUTRAS.indexOf(sutra)
                const status = sutraStatus(SUTRAS, index, progress, admin)
                return (
                  <li key={sutra.id}>
                    <MasteryRings subject={sutra.name} mastery={masteryOf(progress, sutra.id)} size={84}>
                      {status === 'locked' ? <Lock size={18} aria-hidden="true" /> : <span className={styles.symbol}>{sutra.symbol}</span>}
                    </MasteryRings>
                    <span>{sutra.name}</span>
                    <span className={styles.levels}>
                      {DIFFICULTIES.filter((level) => masteryOf(progress, sutra.id)[level]).map((level) => DIFFICULTY_LABELS[level]).join(', ') ||
                        (passedAny(masteryOf(progress, sutra.id)) ? '' : status === 'locked' ? 'Locked' : 'Not passed yet')}
                    </span>
                  </li>
                )
              })}
            </ul>
            <MasteryLegend />
          </Card>
          <Card padding="lg" className={styles.badges}>
            <h2>Badges</h2>
            <ul>
              {badges.map(({ id, name, earned, Icon }) => (
                <li key={id} data-earned={earned}>
                  <span className={styles.badge} aria-hidden="true">
                    <Icon size={28} />
                  </span>
                  <span>{name}</span>
                  <span className="visually-hidden">{earned ? 'earned' : 'not earned yet'}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className={styles.bottom}>
          <Card padding="lg" className={styles.recent}>
            <h2>Recent lessons</h2>
            {progress.history.length === 0 ? (
              <p className={styles.muted}>No lessons yet.</p>
            ) : (
              <ul>
                {progress.history.slice(0, 5).map((entry) => (
                  <li key={`${entry.at}-${entry.section}`}>
                    <Check size={16} className={styles.teal} aria-hidden="true" />
                    {findSutra(entry.sutraId)?.name} · {SECTION_LABEL[entry.section]} · {DIFFICULTY_LABELS[entry.difficulty]}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card tone="lavender" padding="lg" className={styles.next}>
            <h2>Recommended next</h2>
            {next ? (
              <>
                <p>
                  {next.name} · {DIFFICULTY_LABELS[DIFFICULTIES.find((level) => !masteryOf(progress, next.id)[level]) ?? 'beginner']}
                </p>
                <Button to={`/sutras/${next.id}?level=${DIFFICULTIES.find((level) => !masteryOf(progress, next.id)[level]) ?? 'beginner'}`}>
                  Continue
                </Button>
              </>
            ) : (
              <p>Every available Sutra is mastered. Wonderful!</p>
            )}
          </Card>
        </div>
      </div>
    </CharacterOrchestrator>
  )
}
