import { useState } from 'react'
import { ArrowRight, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router'
import { CharacterOrchestrator } from '../characters/CharacterContext'
import { CharacterDialogue, CoachCharacter, RabbitAssistant } from '../characters/Characters'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { demoCoach } from '../services/coach'
import { useSettings } from '../services/SettingsContext'
import { AVATAR_COLOURS, type Settings } from '../services/settingsModel'
import styles from './Onboarding.module.css'

const AGES = [7, 8, 9, 10, 11, 12]
const STYLES: { value: Settings['learningStyle']; label: string }[] = [
  { value: 'watch', label: 'Watch animations' },
  { value: 'try', label: 'Try it myself' },
  { value: 'play', label: 'Play games' },
]
const STEPS = 4

export function OnboardingPage() {
  const { settings, update } = useSettings()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [name, setName] = useState(settings.displayName)
  const [age, setAge] = useState<number | null>(settings.age)
  const [avatar, setAvatar] = useState(settings.avatar)
  const [learningStyle, setLearningStyle] = useState(settings.learningStyle)

  const coachText =
    step === 1
      ? demoCoach.respond({ intent: 'welcome', mode: 'onboarding' }).text
      : step === 2
        ? 'What should I call you? A nickname is perfect.'
        : step === 3
          ? 'Pick an avatar colour and tell me how you like to learn.'
          : `Wonderful, ${name || 'friend'}! Your journey starts with Nikhilam. We will climb the Sutras together.`

  const finish = () => {
    update({ displayName: name.trim() || 'Learner', age, avatar, learningStyle })
    navigate('/explore')
  }

  return (
    <CharacterOrchestrator screen="onboarding">
      <div className={styles.page}>
        <div className={styles.coach}>
          <CharacterDialogue character="boy" tail="bottom" demo>
            {coachText}
          </CharacterDialogue>
          <div className={styles.characters}>
            <CoachCharacter mood={step === STEPS ? 'celebrating' : 'speaking'} size={260} />
            <RabbitAssistant state="present" size={84} />
          </div>
        </div>

        <Card padding="lg" className={styles.card}>
          <div className={styles.progress}>
            <ol aria-hidden="true">
              {Array.from({ length: STEPS }, (_, index) => (
                <li key={index} data-done={index < step} />
              ))}
            </ol>
            <span>
              Step {step} of {STEPS}
            </span>
          </div>

          {step === 1 && (
            <div className={styles.body}>
              <h1>Welcome to VedicMath AI</h1>
              <p>You will discover 16 Vedic Sutras: clever patterns that make arithmetic quick and fun.</p>
              <ul className={styles.howTo}>
                <li>
                  <strong>Theory</strong> explains each idea.
                </li>
                <li>
                  <strong>Let&apos;s Learn More</strong> shows it step by step, with the rabbit pointing out what to watch.
                </li>
                <li>
                  <strong>Practice with Coach</strong> lets you try it yourself with hints.
                </li>
              </ul>
            </div>
          )}

          {step === 2 && (
            <div className={styles.body}>
              <h1>Let&apos;s set up your profile</h1>
              <label className={styles.field}>
                Display name
                <input value={name} maxLength={20} onChange={(event) => setName(event.target.value)} autoComplete="off" />
              </label>
              <fieldset className={styles.choices}>
                <legend>Age</legend>
                <div>
                  {AGES.map((value) => (
                    <label key={value} data-checked={age === value}>
                      <input type="radio" name="age" checked={age === value} onChange={() => setAge(value)} />
                      {value === 12 ? '12+' : value}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {step === 3 && (
            <div className={styles.body}>
              <h1>Make it yours</h1>
              <fieldset className={styles.choices}>
                <legend>Choose your avatar</legend>
                <div className={styles.avatars}>
                  {AVATAR_COLOURS.map((colour, index) => (
                    <label key={colour} data-checked={avatar === index} style={{ background: colour }}>
                      <input type="radio" name="avatar" checked={avatar === index} onChange={() => setAvatar(index)} />
                      <span className="visually-hidden">Avatar {index + 1}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className={styles.choices}>
                <legend>How do you like to learn?</legend>
                <div>
                  {STYLES.map((option) => (
                    <label key={option.value} data-checked={learningStyle === option.value}>
                      <input type="radio" name="style" checked={learningStyle === option.value} onChange={() => setLearningStyle(option.value)} />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {step === 4 && (
            <div className={styles.body}>
              <h1>You&apos;re ready, {name || 'friend'}!</h1>
              <p>Start with Nikhilam at the bottom of the journey. Pass any level of a Sutra to unlock the next one.</p>
            </div>
          )}

          <div className={styles.nav}>
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)} icon={<ChevronLeft size={16} aria-hidden="true" />} iconPosition="start">
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < STEPS ? (
              <Button size="lg" onClick={() => setStep(step + 1)} icon={<ArrowRight size={18} aria-hidden="true" />}>
                Continue
              </Button>
            ) : (
              <Button size="lg" onClick={finish} icon={<ArrowRight size={18} aria-hidden="true" />}>
                Start my journey
              </Button>
            )}
          </div>
          <p className={styles.note}>Development profile only. Nothing is sent anywhere.</p>
        </Card>
      </div>
    </CharacterOrchestrator>
  )
}
