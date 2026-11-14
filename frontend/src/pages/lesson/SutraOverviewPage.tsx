import { BookOpen, MessageCircle, Play } from 'lucide-react'
import { CharacterOrchestrator } from '../../characters/CharacterContext'
import { CoachCharacter, HummingbirdCompanion } from '../../characters/Characters'
import { Breadcrumbs } from '../../components/layout/Breadcrumbs'
import { MasteryLegend, MasteryRings } from '../../components/progress/MasteryRings'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DifficultySelector } from '../../components/ui/DifficultySelector'
import { Pill } from '../../components/ui/Pill'
import { masteryOf } from '../../services/progressModel'
import { useProgress } from '../../services/ProgressContext'
import { LessonGuard } from './LessonGuard'
import { useSutraRoute } from './useSutraRoute'
import styles from './Lesson.module.css'

export function SutraOverviewPage() {
  const route = useSutraRoute()
  const { progress } = useProgress()
  const { sutra, difficulty, setDifficulty, levelQuery } = route

  return (
    <LessonGuard route={route}>
      {sutra && (
        <CharacterOrchestrator screen="overview">
          <div className={styles.page}>
            <Breadcrumbs items={[{ label: 'Explore Sutras', to: '/explore' }, { label: sutra.name }]} />
            <div className={styles.overviewTop}>
              <div className={styles.overviewIntro}>
                <span className={styles.symbol} aria-hidden="true">
                  {sutra.symbol}
                </span>
                <h1>{sutra.name}</h1>
                {sutra.fullName !== sutra.name && <p className={styles.subtitle}>{sutra.fullName}</p>}
                <p>{sutra.explanation}</p>
                {sutra.conceptDifficulty !== undefined && (
                  <Pill tone="gold">Concept difficulty {sutra.conceptDifficulty} / 10 (draft)</Pill>
                )}
                <DifficultySelector value={difficulty} onChange={setDifficulty} />
              </div>
              <Card padding="lg" className={styles.progressCard}>
                <h2>Your Progress</h2>
                <MasteryRings subject={sutra.name} mastery={masteryOf(progress, sutra.id)} size={150} />
                <MasteryLegend />
                {progress.isSample && <Pill tone="neutral">Sample progress</Pill>}
              </Card>
            </div>

            <div className={styles.sections}>
              {[
                { n: 1, title: 'Theory', text: 'Understand the idea', Icon: BookOpen, to: `theory${levelQuery}` },
                { n: 2, title: "Let's Learn More", text: 'Three animated examples', Icon: Play, to: `learn${levelQuery}` },
                { n: 3, title: 'Practice with Coach', text: 'Try it yourself with hints', Icon: MessageCircle, to: `practice${levelQuery}` },
              ].map(({ n, title, text, Icon, to }) => (
                <Card key={n} padding="lg" className={styles.sectionCard}>
                  <span className={styles.sectionNumber} aria-hidden="true">
                    {n}
                  </span>
                  <Icon size={36} strokeWidth={1.5} className={styles.sectionIcon} aria-hidden="true" />
                  <h2>{title}</h2>
                  <p className={styles.muted}>{text}</p>
                  <Button to={`/sutras/${sutra.id}/${to}`}>
                    Start<span className="visually-hidden"> {title}</span>
                  </Button>
                </Card>
              ))}
              <div className={styles.overviewCoach}>
                <HummingbirdCompanion size={64} />
                <CoachCharacter size={200} />
              </div>
            </div>
          </div>
        </CharacterOrchestrator>
      )}
    </LessonGuard>
  )
}
