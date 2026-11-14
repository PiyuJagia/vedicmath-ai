import { Breadcrumbs, type Crumb } from '../components/layout/Breadcrumbs'
import { Card } from '../components/ui/Card'
import { Pill } from '../components/ui/Pill'
import styles from './PlaceholderPage.module.css'

interface PlaceholderPageProps {
  title: string
  description: string
  /** Which implementation phase builds this screen. */
  phase: string
  breadcrumbs?: Crumb[]
}

export function PlaceholderPage({ title, description, phase, breadcrumbs }: PlaceholderPageProps) {
  return (
    <div className={styles.page}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className={styles.heading}>
        <h1>{title}</h1>
        <Pill tone="lavender">{phase}</Pill>
      </div>
      <Card tone="lavender" padding="lg">
        <p>{description}</p>
      </Card>
    </div>
  )
}
