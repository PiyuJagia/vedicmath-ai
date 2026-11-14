import { Route, Routes } from 'react-router'
import { AppShell, MinimalShell } from '../components/layout/AppShell'
import { DesignSystemPage } from '../pages/DesignSystemPage'
import { ExplorePage } from '../pages/ExplorePage'
import { HomePage } from '../pages/HomePage'
import { LearnMorePage } from '../pages/lesson/LearnMorePage'
import { SutraOverviewPage } from '../pages/lesson/SutraOverviewPage'
import { TheoryPage } from '../pages/lesson/TheoryPage'
import { OnboardingPage } from '../pages/OnboardingPage'
import { NotFoundPage } from '../pages/placeholders'
import { PlayPage } from '../pages/PlayPage'
import { PracticePage } from '../pages/practice/PracticePage'
import { ProgressPage } from '../pages/ProgressPage'
import { SettingsPage } from '../pages/SettingsPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MinimalShell />}>
        <Route path="onboarding" element={<OnboardingPage />} />
      </Route>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="sutras/:sutraId" element={<SutraOverviewPage />} />
        <Route path="sutras/:sutraId/theory" element={<TheoryPage />} />
        <Route path="sutras/:sutraId/learn" element={<LearnMorePage />} />
        <Route path="sutras/:sutraId/practice" element={<PracticePage />} />
        <Route path="play" element={<PlayPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="design-system" element={<DesignSystemPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
