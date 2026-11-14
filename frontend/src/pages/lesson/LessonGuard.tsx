import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PlaceholderPage } from '../PlaceholderPage'
import type { SutraRoute } from './useSutraRoute'
import styles from './Lesson.module.css'

/** Shows a friendly message instead of a lesson that is unknown, locked or not built yet. */
export function LessonGuard({ route, children }: { route: SutraRoute; children: ReactNode }) {
  if (!route.sutra) {
    return <PlaceholderPage title="Sutra not found" description="We could not find that Sutra. Choose one from the journey." phase="Not found" />
  }
  if (!route.sutra.lessonId || !route.content) {
    return (
      <PlaceholderPage
        title={route.sutra.name}
        description={`${route.sutra.explanation} This Sutra's lessons are coming soon.`}
        phase="Coming soon"
        breadcrumbs={[{ label: 'Explore Sutras', to: '/explore' }, { label: route.sutra.name }]}
      />
    )
  }
  if (route.status === 'locked') {
    return (
      <Card padding="lg" className={styles.locked}>
        <Lock size={28} aria-hidden="true" />
        <h1>{route.sutra.name} is locked</h1>
        <p>Pass at least one level of the Sutra before it on your journey to unlock this one.</p>
        <Button to="/explore">Back to the journey</Button>
      </Card>
    )
  }
  return <>{children}</>
}
