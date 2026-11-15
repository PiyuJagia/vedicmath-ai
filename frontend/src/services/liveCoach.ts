import { ApiError } from '../api/client'
import { sendCoachChat } from '../api/coachClient'
import type { CoachChatResponse, CoachLearningContext } from '../api/coachTypes'
import type { CharacterId } from '../characters/registry'
import type { CoachMood } from '../characters/Characters'
import { mapCoachCharacter } from '../api/coachClient'

export type LiveCoachIntent =
  | 'welcome'
  | 'explain'
  | 'explain_again'
  | 'why'
  | 'ask'
  | 'feedback'
  | 'hint'
  | 'complete'
  | 'encourage'
  | 'lesson_start'
  | 'struggle'
  | 'level_complete'
  | 'rocket_visit'
  | 'freeform'

export interface LiveCoachAskInput {
  /** Learner utterance, or a structured coaching prompt when proactive. */
  message: string
  context: CoachLearningContext
  intent?: LiveCoachIntent
}

export interface LiveCoachReply {
  speaker: CharacterId
  text: string
  mood: CoachMood
  /** True only when the reply came from the live ADK agent. */
  isLive: boolean
  toolsUsed: string[]
  raw?: CoachChatResponse
  error?: string
}

const INTENT_PROMPTS: Record<Exclude<LiveCoachIntent, 'freeform'>, string> = {
  welcome: 'Greet the learner briefly as Rishi and invite them to begin.',
  explain: 'Explain the current teaching moment clearly for this learner.',
  explain_again: 'Explain the current step another way without dumping the final answer.',
  why: 'Explain why this Vedic method works, using verified tools when maths is involved.',
  ask: 'Pose a short, age-appropriate question that helps the learner think about the next step.',
  feedback:
    'Give personalized coaching about the verified engine_check_status. Do not invent whether the answer was correct.',
  hint: 'Respond as Rabbit with a progressive hint. Respect hint_level and never reveal forbidden values.',
  complete: 'Congratulate the learner briefly as Hummingbird for finishing this verified practice set.',
  encourage: 'Respond as Hummingbird with genuine encouragement grounded only in provided progress_note.',
  lesson_start: 'As Rishi, briefly introduce this lesson using the provided sutra and difficulty context.',
  struggle: 'As Rishi, help the learner recover after repeated incorrect attempts without revealing the answer.',
  level_complete: 'As Hummingbird, celebrate completing this verified level without inventing mastery stats.',
  rocket_visit:
    'As Rishi, give a short Number Rocket coaching visit using only the provided engine facts in the message. Do not invent maths.',
}

function moodFor(speaker: CharacterId, intent?: LiveCoachIntent): CoachMood {
  if (speaker === 'hummingbird') return 'celebrating'
  if (speaker === 'rabbit') return 'encouraging'
  if (intent === 'feedback' || intent === 'struggle') return 'correcting'
  if (intent === 'why' || intent === 'explain_again') return 'thinking'
  return 'speaking'
}

function composeMessage(input: LiveCoachAskInput): string {
  const intent = input.intent ?? 'freeform'
  if (intent === 'freeform') return input.message
  const preamble = INTENT_PROMPTS[intent]
  return `${preamble}\n\nLearner / UI message:\n${input.message}`
}

/** Call the live Google ADK Rishi coach. Never invents maths. */
export async function askLiveCoach(input: LiveCoachAskInput): Promise<LiveCoachReply> {
  const context: CoachLearningContext = {
    ...input.context,
    event: input.intent ?? input.context.event ?? null,
  }
  if (input.intent === 'hint') {
    context.preferred_persona = 'rabbit'
  } else if (input.intent === 'encourage' || input.intent === 'complete' || input.intent === 'level_complete') {
    context.preferred_persona = 'hummingbird'
  } else if (!context.preferred_persona) {
    context.preferred_persona = 'rishi'
  }

  try {
    const response = await sendCoachChat({
      message: composeMessage(input),
      context,
    })
    const speaker = mapCoachCharacter(response.message.character.id)
    return {
      speaker,
      text: response.message.text,
      mood: moodFor(speaker, input.intent),
      isLive: true,
      toolsUsed: response.tools_used ?? [],
      raw: response,
    }
  } catch (err: unknown) {
    const message = err instanceof ApiError ? err.message : 'The coach could not reply right now.'
    return {
      speaker: 'boy',
      text: '',
      mood: 'speaking',
      isLive: false,
      toolsUsed: [],
      error: message,
    }
  }
}
