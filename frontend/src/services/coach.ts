import type { CheckResponse, LessonSutraId, PracticeQuestion } from '../api/types'
import type { CoachMood } from '../characters/Characters'
import type { CharacterId } from '../characters/registry'
import { feedbackText, type QuestionText } from '../content/practice'
import type { Difficulty } from '../types/learning'

/** Everything a coach (scripted today, AI later) may use to reply. */
export interface CoachRequest {
  intent: 'welcome' | 'explain' | 'explain_again' | 'why' | 'ask' | 'feedback' | 'hint' | 'complete'
  sutra?: LessonSutraId
  sutraName?: string
  difficulty?: Difficulty
  mode: 'onboarding' | 'theory' | 'practice'
  problemLabel?: string
  stepTitle?: string
  /** Backend-grounded teaching line for the current animation frame. */
  frameLine?: string
  frameState?: string
  idea?: string
  /** Why the whole method works, at this level (content/why.ts). */
  methodWhy?: string
  /** Why the current step works (content/why.ts). */
  stepWhy?: string
  /** How many times the learner has asked for another explanation of this moment, counting this one. */
  explainCount?: number
  question?: PracticeQuestion
  questionText?: QuestionText
  check?: CheckResponse
  answer?: string
  attempts?: number
  hintLevel?: number
  learnerName?: string
}

export interface CoachResponse {
  speaker: CharacterId
  text: string
  mood: CoachMood
  /** Always true until a real conversational endpoint exists. */
  isDemo: boolean
}

export interface CoachService {
  respond(request: CoachRequest): CoachResponse
}

/**
 * Deterministic scripted coach. It never decides whether an answer is
 * correct; that comes from the backend check in `request.check`.
 */
export const demoCoach: CoachService = {
  respond(request) {
    const reply = (text: string, mood: CoachMood): CoachResponse => ({ speaker: 'boy', text, mood, isDemo: true })

    switch (request.intent) {
      case 'welcome':
        return reply(
          `Namaste${request.learnerName ? `, ${request.learnerName}` : ''}! I am your coach. I will show you clever ways to work with numbers, one step at a time.`,
          'speaking',
        )
      case 'explain':
        return reply(request.frameLine ?? request.idea ?? 'Let us look at this together.', 'speaking')
      case 'explain_again': {
        // Asking again should never get the same words back: first the moment
        // on the stage, then the reason behind this step.
        const second = (request.explainCount ?? 1) % 2 === 0
        if (second && request.stepWhy) return reply(`Here is why this step works. ${request.stepWhy}`, 'thinking')
        return reply(
          request.frameState
            ? `Let me say it another way. ${request.frameState} ${request.frameLine ?? ''}`.trim()
            : (request.idea ?? 'Let us go through it once more.'),
          'speaking',
        )
      }
      case 'why':
        if (request.methodWhy) return reply(request.methodWhy, 'thinking')
        return reply(
          `${request.idea ?? ''} Watch the example step by step and you will see the pattern.`.trim(),
          'thinking',
        )
      case 'ask':
        return reply(request.questionText?.prompt ?? 'What do you think comes next?', 'listening')
      case 'hint':
        return reply('Here is a hint. Take your time.', 'encouraging')
      case 'complete':
        return reply(
          `You solved ${request.problemLabel ?? 'the whole problem'} one step at a time. Wonderful work!`,
          'celebrating',
        )
      case 'feedback': {
        if (!request.check || !request.question) return reply('Let me check that.', 'thinking')
        const text = feedbackText(
          request.check,
          request.question,
          request.answer ?? '',
          request.attempts ?? 1,
          request.questionText,
          request.stepWhy,
        )
        if (request.check.status === 'correct') return reply(text, 'celebrating')
        if (request.check.status === 'invalid') return reply(text, 'speaking')
        return reply(text, request.check.mistake ? 'correcting' : 'encouraging')
      }
    }
  },
}
