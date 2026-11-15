import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { AnimationControls } from '../../animation/player/AnimationControls'
import { StepList } from '../../animation/player/StepList'
import { usePlayback } from '../../animation/playback'
import { SutraStage } from '../../animation/stage/SutraStage'
import type { Timeline } from '../../animation/types'
import { useLesson } from '../../animation/useLesson'
import { CharacterOrchestrator } from '../../characters/CharacterContext'
import { CharacterDialogue, HummingbirdCompanion, RabbitAssistant } from '../../characters/Characters'
import { LiveCoachAsk } from '../../components/coach/LiveCoachAsk'
import { useLiveCoach } from '../../services/LiveCoachContext'
import { Breadcrumbs } from '../../components/layout/Breadcrumbs'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DifficultySelector } from '../../components/ui/DifficultySelector'
import { Pill } from '../../components/ui/Pill'
import { problemLabel } from '../../content/lessons'
import { useProgress } from '../../services/ProgressContext'
import { useSettings } from '../../services/SettingsContext'
import { DIFFICULTY_LABELS } from '../../types/learning'
import { LessonGuard } from './LessonGuard'
import { LessonStatus } from './LessonStatus'
import { useSutraRoute } from './useSutraRoute'
import styles from './Lesson.module.css'

export function LearnMorePage() {
  const route = useSutraRoute()
  const { sutra, content, difficulty, setDifficulty, levelQuery } = route
  const level = content?.levels[difficulty]
  const [search] = useSearchParams()
  const [exampleIndex, setExampleIndex] = useState(() => Math.min(Math.max(Number(search.get('example')) - 1, 0) || 0, 2))
  const example = level ? level.learnMore[Math.min(exampleIndex, level.learnMore.length - 1)] : null
  const lesson = useLesson(sutra?.lessonId, example, difficulty)
  const { recordVisit } = useProgress()

  useEffect(() => {
    if (sutra && route.status !== 'locked') recordVisit(sutra.id, difficulty, 'learn')
  }, [sutra, difficulty, route.status, recordVisit])

  return (
    <LessonGuard route={route}>
      {sutra && level && (
        <CharacterOrchestrator screen="learn">
          <div className={styles.page}>
            <Breadcrumbs
              items={[
                { label: 'Explore Sutras', to: '/explore' },
                { label: sutra.name, to: `/sutras/${sutra.id}${levelQuery}` },
                { label: "Let's Learn More" },
              ]}
            />
            <div className={styles.header}>
              <h1>Let&apos;s Learn More</h1>
              <Pill tone="purple">{DIFFICULTY_LABELS[difficulty]}</Pill>
              <DifficultySelector value={difficulty} onChange={(next) => { setExampleIndex(0); setDifficulty(next) }} />
            </div>

            <div className={styles.tabs} role="tablist" aria-label="Examples">
              {level.learnMore.map((problem, index) => (
                <button
                  key={problemLabel(problem)}
                  type="button"
                  role="tab"
                  aria-selected={index === exampleIndex}
                  onClick={() => setExampleIndex(index)}
                >
                  Example {index + 1}
                  <span className="visually-hidden">: {problemLabel(problem)}</span>
                </button>
              ))}
            </div>

            {lesson.status !== 'ready' ? (
              <LessonStatus state={lesson} />
            ) : (
              <LearnMoreBody
                key={lesson.timeline.key}
                timeline={lesson.timeline}
                sutraId={sutra.id}
                difficulty={difficulty}
              />
            )}

            <div className={styles.footer}>
              <Button to={`/sutras/${sutra.id}/practice${levelQuery}`} icon={<ArrowRight size={16} aria-hidden="true" />}>
                Next: Practice with Coach
              </Button>
            </div>
          </div>
        </CharacterOrchestrator>
      )}
    </LessonGuard>
  )
}

function LearnMoreBody({
  timeline,
  sutraId,
  difficulty,
}: {
  timeline: Timeline
  sutraId: string
  difficulty: import('../../types/learning').Difficulty
}) {
  const { settings } = useSettings()
  const { enabled } = useLiveCoach()
  const [search] = useSearchParams()
  const [speed, setSpeed] = useState(1)
  const moment = Number(search.get('moment'))
  const playback = usePlayback({
    frameCount: timeline.frames.length,
    resetKey: timeline.key,
    speed: speed * settings.animationSpeed,
    startIndex: Number.isInteger(moment) && moment > 0 ? moment - 1 : 0,
  })
  const frame = timeline.frames[playback.index]
  const finished = playback.index === timeline.frames.length - 1

  return (
    <div className={styles.learn}>
      <Card padding="lg" className={styles.stageCard}>
        <div className={styles.stageHeading}>
          <span>{timeline.problemLabel}</span>
          <HummingbirdCompanion size={finished ? 72 : 56} celebrating={finished} />
        </div>
        <div className={styles.rabbitRow}>
          <RabbitAssistant state="present" size={84} hopIn={false} />
          {/* frame.rabbit is deterministic lesson copy, not an LLM reply */}
          <CharacterDialogue character="rabbit" demo>
            {frame.rabbit}
          </CharacterDialogue>
        </div>
        <SutraStage timeline={timeline} index={playback.index} speed={speed} />
        <AnimationControls timeline={timeline} playback={playback} speed={speed} onSpeedChange={setSpeed} />
        {enabled && (
          <LiveCoachAsk
            density="compact"
            context={{
              screen: 'learn',
              sutra_id: sutraId,
              difficulty,
              problem_label: timeline.problemLabel,
              frame_index: playback.index,
              frame_state: frame.state,
              step_title: frame.stepTitle,
            }}
          />
        )}
      </Card>

      <Card padding="lg" className={styles.explain}>
        <h2>{frame.stepTitle}</h2>
        <p className={styles.stateText} aria-live="polite">
          {frame.state}
        </p>
        <StepList timeline={timeline} index={playback.index} onSelect={playback.go} />
      </Card>
    </div>
  )
}
