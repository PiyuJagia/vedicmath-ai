import type { UrdhvaColumnStep, UrdhvaCombineStep, UrdhvaIntroStep, UrdhvaLesson } from '../../api/types'
import { ContractError } from '../../api/parseLesson'
import { urdhvaText } from '../../content/narration'
import type { Narration, Segment, Timeline, Tone, UrdhvaFrame, UrdhvaScene } from '../types'

const t = (text: string | number, tone: Tone): Segment => ({ text: String(text), tone })

export function buildUrdhvaTimeline(lesson: UrdhvaLesson): Extract<Timeline, { kind: 'urdhva' }> {
  const steps = lesson.teaching_steps
  const intro = steps.find((step): step is UrdhvaIntroStep => step.type === 'introduction')
  const combine = steps.find((step): step is UrdhvaCombineStep => step.type === 'combine')
  const columns = steps.filter(
    (step): step is UrdhvaColumnStep => step.type === 'multiplication_column' || step.type === 'final_carry',
  )
  if (!intro || !combine || columns.length === 0) {
    throw new ContractError('The Urdhva lesson is missing its introduction, columns or combine step.')
  }

  const [a, b] = intro.numbers
  const introAnimation = lesson.animation_steps.find((step) => step.step_id === intro.id)
  const instructionEvent = introAnimation?.events.find((event) => event.action === 'show_instruction')
  const instruction = typeof instructionEvent?.text === 'string' ? instructionEvent.text : ''

  const base: Omit<UrdhvaScene, 'workTitle' | 'work'> = {
    digitsA: String(a).split(''),
    digitsB: String(b).split(''),
    columns: columns.length,
    pairs: [],
    written: {},
    activeColumns: [],
    lane: {},
    laneGhost: {},
    joined: null,
    moves: [],
  }

  const frames: UrdhvaFrame[] = []
  const add = (step: { id: number; title: string }, key: string, narration: Narration, scene: Partial<UrdhvaScene>) => {
    frames.push({
      id: `urdhva-${step.id}-${key}`,
      stepId: step.id,
      stepTitle: step.title,
      ...narration,
      scene: { ...base, workTitle: 'Working', work: [], ...scene },
    })
  }

  add(intro, 'intro', urdhvaText.intro(a, b, instruction), {})

  let written: Record<number, number> = {}
  let lane: Record<number, number> = {}

  columns.forEach((column, index) => {
    const number = index + 1
    const workTitle = `Working · column ${number}`

    if (column.type === 'final_carry') {
      written = { ...written, [number]: column.write_digit }
      add(column, 'final', urdhvaText.finalCarry(column.write_digit), {
        written,
        activeColumns: [number],
        laneGhost: { [number]: column.incoming_carry },
        workTitle,
        work: [{ segments: ['write ', t(column.write_digit, 'write')] }],
        moves: [
          { id: `final-${number}`, from: { kind: 'lane', column: number }, to: { kind: 'answer', column: number }, label: String(column.write_digit), tone: 'carry' },
        ],
      })
      lane = {}
      return
    }

    const pairs = column.products.map((p) => ({ positionA: p.position_a, positionB: p.position_b }))
    const productLines = column.products.map((p) => ({ segments: [`${p.digit_a} × ${p.digit_b} = `, t(p.product, 'strong')] }))
    const many = column.products.length > 1
    const sumLines = many
      ? [{ segments: [`${column.products.map((p) => p.product).join(' + ')} = `, t(column.subtotal, 'strong')] }]
      : []

    // Beat 1: multiply the linked digits.
    add(
      column,
      'multiply',
      urdhvaText.multiply(
        number,
        column.products.map((p) => ({ digitA: p.digit_a, digitB: p.digit_b, product: p.product })),
        column.subtotal,
        column.incoming_carry,
      ),
      { pairs, written, lane, workTitle, work: [...productLines, ...sumLines] },
    )

    // Beat 2: the waiting carry joins the sum.
    if (column.incoming_carry > 0) {
      add(column, 'carry-in', urdhvaText.carryIn(column.subtotal, column.incoming_carry, column.total), {
        pairs,
        written,
        laneGhost: { [number]: column.incoming_carry },
        workTitle,
        work: [
          ...productLines,
          ...sumLines,
          { segments: [`${column.subtotal} + `, t(column.incoming_carry, 'carry'), ' = ', t(column.total, 'strong')] },
        ],
        moves: [
          { id: `carry-in-${number}`, from: { kind: 'lane', column: number }, to: { kind: 'work' }, label: String(column.incoming_carry), tone: 'carry' },
        ],
      })
      lane = {}
    }

    // Beat 3: split the total, write the digit, park the new carry.
    written = { ...written, [number]: column.write_digit }
    const hasCarry = column.outgoing_carry > 0
    lane = hasCarry ? { [number + 1]: column.outgoing_carry } : {}
    add(column, 'split', urdhvaText.split(number, column.total, column.write_digit, column.outgoing_carry), {
      written,
      activeColumns: [number],
      lane,
      workTitle,
      work: [
        { segments: ['Total ', t(column.total, 'strong')] },
        {
          segments: hasCarry
            ? ['write ', t(column.write_digit, 'write'), '    carry ', t(column.outgoing_carry, 'carry')]
            : ['write ', t(column.write_digit, 'write')],
        },
      ],
      moves: [
        { id: `write-${number}`, from: { kind: 'work' }, to: { kind: 'answer', column: number }, label: String(column.write_digit), tone: 'write' },
        ...(hasCarry
          ? [{ id: `carry-out-${number}`, from: { kind: 'work' } as const, to: { kind: 'lane', column: number + 1 } as const, label: String(column.outgoing_carry), tone: 'carry' as const }]
          : []),
      ],
    })
  })

  const answerDigits = columns.map((column) => column.write_digit).reverse()
  const allColumns = columns.map((_, index) => index + 1)
  add(combine, 'assemble', urdhvaText.assemble(answerDigits), {
    written,
    activeColumns: allColumns,
    work: [{ segments: [answerDigits.join(' | ')] }],
  })
  add(combine, 'reveal', urdhvaText.reveal(a, b, lesson.result), {
    written,
    joined: lesson.result,
    work: [{ segments: [`${a} × ${b} = `, t(lesson.result, 'write')] }],
  })

  return {
    kind: 'urdhva',
    key: `urdhva:${lesson.difficulty}:${a}x${b}`,
    problemLabel: `${a} × ${b}`,
    steps: steps.map((step) => ({ id: step.id, title: step.title })),
    result: lesson.result,
    frames,
  }
}
