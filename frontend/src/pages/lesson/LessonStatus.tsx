import type { LessonState } from '../../animation/useLesson'
import { Card } from '../../components/ui/Card'
import styles from './Lesson.module.css'

export function LessonStatus({ state }: { state: Exclude<LessonState, { status: 'ready' }> }) {
  if (state.status === 'loading') {
    return (
      <Card className={styles.status} aria-busy="true">
        <p>Working out the maths…</p>
      </Card>
    )
  }
  return (
    <div className={styles.error} role="alert">
      <strong>We couldn&apos;t load this lesson.</strong>
      <p>{state.message}</p>
    </div>
  )
}
