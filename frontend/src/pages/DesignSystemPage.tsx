import { useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Flame, Lock, MessageCircle, Play, Trophy, X } from 'lucide-react'
import { Breadcrumbs } from '../components/layout/Breadcrumbs'
import { MasteryLegend, MasteryRings } from '../components/progress/MasteryRings'
import { ProgressRing } from '../components/progress/ProgressRing'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { DifficultySelector } from '../components/ui/DifficultySelector'
import { Pill } from '../components/ui/Pill'
import type { Difficulty } from '../types/learning'
import styles from './DesignSystemPage.module.css'

const SWATCHES = [
  ['Navy', '--color-navy'],
  ['Ink', '--color-ink'],
  ['Muted', '--color-muted'],
  ['Purple', '--color-purple'],
  ['Lavender', '--color-lavender'],
  ['Lavender 100', '--color-lavender-100'],
  ['Teal', '--color-teal'],
  ['Teal 50', '--color-teal-50'],
  ['Gold', '--color-gold'],
  ['Amber (carry)', '--color-amber'],
  ['Pale blue', '--color-blue-50'],
  ['Locked', '--color-locked'],
] as const

export function DesignSystemPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <Pill tone="gold">Developer preview</Pill>
        <h1>Design system</h1>
        <p className={styles.lede}>
          Shared building blocks for every screen. Numbers shown here are sample data for review only.
        </p>
        <div className={styles.lede}>
          Tollgate 5B animation handoff harness:{' '}
          <Button to="/coach-handoff" variant="secondary" size="md">
            Open coach handoff
          </Button>
        </div>
      </div>

      <section className={styles.section} aria-labelledby="ds-colours">
        <h2 id="ds-colours">Colours</h2>
        <ul className={styles.swatches}>
          {SWATCHES.map(([name, token]) => (
            <li key={token}>
              <span className={styles.swatch} style={{ background: `var(${token})` }} aria-hidden="true" />
              <span className={styles.swatchName}>{name}</span>
              <code>{token}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="ds-type">
        <h2 id="ds-type">Typography</h2>
        <Card padding="lg" className={styles.typeCard}>
          <p className={styles.display}>Discover the Magic of Vedic Math!</p>
          <h1>Heading 1 · Your Journey Through 16 Sutras</h1>
          <h2>Heading 2 · Let&apos;s Learn More</h2>
          <h3>Heading 3 · Your Learning Journey</h3>
          <p>
            Body text. Learn clever number patterns, solve exciting puzzles, and discover fun new ways to work with
            numbers!
          </p>
          <p className={styles.numeralsSample}>
            <span className="numerals">98 × 97 = 9506</span>
          </p>
        </Card>
      </section>

      <section className={styles.section} aria-labelledby="ds-buttons">
        <h2 id="ds-buttons">Buttons and pills</h2>
        <div className={styles.row}>
          <Button size="lg" icon={<ArrowRight size={18} aria-hidden="true" />}>
            Explore Sutras
          </Button>
          <Button>Start</Button>
          <Button variant="secondary">Hint</Button>
          <Button variant="ghost" iconPosition="start" icon={<ArrowLeft size={16} aria-hidden="true" />}>
            Back to Home
          </Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className={styles.row}>
          <Pill tone="purple">Beginner</Pill>
          <Pill tone="lavender">Current</Pill>
          <Pill tone="teal">Unlocked</Pill>
          <Pill tone="gold">Concept difficulty 3 / 10</Pill>
          <Pill tone="neutral">Coming Soon</Pill>
          <Pill tone="locked" icon={<Lock size={12} aria-hidden="true" />}>
            Locked
          </Pill>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-controls">
        <h2 id="ds-controls">Difficulty selector and breadcrumbs</h2>
        <div className={styles.stack}>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
          <p className={styles.caption}>Selected: {difficulty}</p>
          <Breadcrumbs
            items={[
              { label: 'Explore Sutras', to: '/explore' },
              { label: 'Nikhilam', to: '/sutras/nikhilam' },
              { label: 'Theory' },
            ]}
          />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-progress">
        <h2 id="ds-progress">Progress</h2>
        <div className={styles.progressGrid}>
          <Card padding="lg" className={styles.journey}>
            <h3>Your Learning Journey</h3>
            <div className={styles.journeyRow}>
              <ProgressRing value={2} total={16} unit="Sutras" />
              <div className={styles.stat}>
                <Trophy size={26} className={styles.gold} aria-hidden="true" />
                <span className={styles.statValue}>2</span>
                <span className={styles.statLabel}>Sutras Explored</span>
              </div>
              <div className={styles.stat}>
                <Flame size={26} className={styles.gold} aria-hidden="true" />
                <span className={styles.statValue}>5-Day</span>
                <span className={styles.statLabel}>Streak</span>
              </div>
              <Card tone="lavender" className={styles.nextUp}>
                <span className={styles.statLabel}>Next Up</span>
                <span className={styles.nextName}>Urdhva Tiryagbhyam</span>
                <span className={styles.statLabel}>Multiply in a smart way!</span>
              </Card>
            </div>
          </Card>

          <Card padding="lg">
            <h3>Mastery rings</h3>
            <div className={styles.ringsRow}>
              <figure>
                <MasteryRings subject="Nikhilam" mastery={{ beginner: true, intermediate: true, advanced: true }}>
                  <X size={20} className={styles.teal} aria-hidden="true" />
                </MasteryRings>
                <figcaption>All passed</figcaption>
              </figure>
              <figure>
                <MasteryRings subject="Urdhva Tiryagbhyam" mastery={{ beginner: true, intermediate: false, advanced: false }} />
                <figcaption>Beginner passed</figcaption>
              </figure>
              <figure>
                <MasteryRings subject="Ekadhikena Purvena" mastery={{ beginner: false, intermediate: false, advanced: false }}>
                  <Lock size={18} className={styles.locked} aria-hidden="true" />
                </MasteryRings>
                <figcaption>None passed</figcaption>
              </figure>
              <figure>
                <MasteryRings subject="Example" size={132} mastery={{ beginner: true, intermediate: true, advanced: false }} />
                <figcaption>Large size</figcaption>
              </figure>
            </div>
            <MasteryLegend />
          </Card>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-cards">
        <h2 id="ds-cards">Cards</h2>
        <div className={styles.cardGrid}>
          {[
            { n: 1, title: 'Theory', text: 'Understand the idea', Icon: BookOpen },
            { n: 2, title: "Let's Learn More", text: 'Three animated examples', Icon: Play },
            { n: 3, title: 'Practice with Coach', text: 'Try it yourself with hints', Icon: MessageCircle },
          ].map(({ n, title, text, Icon }) => (
            <Card key={n} padding="lg" className={styles.sectionCard}>
              <span className={styles.cardNumber}>{n}</span>
              <Icon size={34} strokeWidth={1.5} className={styles.purple} aria-hidden="true" />
              <h3>{title}</h3>
              <p className={styles.caption}>{text}</p>
              <Button>Start</Button>
            </Card>
          ))}
          <Card tone="lavender" padding="lg">
            <h3>Lavender card</h3>
            <p className={styles.caption}>Used for summaries and the Next Up panel.</p>
          </Card>
          <Card tone="blue" padding="lg">
            <h3>Pale blue card</h3>
            <p className={styles.caption}>Used for mathematical working areas.</p>
          </Card>
        </div>
      </section>
    </div>
  )
}
