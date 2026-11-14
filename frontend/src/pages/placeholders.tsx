import { useParams } from 'react-router'
import { PlaceholderPage } from './PlaceholderPage'

export function HomePage() {
  return (
    <PlaceholderPage
      title="Discover the Magic of Vedic Math!"
      description="The landing page from the approved design: learning journey, streak and Next Up."
      phase="Phase 7"
    />
  )
}

export function OnboardingPage() {
  return (
    <PlaceholderPage
      title="Let's set up your profile"
      description="Profile setup with the coach's welcome. Uses fictional profiles only; no real learner data is collected."
      phase="Phase 7"
    />
  )
}

export function ExplorePage() {
  return (
    <PlaceholderPage
      title="Your Journey Through 16 Sutras"
      description="The vertical Sutra journey with mastery rings and unlock states."
      phase="Phase 7"
    />
  )
}

function useSutraId(): string {
  return useParams().sutraId ?? ''
}

export function SutraOverviewPage() {
  const sutraId = useSutraId()
  return (
    <PlaceholderPage
      title={`Sutra: ${sutraId}`}
      description="Sutra overview with difficulty selection, progress rings, and the Theory, Let's Learn More and Practice sections."
      phase="Phase 4"
      breadcrumbs={[{ label: 'Explore Sutras', to: '/explore' }, { label: sutraId }]}
    />
  )
}

export function TheoryPage() {
  const sutraId = useSutraId()
  return (
    <PlaceholderPage
      title="Theory"
      description="The coach introduces the Sutra beside a worked example from the backend."
      phase="Phase 4"
      breadcrumbs={[{ label: 'Explore Sutras', to: '/explore' }, { label: sutraId, to: `/sutras/${sutraId}` }, { label: 'Theory' }]}
    />
  )
}

export function LearnMorePage() {
  const sutraId = useSutraId()
  return (
    <PlaceholderPage
      title="Let's Learn More"
      description="Animated examples driven by backend lesson events, with the rabbit explaining each visual cue."
      phase="Phases 4 and 5"
      breadcrumbs={[{ label: 'Explore Sutras', to: '/explore' }, { label: sutraId, to: `/sutras/${sutraId}` }, { label: "Let's Learn More" }]}
    />
  )
}

export function PracticePage() {
  const sutraId = useSutraId()
  return (
    <PlaceholderPage
      title="Practice with Coach"
      description="Step-by-step practice checked by the Python answer endpoint, with coach feedback and rabbit hints."
      phase="Phase 6"
      breadcrumbs={[{ label: 'Explore Sutras', to: '/explore' }, { label: sutraId, to: `/sutras/${sutraId}` }, { label: 'Practice with Coach' }]}
    />
  )
}

export function PlayPage() {
  return (
    <PlaceholderPage
      title="Play to Win"
      description="Number Rocket, Treasure Trail and Math Detective, unlocked by passing Practice."
      phase="Phase 7"
    />
  )
}

export function ProgressPage() {
  return (
    <PlaceholderPage
      title="My Progress"
      description="Learning summary, mastery rings, badges, streak and recommended next lesson."
      phase="Phase 7"
    />
  )
}

export function SettingsPage() {
  return (
    <PlaceholderPage
      title="Settings"
      description="Profile, avatar, animation speed, reduced motion, sound, accessibility and learning goals."
      phase="Phase 7"
    />
  )
}

export function NotFoundPage() {
  return (
    <PlaceholderPage
      title="Page not found"
      description="This page does not exist. Use the navigation to find your way back."
      phase="Not found"
    />
  )
}
