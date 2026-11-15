import { useMemo, useState } from 'react'
import { AnimationControls } from '../../animation/player/AnimationControls'
import { StepList } from '../../animation/player/StepList'
import { usePlayback } from '../../animation/playback'
import { SutraStage } from '../../animation/stage/SutraStage'
import type { Timeline } from '../../animation/types'
import { useLesson } from '../../animation/useLesson'
import type { Problem } from '../../api/types'
import { CharacterDialogue, CoachCharacter } from '../../characters/Characters'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Pill } from '../../components/ui/Pill'
import { LessonStatus } from '../../pages/lesson/LessonStatus'
import { useSettings } from '../../services/SettingsContext'
import type { LaunchRecord } from './model'
import { debriefOpening } from './voices'
import styles from './Rocket.module.css'

/**
 * The coach replays a launch in the same player as Practice with Coach and
 * Let's Learn More: the Sutra stage, the step list and the controls. The
 * coach's words for each moment come from the lesson the engine built.
 */
export function Debrief({ record, onDone }: { record: LaunchRecord; onDone: () => void }) {
  const problem: Problem = useMemo(
    () => (record.facts.sutra === 'nikhilam' ? { a: record.facts.a, b: record.facts.b } : { number: record.facts.number }),
    [record],
  )
  const lesson = useLesson(record.sutra, problem, 'beginner')
  const slip = record.mistakes.includes('sign') ? 'sign slip' : record.mistakes.includes('missing_padding') ? 'missing zero' : record.hints ? `${record.hints} Rabbit ${record.hints === 1 ? 'hint' : 'hints'}` : 'clean launch'

  return (
    <div className={styles.debrief}>
      <div className={styles.launchHead}>
        <div>
          <span className={styles.eyebrow}>Coach debrief · the Practice with Coach player</span>
          <h2 className={styles.problem}>Replay: {record.label}</h2>
        </div>
        <Pill tone={record.clean ? 'teal' : 'gold'}>{slip}</Pill>
      </div>
      {lesson.status !== 'ready' ? (
        <LessonStatus state={lesson} />
      ) : (
        <DebriefPlayer key={lesson.timeline.key} timeline={lesson.timeline} opening={debriefOpening(record)} />
      )}
      <div className={styles.row}>
        <Button onClick={onDone}>Back to the launch bay</Button>
      </div>
    </div>
  )
}

function DebriefPlayer({ timeline, opening }: { timeline: Timeline; opening: string }) {
  const { settings } = useSettings()
  const [speed, setSpeed] = useState(1)
  const playback = usePlayback({ frameCount: timeline.frames.length, resetKey: timeline.key, speed: speed * settings.animationSpeed })
  const frame = timeline.frames[playback.index]
  const line = playback.index === 0 ? `${opening} ${frame.coach}` : frame.coach

  return (
    <div className={styles.debriefGrid}>
      <Card padding="lg" className={styles.debriefStage}>
        <div className={styles.coachRow}>
          <CoachCharacter mood={playback.index === timeline.frames.length - 1 ? 'celebrating' : 'speaking'} size={96} />
          <CharacterDialogue character="boy">{line}</CharacterDialogue>
        </div>
        <SutraStage timeline={timeline} index={playback.index} speed={speed} />
        <AnimationControls timeline={timeline} playback={playback} speed={speed} onSpeedChange={setSpeed} />
      </Card>
      <Card padding="lg">
        <h3>{frame.stepTitle}</h3>
        <p className={styles.small} aria-live="polite">
          {frame.state}
        </p>
        <StepList timeline={timeline} index={playback.index} onSelect={playback.go} />
      </Card>
    </div>
  )
}
