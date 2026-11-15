import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { AnimationControls } from '../../animation/player/AnimationControls'
import { usePlayback } from '../../animation/playback'
import { SutraStage } from '../../animation/stage/SutraStage'
import { useLesson } from '../../animation/useLesson'
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
import { useLiveCoach } from '../../services/LiveCoachContext'
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
  const { enabled: liveCoach, ask, busy, triggerEvent } = useLiveCoach()
  const [speed, setSpeed] = useState(1)
  const playback = usePlayback({ frameCount: timeline.frames.length, resetKey: timeline.key, speed: speed * settings.animationSpeed })
  const frame = timeline.frames[playback.index]
  const [override, setOverride] = useState<
    { index: number; text: string; mood: CoachMood; asks: number; isLive: boolean } | null
  >(null)
  const [coachError, setCoachError] = useState<string | null>(null)

  // Deterministic engine/frame caption — not an LLM reply.
  const stageCaption = frame.coach
  const shown =
    override && override.index === playback.index
      ? override
      : { text: stageCaption, mood: 'speaking' as CoachMood, isLive: false }

  useEffect(() => {
    if (!liveCoach) return
    void triggerEvent(
      `lesson_start:${sutraId}:${difficulty}:${exampleLabel}`,
      {
        message: `The learner just opened Theory for ${sutraName} (${difficulty}). Idea: ${idea}`,
        intent: 'lesson_start',
        context: {
          screen: 'theory',
          sutra_id: sutraId,
          difficulty,
          problem_label: exampleLabel,
        },
      },
      { debounceMs: 400 },
    ).then((reply) => {
      // Rishi's introduction belongs in the main bubble on the opening frame.
      if (reply?.isLive && reply.text) {
        setOverride({ index: 0, text: reply.text, mood: reply.mood, asks: 0, isLive: true })
      } else if (reply?.error) {
        setCoachError(`${reply.error} The lesson steps below still work.`)
      }
    })
    // Once per theory example open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sutraId, difficulty, exampleLabel, liveCoach])

  const theoryContext = {
    screen: 'theory' as const,
    sutra_id: sutraId,
    difficulty,
    problem_label: exampleLabel,
    frame_index: playback.index,
    frame_state: frame.state,
    step_title: frame.stepTitle,
  }

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
            <CharacterDialogue character="boy" demo={!shown.isLive}>
              {shown.text}
            </CharacterDialogue>
            {busy && (
              <p role="status" className={styles.coachStatus}>
                Rishi is thinking…
              </p>
            )}
            {coachError && (
              <p role="alert" style={{ color: 'var(--color-danger, #b00020)', fontSize: '0.9rem' }}>
                {coachError}
              </p>
            )}
            <div className={styles.coachActions}>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  const asks = override && override.index === playback.index ? override.asks + 1 : 1
                  setCoachError(null)
                  if (!liveCoach) {
                    setCoachError('Live coaching is disabled.')
                    return
                  }
                  void ask({
                    message: `Explain frame again. Stage caption: ${frame.coach}. State: ${frame.state}. Step why (reference): ${stepWhyFor(frame.stepTitle) ?? 'n/a'}`,
                    intent: 'explain_again',
                    context: theoryContext,
                  }).then((reply) => {
                    if (reply.error || !reply.isLive) {
                      setCoachError(reply.error ?? 'Rishi could not reply. Stage caption is still shown.')
                      return
                    }
                    setOverride({ index: playback.index, text: reply.text, mood: reply.mood, asks, isLive: true })
                  })
                }}
              >
                {busy ? 'Rishi is thinking…' : 'Explain again'}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setCoachError(null)
                  if (!liveCoach) {
                    setCoachError('Live coaching is disabled.')
                    return
                  }
                  void ask({
                    message: `Why does ${sutraName} work? Idea: ${idea}. Method why (reference): ${methodWhy ?? 'n/a'}`,
                    intent: 'why',
                    context: theoryContext,
                  }).then((reply) => {
                    if (reply.error || !reply.isLive) {
                      setCoachError(reply.error ?? 'Rishi could not reply.')
                      return
                    }
                    setOverride({ index: playback.index, text: reply.text, mood: reply.mood, asks: 0, isLive: true })
                  })
                }}
              >
                Why does this work?
              </Button>
            </div>
            {liveCoach && <LiveCoachAsk density="compact" context={theoryContext} />}
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
