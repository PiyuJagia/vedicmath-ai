import { ArrowRight, BookOpen, ChevronRight, Flame, Trophy } from 'lucide-react'
import { Link } from 'react-router'
import { CharacterOrchestrator } from '../characters/CharacterContext'
import { CoachCharacter, HummingbirdCompanion } from '../characters/Characters'
import { LotusLogo } from '../components/brand/LotusLogo'
import { ProgressRing } from '../components/progress/ProgressRing'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Pill } from '../components/ui/Pill'
import { SUTRAS } from '../content/sutras'
import { countUnlocked, currentSutraIndex } from '../services/progressModel'
import { useProgress } from '../services/ProgressContext'
import { useSettings } from '../services/SettingsContext'
import styles from './Home.module.css'

export function HomePage() {
  const { progress } = useProgress()
  const { settings } = useSettings()
  const admin = settings.role === 'admin'
  const unlocked = countUnlocked(SUTRAS, progress, admin)
  const current = currentSutraIndex(SUTRAS, progress, admin)
  const next = current >= 0 ? SUTRAS[current] : undefined

  return (
    <CharacterOrchestrator screen="home">
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <div className={styles.ornament} aria-hidden="true">
              <span />
              <LotusLogo size={30} />
              <span />
            </div>
            <h1>Discover the Magic of Vedic Math!</h1>
            <p className={styles.intro}>
              Learn clever number patterns, solve exciting puzzles, and discover fun new ways to work with numbers!
            </p>
            <Button to="/explore" size="lg" icon={<ArrowRight size={18} aria-hidden="true" />}>
              Explore Sutras
            </Button>
          </div>
          <div className={styles.heroArt}>
            <HummingbirdCompanion size={88} className={styles.heroBird} />
            <CoachCharacter size={300} />
          </div>
        </section>

        <Card padding="lg" className={styles.journey} as="section" aria-labelledby="journey-heading">
          <div className={styles.journeyHeading}>
            <h2 id="journey-heading">Your Learning Journey</h2>
            {progress.isSample && <Pill tone="neutral">Sample progress</Pill>}
          </div>
          <div className={styles.journeyRow}>
            <ProgressRing value={unlocked} total={SUTRAS.length} unit="Sutras" size={120} />
            <div className={styles.stat}>
              <Trophy size={28} className={styles.gold} aria-hidden="true" />
              <span className={styles.statValue}>{progress.explored.length}</span>
              <span className={styles.statLabel}>Sutras Explored</span>
            </div>
            <div className={styles.stat}>
              <Flame size={28} className={styles.flame} aria-hidden="true" />
              <span className={styles.statValue}>{progress.streakDays}-Day</span>
              <span className={styles.statLabel}>Streak</span>
            </div>
            {next && (
              <Link to={`/sutras/${next.id}`} className={styles.nextUp}>
                <LotusLogo size={26} className={styles.nextLotus} />
                <span className={styles.statLabel}>Next Up</span>
                <span className={styles.nextName}>{next.name}</span>
                <span className={styles.statLabel}>{next.short}</span>
                <ChevronRight size={18} className={styles.nextChevron} aria-hidden="true" />
              </Link>
            )}
          </div>
        </Card>

        <div className={styles.shlokas}>
          <BookOpen size={22} aria-hidden="true" />
          <span>Learn Sanskrit Shlokas</span>
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.soon}>Coming Soon</span>
        </div>
      </div>
    </CharacterOrchestrator>
  )
}
