import type {
  AnimationEvent,
  EkadhikenaLesson,
  Lesson,
  LessonSutraId,
  NikhilamLesson,
  UrdhvaLesson,
} from './types'

/** The backend sent something this frontend version does not understand. */
export class ContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContractError'
  }
}

export const KNOWN_ACTIONS: Record<LessonSutraId, ReadonlySet<string>> = {
  nikhilam: new Set([
    'show_numbers',
    'show_base',
    'compare_with_base',
    'calculate_deviation',
    'cross_subtract',
    'show_left_part',
    'multiply_deviations',
    'show_right_part',
    'adjust_parts',
    'pad_right_part',
    'join_parts',
    'reveal_result',
  ]),
  urdhva: new Set([
    'show_numbers',
    'show_instruction',
    'highlight_and_connect',
    'show_subtotal',
    'add_carry',
    'write_digit',
    'move_carry',
    'write_final_carry',
    'reveal_result',
  ]),
  ekadhikena: new Set([
    'show_number',
    'highlight_last_digit',
    'show_next_number',
    'multiply_previous',
    'append_25',
    'reveal_result',
  ]),
}

const NIKHILAM_STEP_TYPES = new Set(['base', 'deviations', 'cross_subtract', 'multiply_deviations', 'adjust', 'combine'])
const URDHVA_STEP_TYPES = new Set(['introduction', 'multiplication_column', 'final_carry', 'combine'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireArray(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) throw new ContractError(`${what} is missing or not a list.`)
  return value
}

function requireNumber(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new ContractError(`${what} is not a number.`)
  return value
}

function checkActions(sutra: LessonSutraId, events: unknown[]) {
  for (const event of events) {
    if (!isRecord(event) || typeof event.action !== 'string') {
      throw new ContractError(`An ${sutra} animation event has no action.`)
    }
    if (!KNOWN_ACTIONS[sutra].has(event.action)) {
      throw new ContractError(`Unsupported ${sutra} animation event "${event.action}".`)
    }
  }
}

function checkEnvelope(body: Record<string, unknown>) {
  requireArray(body.teaching_steps, 'teaching_steps')
  requireArray(body.animation_steps, 'animation_steps')
  requireNumber(body.result, 'result')
  const numbers = requireArray(body.numbers, 'numbers')
  if (numbers.length !== 2) throw new ContractError('numbers must hold two values.')
}

function checkGroupedSteps(sutra: 'nikhilam' | 'urdhva', body: Record<string, unknown>, stepTypes: Set<string>) {
  const teaching = requireArray(body.teaching_steps, 'teaching_steps')
  for (const step of teaching) {
    if (!isRecord(step) || typeof step.type !== 'string' || !stepTypes.has(step.type)) {
      throw new ContractError(`Unsupported ${sutra} teaching step "${isRecord(step) ? String(step.type) : '?'}".`)
    }
    requireNumber(step.id, `${sutra} step id`)
  }

  const animation = requireArray(body.animation_steps, 'animation_steps')
  const teachingIds = teaching.map((step) => (step as Record<string, unknown>).id)
  const animationIds = animation.map((step) => (isRecord(step) ? step.step_id : undefined))
  if (JSON.stringify(teachingIds) !== JSON.stringify(animationIds)) {
    throw new ContractError(`${sutra} teaching and animation steps do not line up.`)
  }
  for (const step of animation) {
    checkActions(sutra, requireArray((step as Record<string, unknown>).events, `${sutra} step events`))
  }
}

export function parseLesson(sutra: LessonSutraId, body: unknown): Lesson {
  if (!isRecord(body)) throw new ContractError('The lesson response is not an object.')
  checkEnvelope(body)

  if (sutra === 'nikhilam') {
    checkGroupedSteps('nikhilam', body, NIKHILAM_STEP_TYPES)
    const deviations = (body.teaching_steps as Record<string, unknown>[]).find((step) => step.type === 'deviations')
    if (!deviations || deviations.convention !== 'base - number') {
      throw new ContractError('Nikhilam deviations must use the base - number convention.')
    }
    return { kind: 'nikhilam', data: body as unknown as NikhilamLesson }
  }

  if (sutra === 'urdhva') {
    checkGroupedSteps('urdhva', body, URDHVA_STEP_TYPES)
    return { kind: 'urdhva', data: body as unknown as UrdhvaLesson }
  }

  const events = requireArray(body.animation_steps, 'animation_steps') as AnimationEvent[]
  checkActions('ekadhikena', events)
  for (const step of requireArray(body.teaching_steps, 'teaching_steps')) {
    if (!isRecord(step) || typeof step.title !== 'string' || typeof step.explanation !== 'string') {
      throw new ContractError('An Ekadhikena teaching step is missing its title or explanation.')
    }
  }
  return { kind: 'ekadhikena', data: body as unknown as EkadhikenaLesson }
}
