import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Lightbulb } from 'lucide-react'
import { usePlayback } from '../../animation/playback'
import { SutraStage } from '../../animation/stage/SutraStage'
import type { Timeline } from '../../animation/types'
import { friendlyError, useLesson } from '../../animation/useLesson'
import { checkAnswer, fetchQuestions } from '../../api/client'
import type { Lesson, LessonSutraId, PracticeQuestion, Problem } from '../../api/types'
import { CharacterOrchestrator } from '../../characters/CharacterContext'
import { CharacterDialogue, CoachCharacter, HintBubble, HummingbirdCompanion, RabbitAssistant, type CoachMood } from '../../characters/Characters'
import { Breadcrumbs } from '../../components/layout/Breadcrumbs'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DifficultySelector } from '../../components/ui/DifficultySelector'
import { Pill } from '../../components/ui/Pill'
import { problemKey, problemLabel } from '../../content/lessons'
import { questionText } from '../../content/practice'
import { demoCoach } from '../../services/coach'
import { useProgress } from '../../services/ProgressContext'
import { useSettings } from '../../services/SettingsContext'
import { playCue } from '../../services/sound'
import { DIFFICULTY_LABELS, type Difficulty } from '../../types/learning'
import { LessonGuard } from '../lesson/LessonGuard'
import { LessonStatus } from '../lesson/LessonStatus'
import { useSutraRoute } from '../lesson/useSutraRoute'
import { HINT_LEVELS, nextHintLevel, rabbitShouldAppear, revealLimit } from './practiceLogic'
import styles from './Practice.module.css'

