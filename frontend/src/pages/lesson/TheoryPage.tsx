import { useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { AnimationControls } from '../../animation/player/AnimationControls'
import { usePlayback } from '../../animation/playback'
import { SutraStage } from '../../animation/stage/SutraStage'
import { useLesson } from '../../animation/useLesson'
import { isCoachHandoffEnabled } from '../../api/coachClient'
import { CharacterOrchestrator } from '../../characters/CharacterContext'
import { CharacterDialogue, CoachCharacter, type CoachMood } from '../../characters/Characters'
import { LiveCoachAsk } from '../../components/coach/LiveCoachAsk'
import { Breadcrumbs } from '../../components/layout/Breadcrumbs'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DifficultySelector } from '../../components/ui/DifficultySelector'
import { Pill } from '../../components/ui/Pill'
import { problemLabel } from '../../content/lessons'
import { METHOD_WHY, stepWhy } from '../../content/why'
import { demoCoach } from '../../services/coach'
import { useProgress } from '../../services/ProgressContext'
import { useSettings } from '../../services/SettingsContext'
import { DIFFICULTY_LABELS, type Difficulty } from '../../types/learning'
import { LessonGuard } from './LessonGuard'
import { LessonStatus } from './LessonStatus'
import { useSutraRoute } from './useSutraRoute'
import styles from './Lesson.module.css'

export function TheoryPage() {
  const route = useSutraRoute()
  const { sutra, content, difficulty, setDifficulty, levelQuery } = route
  const level = content?.levels[difficulty]
  const lesson = useLesson(sutra?.lessonId, level?.theoryExample ?? null, difficulty)
  const { recordVisit } = useProgress()

  useEffect(() => {
    if (sutra && route.status !== 'locked') recordVisit(sutra.id, difficulty, 'theory')
  }, [sutra, difficulty, route.status, recordVisit])

  return (
    <LessonGuard route={route}>
      {sutra && content && level && (
        <CharacterOrchestrator screen="theory">
          <div className={styles.page}>
            <Breadcrumbs
              items={[
                { label: 'Explore Sutras', to: '/explore' },
                { label: sutra.name, to: `/sutras/${sutra.id}${levelQuery}` },
                { label: 'Theory' },
              ]}
            />
            <div className={styles.header}>
              <h1>Theory</h1>
              <Pill tone="lavender">{DIFFICULTY_LABELS[difficulty]}</Pill>
              {sutra.conceptDifficulty !== undefined && <Pill tone="gold">Concept difficulty {sutra.conceptDifficulty} / 10</Pill>}
              <DifficultySelector value={difficulty} onChange={setDifficulty} />
            </div>

            {lesson.status !== 'ready' ? (
              <LessonStatus state={lesson} />
            ) : (
              <TheoryBody
                key={lesson.timeline.key}
                idea={level.idea}
                sutraId={sutra.id}
                methodWhy={sutra.lessonId ? METHOD_WHY[sutra.lessonId][difficulty] : undefined}
                stepWhyFor={(title) => (sutra.lessonId ? stepWhy(sutra.lessonId, title) : undefined)}
                sutraName={sutra.name}
                difficulty={difficulty}
                timeline={lesson.timeline}
                exampleLabel={problemLabel(level.theoryExample)}
                version={content.version}
                approved={content.approved}
              />
            )}

            <div className={styles.footer}>
              <Button to={`/sutras/${sutra.id}/learn${levelQuery}`} icon={<ArrowRight size={16} aria-hidden="true" />}>
                Next: Let&apos;s Learn More
              </Button>
            </div>
          </div>
        </CharacterOrchestrator>
      )}
    </LessonGuard>
  )
}

function TheoryBody({
  idea,
  sutraId,
  methodWhy,
  stepWhyFor,
  sutraName,
  difficulty,
  timeline,
  exampleLabel,
  version,
  approved,
}: {
  idea: string
  sutraId: string
  methodWhy?: string
  stepWhyFor: (stepTitle: string) => string | undefined
  sutraName: string
  difficulty: Difficulty
  timeline: import('../../animation/types').Timeline
  exampleLabel: string
  version: string
  approved: boolean
}) {
  const { settings } = useSettings()
  const liveCoach = isCoachHandoffEnabled(settings.role)
  const [speed, setSpeed] = useState(1)
  const playback = usePlayback({ frameCount: timeline.frames.length, resetKey: timeline.key, speed: speed * settings.animationSpeed })
  const frame = timeline.frames[playback.index]
  const [override, setOverride] = useState<{ index: number; text: string; mood: CoachMood; asks: number } | null>(null)

  const coachLine = useMemo(() => demoCoach.respond({ intent: 'explain', mode: 'theory', frameLine: frame.coach }), [frame.coach])
  const shown = override && override.index === playback.index ? override : { text: coachLine.text, mood: coachLine.mood }

  return (
    <div className={styles.theory}>
      <div className={styles.theoryLeft}>
        <Card padding="lg" className={styles.idea}>
          <h2>The idea</h2>
          <p>{idea}</p>
        </Card>
        <div className={styles.coachRow}>
          <CoachCharacter mood={playback.playing ? 'speaking' : shown.mood} size={180} />
          <div>
            <CharacterDialogue character="boy" demo>
              {shown.text}
            </CharacterDialogue>
            <div className={styles.coachActions}>
              <Button
                variant="secondary"
                onClick={() => {
                  const asks = override && override.index === playback.index ? override.asks + 1 : 1
                  const reply = demoCoach.respond({
                    intent: 'explain_again',
                    mode: 'theory',
                    frameLine: frame.coach,
                    frameState: frame.state,
                    stepWhy: stepWhyFor(frame.stepTitle),
                    explainCount: asks,
                  })
                  setOverride({ index: playback.index, text: reply.text, mood: reply.mood, asks })
                }}
              >
                Explain again
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const reply = demoCoach.respond({ intent: 'why', mode: 'theory', idea, sutraName, methodWhy })
                  setOverride({ index: playback.index, text: reply.text, mood: reply.mood, asks: 0 })
                }}
              >
                Why does this work?
              </Button>
            </div>
            {liveCoach && (
              <LiveCoachAsk
                density="compact"
                context={{
                  screen: 'theory',
                  sutra_id: sutraId,
                  difficulty,
                  problem_label: exampleLabel,
                  frame_index: playback.index,
                  frame_state: frame.state,
                  step_title: frame.stepTitle,
                }}
              />
            )}
          </div>
        </div>
      </div>

      <Card padding="lg" className={styles.example}>
        <h2>Example: {exampleLabel}</h2>
        <SutraStage timeline={timeline} index={playback.index} speed={speed} />
        <p className={styles.stateText} aria-live="polite">
          <strong>{frame.stepTitle}.</strong> {frame.state}
        </p>
        <AnimationControls timeline={timeline} playback={playback} speed={speed} onSpeedChange={setSpeed} />
        <Pill tone="neutral" className={styles.versionTag}>
          {approved ? 'Approved' : 'Draft'} content · version {version}
        </Pill>
      </Card>
    </div>
  )
}
