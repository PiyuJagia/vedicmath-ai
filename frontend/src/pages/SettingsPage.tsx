import { useId, type ReactNode } from 'react'
import { CharacterOrchestrator } from '../characters/CharacterContext'
import { HummingbirdCompanion } from '../characters/Characters'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Pill } from '../components/ui/Pill'
import { useProgress } from '../services/ProgressContext'
import { useSettings } from '../services/SettingsContext'
import { AVATAR_COLOURS, type Settings } from '../services/settingsModel'
import { playCue } from '../services/sound'
import styles from './Settings.module.css'

function Toggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (value: boolean) => void; description?: string }) {
  const id = useId()
  return (
    <div className={styles.toggleRow}>
      <label htmlFor={id}>
        {label}
        {description && <span className={styles.description}>{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={styles.switch}
        onClick={() => onChange(!checked)}
      >
        <span className="visually-hidden">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  )
}

function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  const name = useId()
  return (
    <fieldset className={styles.choice}>
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <label key={String(option.value)} data-checked={option.value === value}>
            <input type="radio" name={name} checked={option.value === value} onChange={() => onChange(option.value)} />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card padding="lg" as="section" aria-labelledby={id} className={styles.section}>
      <h2 id={id}>{title}</h2>
      {children}
    </Card>
  )
}

export function SettingsPage() {
  const { settings, update, reducedMotion } = useSettings()
  const { progress, reset } = useProgress()
  const set = <K extends keyof Settings>(key: K) => (value: Settings[K]) => update({ [key]: value } as Partial<Settings>)

  return (
    <CharacterOrchestrator screen="settings">
      <div className={styles.page}>
        <div className={styles.heading}>
          <h1>Settings</h1>
          <Pill tone="neutral">Saved in this browser for development</Pill>
        </div>

        <div className={styles.grid}>
          <Section id="settings-profile" title="Profile">
            <div className={styles.profile}>
              <span className={styles.avatar} style={{ background: AVATAR_COLOURS[settings.avatar] }} aria-hidden="true">
                {settings.displayName.charAt(0).toUpperCase() || '?'}
              </span>
              <label className={styles.field}>
                Display name
                <input value={settings.displayName} maxLength={20} onChange={(event) => update({ displayName: event.target.value })} />
              </label>
            </div>
            <p className={styles.description}>Use a nickname. No real personal information is collected.</p>
          </Section>

          <Section id="settings-avatar" title="Avatar">
            <div className={styles.avatars} role="radiogroup" aria-label="Avatar colour">
              {AVATAR_COLOURS.map((colour, index) => (
                <button
                  key={colour}
                  type="button"
                  role="radio"
                  aria-checked={settings.avatar === index}
                  aria-label={`Avatar ${index + 1}`}
                  style={{ background: colour }}
                  onClick={() => update({ avatar: index })}
                />
              ))}
            </div>
            <p className={styles.description}>Placeholder avatars until the final set is designed.</p>
          </Section>

          <Section id="settings-animation" title="Animation">
            <Choice
              label="Animation speed"
              value={settings.animationSpeed}
              onChange={set('animationSpeed')}
              options={[
                { value: 0.75, label: 'Slow' },
                { value: 1, label: 'Normal' },
                { value: 1.5, label: 'Fast' },
              ]}
            />
            <Choice
              label="Reduce motion"
              value={settings.reduceMotion}
              onChange={set('reduceMotion')}
              options={[
                { value: 'system', label: 'Follow my device' },
                { value: 'on', label: 'On' },
                { value: 'off', label: 'Off' },
              ]}
            />
            <p className={styles.description}>Motion is currently {reducedMotion ? 'reduced' : 'on'}.</p>
          </Section>

          <Section id="settings-sound" title="Sound">
            <Toggle
              label="Sound effects"
              description="A soft chime for correct answers."
              checked={settings.soundEffects}
              onChange={(value) => {
                update({ soundEffects: value })
                if (value) playCue('correct')
              }}
            />
            <Toggle
              label="Pet sounds"
              description="Little sounds when the rabbit hops or the hummingbird celebrates."
              checked={settings.petSounds}
              onChange={(value) => {
                update({ petSounds: value })
                if (value) playCue('hummingbird')
              }}
            />
          </Section>

          <Section id="settings-access" title="Accessibility">
            <Toggle label="Larger text" checked={settings.largerText} onChange={set('largerText')} />
            <Toggle label="Higher contrast" checked={settings.highContrast} onChange={set('highContrast')} />
          </Section>

          <Section id="settings-learning" title="Learning">
            <Choice
              label="Daily goal"
              value={settings.dailyGoal}
              onChange={set('dailyGoal')}
              options={[
                { value: 5, label: '5 min' },
                { value: 10, label: '10 min' },
                { value: 15, label: '15 min' },
              ]}
            />
          </Section>

          <Section id="settings-account" title="Account">
            <Choice
              label="Role (development only)"
              value={settings.role}
              onChange={set('role')}
              options={[
                { value: 'learner', label: 'Learner' },
                { value: 'admin', label: 'Admin: unlock everything' },
              ]}
            />
            <div className={styles.actions}>
              <Button variant="secondary" to="/onboarding">
                Switch profile
              </Button>
              <Button variant="secondary" onClick={() => reset('empty')}>
                Start fresh progress
              </Button>
              <Button variant="ghost" onClick={() => reset('sample')}>
                Restore sample progress
              </Button>
            </div>
            <p className={styles.description}>
              Progress is currently {progress.isSample ? 'the fictional sample' : 'your own activity in this browser'}. Real accounts and storage come later.
            </p>
          </Section>
        </div>
        <HummingbirdCompanion size={60} className={styles.bird} />
      </div>
    </CharacterOrchestrator>
  )
}