export function PracticePage() {
  const route = useSutraRoute()
  const { sutra, content, difficulty, setDifficulty, levelQuery } = route
  const level = content?.levels[difficulty]
  const [chosen, setChosen] = useState<{ difficulty: Difficulty; problem: Problem } | null>(null)
  const problem = chosen && chosen.difficulty === difficulty ? chosen.problem : (level?.suggestions[0] ?? null)
  const lesson = useLesson(sutra?.lessonId, problem, difficulty)
  const { recordVisit } = useProgress()

  useEffect(() => {
    if (sutra && route.status !== 'locked') recordVisit(sutra.id, difficulty, 'practice')
  }, [sutra, difficulty, route.status, recordVisit])

  const choose = (next: Problem) => setChosen({ difficulty, problem: next })

  return (
    <LessonGuard route={route}>
      {sutra?.lessonId && level && problem && (
        <CharacterOrchestrator screen="practice">
          <div className={styles.page}>
            <Breadcrumbs
              items={[
                { label: 'Explore Sutras', to: '/explore' },
                { label: sutra.name, to: `/sutras/${sutra.id}${levelQuery}` },
                { label: 'Practice with Coach' },
              ]}
            />
            <div className={styles.header}>
              <h1>Practice with Coach</h1>
              <Pill tone="purple">{DIFFICULTY_LABELS[difficulty]}</Pill>
              <DifficultySelector value={difficulty} onChange={setDifficulty} />
            </div>

            <div className={styles.layout}>
              <ProblemPicker sutra={sutra.lessonId} current={problem} onChoose={choose} />
              {lesson.status !== 'ready' ? (
                <div className={styles.workspaceSlot}>
                  <LessonStatus state={lesson} />
                </div>
              ) : (
                <PracticeSession
                  key={lesson.timeline.key}
                  sutraId={sutra.id}
                  lessonId={sutra.lessonId}
                  difficulty={difficulty}
                  problem={problem}
                  lesson={lesson.lesson}
                  timeline={lesson.timeline}
                />
              )}
              <Card padding="md" className={styles.suggestions} as="aside" aria-labelledby="try-these">
                <h2 id="try-these">Try these</h2>
                <ul>
                  {level.suggestions.map((suggestion) => (
                    <li key={problemKey(suggestion)}>
                      <button
                        type="button"
                        onClick={() => choose(suggestion)}
                        aria-pressed={problemKey(suggestion) === problemKey(problem)}
                      >
                        Try {problemLabel(suggestion)}
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </CharacterOrchestrator>
      )}
    </LessonGuard>
  )
}

/** Learners can type their own numbers; the backend decides whether they are supported. */
function ProblemPicker({ sutra, current, onChoose }: { sutra: LessonSutraId; current: Problem; onChoose: (problem: Problem) => void }) {
  const single = sutra === 'ekadhikena'
  const [first, setFirst] = useState(() => String('number' in current ? current.number : current.a))
  const [second, setSecond] = useState(() => ('number' in current ? '' : String(current.b)))
  const [error, setError] = useState<string | null>(null)
  const currentKey = problemKey(current)

  useEffect(() => {
    // Keep the boxes in step when a suggestion is chosen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFirst(String('number' in current ? current.number : current.a))
    setSecond('number' in current ? '' : String(current.b))
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const a = Number(first)
    const b = Number(second)
    if (!/^\d+$/.test(first.trim()) || (!single && !/^\d+$/.test(second.trim()))) {
      setError('Please enter whole numbers.')
      return
    }
    setError(null)
    onChoose(single ? { number: a } : { a, b })
  }

  return (
    <form className={styles.picker} onSubmit={submit} aria-label="Choose a problem">
      <label>
        <span className="visually-hidden">{single ? 'Number to square' : 'First number'}</span>
        <input value={first} onChange={(event) => setFirst(event.target.value)} inputMode="numeric" className={styles.numberInput} />
      </label>
      {single ? (
        <span className={styles.times} aria-hidden="true">
          ²
        </span>
      ) : (
        <>
          <span className={styles.times} aria-hidden="true">
            ×
          </span>
          <label>
            <span className="visually-hidden">Second number</span>
            <input value={second} onChange={(event) => setSecond(event.target.value)} inputMode="numeric" className={styles.numberInput} />
          </label>
        </>
      )}
      <Button type="submit">Go</Button>
      {error && (
        <p className={styles.pickerError} role="alert">
          {error}
        </p>
      )}
    </form>
  )
}

interface Feedback {
  text: string
  mood: CoachMood
}

function PracticeSession({
  sutraId,
  lessonId,
  difficulty,
  problem,
  lesson,
  timeline,
}: {
  sutraId: string
  lessonId: LessonSutraId
  difficulty: Difficulty
  problem: Problem
  lesson: Lesson
  timeline: Timeline
}) {
  const { settings } = useSettings()
  const { passLevel } = useProgress()
  const [questions, setQuestions] = useState<PracticeQuestion[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [current, setCurrent] = useState(0)
  const [answer, setAnswer] = useState('')
  const [attempts, setAttempts] = useState<Record<string, number>>({})
  const [wrong, setWrong] = useState<Record<string, number>>({})
  const [hintLevel, setHintLevel] = useState<Record<string, number>>({})
  const [hintOpen, setHintOpen] = useState(false)
  const [rabbitDismissed, setRabbitDismissed] = useState(false)
  const [idleSeconds, setIdleSeconds] = useState(0)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [checking, setChecking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    fetchQuestions(lessonId, problem, difficulty)
      .then((response) => !cancelled && setQuestions(response.questions))
      .catch((error: unknown) => !cancelled && setLoadError(friendlyError(error)))
    return () => {
      cancelled = true
    }
  }, [lessonId, problem, difficulty])

  const done = questions !== null && current >= questions.length
  const limit = questions ? revealLimit(timeline, questions, current) : 0
  const playback = usePlayback({
    frameCount: timeline.frames.length,
    resetKey: timeline.key,
    limit,
    dwellMs: 1800,
    speed: settings.animationSpeed,
  })

  const question = questions && !done ? questions[current] : null
  const text = useMemo(() => (question ? questionText(lesson, question) : null), [lesson, question])
  const key = question?.key ?? ''
  const level = hintLevel[key] ?? 0
  const rabbitVisible = !done && rabbitShouldAppear(wrong[key] ?? 0, idleSeconds, rabbitDismissed)

  useEffect(() => {
    if (done) return
    const timer = window.setInterval(() => setIdleSeconds((seconds) => seconds + 1), 1000)
    return () => window.clearInterval(timer)
  }, [done, current])

  useEffect(() => {
    if (done && questions) {
      passLevel(sutraId, difficulty)
      if (settings.soundEffects) playCue('celebrate')
      if (settings.petSounds) playCue('hummingbird')
    }
    // Only when the session finishes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  if (loadError) {
    return (
      <div className={styles.workspaceSlot}>
        <div className={styles.error} role="alert">
          {loadError}
        </div>
      </div>
    )
  }
  if (!questions) {
    return (
      <div className={styles.workspaceSlot}>
        <Card className={styles.loading}>Preparing your questions…</Card>
      </div>
    )
  }

  const showHint = () => {
    if (!question) return
    setHintLevel((levels) => ({ ...levels, [key]: nextHintLevel(levels[key] ?? 0) }))
    setHintOpen(true)
    if (settings.petSounds) playCue('hop')
  }

  const closeHint = () => {
    setHintOpen(false)
    setRabbitDismissed(true)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!question || checking) return
    if (answer.trim() === '') {
      setFeedback({ text: 'Type your answer first, then press Check.', mood: 'speaking' })
      return
    }
    setChecking(true)
    const attempt = (attempts[key] ?? 0) + 1
    setAttempts((all) => ({ ...all, [key]: attempt }))
    try {
      const check = await checkAnswer(lessonId, problem, difficulty, question.key, answer)
      const reply = demoCoach.respond({ intent: 'feedback', mode: 'practice', check, question, answer, attempts: attempt })
      if (check.status === 'correct') {
        if (settings.soundEffects) playCue('correct')
        setFeedback(reply)
        setAnswer('')
        setHintOpen(false)
        setRabbitDismissed(false)
        setIdleSeconds(0)
        setCurrent((index) => index + 1)
      } else {
        if (check.status === 'incorrect') {
          setWrong((all) => ({ ...all, [key]: (all[key] ?? 0) + 1 }))
          setRabbitDismissed(false)
          if (settings.soundEffects) playCue('try-again')
        }
        setFeedback(reply)
        inputRef.current?.focus()
      }
    } catch (error) {
      setFeedback({ text: friendlyError(error), mood: 'thinking' })
    } finally {
      setChecking(false)
    }
  }

  const coachText = done
    ? demoCoach.respond({ intent: 'complete', mode: 'practice', problemLabel: timeline.problemLabel }).text
    : feedback?.mood === 'celebrating' || !feedback
      ? `${feedback ? `${feedback.text} ` : ''}${text?.prompt ?? ''}`
      : feedback.text
  const coachMood: CoachMood = done ? 'celebrating' : checking ? 'thinking' : (feedback?.mood ?? 'listening')

  return (
    <>
      <Card padding="lg" className={styles.workspace}>
        <SutraStage timeline={timeline} index={playback.index} />
        <p className={styles.stepLine} aria-live="polite">
          {done ? (
            <>All steps solved: {timeline.frames[timeline.frames.length - 1].state}</>
          ) : (
            <>
              Step {timeline.steps.findIndex((step) => step.id === question?.step_id) + 1} of {timeline.steps.length}:{' '}
              {timeline.steps.find((step) => step.id === question?.step_id)?.title}
            </>
          )}
        </p>

        {!done && question && text && (
          <form className={styles.answerRow} onSubmit={submit}>
            <label htmlFor="practice-answer" className={styles.answerLabel}>
              {text.label}
            </label>
            <input
              id="practice-answer"
              ref={inputRef}
              value={answer}
              onChange={(event) => {
                setAnswer(event.target.value)
                setIdleSeconds(0)
              }}
              className={styles.answerInput}
              inputMode="text"
              autoComplete="off"
              aria-describedby="practice-prompt"
            />
            <Button type="submit" disabled={checking}>
              {checking ? 'Checking…' : 'Check'}
            </Button>
            <Button variant="secondary" onClick={showHint} disabled={level >= HINT_LEVELS && hintOpen} icon={<Lightbulb size={16} aria-hidden="true" />} iconPosition="start">
              Hint
            </Button>
          </form>
        )}

        {hintOpen && text && level > 0 && (
          <HintBubble level={level} total={HINT_LEVELS} onClose={closeHint}>
            {text.hints[level - 1]}
          </HintBubble>
        )}

        <ol className={styles.dots} aria-label={`Question ${Math.min(current + 1, questions.length)} of ${questions.length}`}>
          {questions.map((q, index) => (
            <li key={q.key} data-state={index < current ? 'done' : index === current ? 'current' : 'todo'}>
              <span className="visually-hidden">
                {questionText(lesson, q).label}: {index < current ? 'solved' : index === current ? 'current' : 'not yet'}
              </span>
            </li>
          ))}
        </ol>

        {done && (
          <div className={styles.complete}>
            <HummingbirdCompanion size={72} celebrating />
            <p>
              Level passed! {DIFFICULTY_LABELS[difficulty]} practice for this Sutra is complete, and its games are unlocked.
            </p>
          </div>
        )}
      </Card>

      <Card tone="lavender" padding="lg" className={styles.coachPanel}>
        <div id="practice-prompt">
          <CharacterDialogue character="boy" tail="bottom" demo>
            {coachText}
          </CharacterDialogue>
        </div>
        <div className={styles.coachStage}>
          <CoachCharacter mood={coachMood} size={220} />
          <RabbitAssistant state={rabbitVisible ? 'present' : 'hidden'} size={78} onSelect={showHint} label="Ask the rabbit for a hint" />
        </div>
        {!done && <p className={styles.hintNote}>Stuck? Tap the rabbit or press Hint. Hints get more detailed each time.</p>}
      </Card>
    </>
  )
}
