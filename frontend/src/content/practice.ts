/**
 * Practice wording (draft): the coach's question for each step and three hint levels.
 * Values come from the backend lesson; hints describe the calculation but never state its answer.
 */
import type {
  CheckResponse,
  EkadhikenaLesson,
  Lesson,
  NikhilamAdjustStep,
  NikhilamBaseStep,
  NikhilamCombineStep,
  NikhilamDeviationsStep,
  NikhilamLesson,
  PracticeQuestion,
  UrdhvaColumnStep,
  UrdhvaLesson,
} from '../api/types'
import { fmt, paren } from '../animation/format'

export interface QuestionText {
  prompt: string
  label: string
  hints: [string, string, string]
}

function nikhilam(lesson: NikhilamLesson, key: string): QuestionText {
  const step = <T,>(type: string) => lesson.teaching_steps.find((s) => s.type === type) as T
  const base = step<NikhilamBaseStep>('base')
  const dev = step<NikhilamDeviationsStep>('deviations')
  const adjust = step<NikhilamAdjustStep | undefined>('adjust')
  const combine = step<NikhilamCombineStep>('combine')
  const [a, b] = base.numbers
  const [devA, devB] = dev.deviations

  switch (key) {
    case 'deviation_a':
    case 'deviation_b': {
      const number = key === 'deviation_a' ? a : b
      return {
        prompt: `What is the deviation of ${number}? Remember: base − number.`,
        label: `Deviation of ${number}`,
        hints: [
          `How far is ${number} from the base ${base.base}?`,
          'Subtract the number from the base: base − number. A number above the base gives a negative answer.',
          `Work out ${base.base} − ${number}.`,
        ],
      }
    }
    case 'left_part':
      return {
        prompt: `Now the left part. Take B's deviation away from ${a}. What do you get?`,
        label: 'Left part',
        hints: [
          'Follow one of the diagonals: a number and the other number’s deviation.',
          `Use ${a} and the deviation of ${b}. Subtract the deviation.`,
          `Work out ${a} − ${paren(devB)}.`,
        ],
      }
    case 'right_part':
      return {
        prompt: 'Multiply the two deviations. What is the right part?',
        label: 'Right part',
        hints: [
          'Look at the two deviation chips.',
          'Multiply the deviations together. Watch the signs.',
          `Work out ${paren(devA)} × ${paren(devB)}.`,
        ],
      }
    case 'adjusted_left_part':
    case 'adjusted_right_part': {
      const borrowing = adjust?.adjustment === 'borrow'
      const left = key === 'adjusted_left_part'
      return {
        prompt: left
          ? `The right part needs ${base.right_digits} digits, so we ${borrowing ? 'borrow' : 'carry'}. What is the new left part?`
          : 'What is the new right part after the adjustment?',
        label: left ? 'Adjusted left part' : 'Adjusted right part',
        hints: borrowing
          ? [
              'The right part is below zero, so it cannot be written as digits yet.',
              `Borrow ${adjust?.amount} from the left part. On the right it is worth ${base.base}.`,
              left ? `Work out ${adjust?.left_before} − ${adjust?.amount}.` : `Work out ${paren(adjust?.right_before ?? 0)} + ${base.base}.`,
            ]
          : [
              `The right part has more than ${base.right_digits} digits.`,
              `Carry the extra ${base.base} to the left part as ${adjust?.amount}.`,
              left ? `Work out ${adjust?.left_before} + ${adjust?.amount}.` : `Work out ${adjust?.right_before} − ${base.base}.`,
            ],
      }
    }
    case 'padded_right_part':
      return {
        prompt: `Write the right part with exactly ${combine.right_digits} digits.`,
        label: 'Right part, padded',
        hints: [
          'How many digits must the right part have?',
          `Base ${base.base} has ${combine.right_digits} zeros, so the right part needs ${combine.right_digits} digits.`,
          `Put zeros in front of ${combine.right_part} until it has ${combine.right_digits} digits.`,
        ],
      }
    default:
      return {
        prompt: `Put the parts together. What is ${a} × ${b}?`,
        label: `${a} × ${b}`,
        hints: [
          'Write the left part, then the right part.',
          `The right part always has ${combine.right_digits} digits.`,
          `Write ${combine.left_part} followed by the ${combine.right_digits} right-hand digits.`,
        ],
      }
  }
}

function urdhva(lesson: UrdhvaLesson, key: string): QuestionText {
  const [a, b] = lesson.numbers
  const columns = lesson.teaching_steps.filter(
    (s): s is UrdhvaColumnStep => s.type === 'multiplication_column' || s.type === 'final_carry',
  )
  const match = /^column_(\d+)_(total|digit|carry)$/.exec(key)
  if (!match) {
    return {
      prompt: `Read the answer digits. What is ${a} × ${b}?`,
      label: `${a} × ${b}`,
      hints: ['Every answer box is filled.', 'Read the digits from left to right.', 'Write the answer boxes as one number, starting from the left.'],
    }
  }

  const number = Number(match[1])
  const column = columns[number - 1]
  const pairs = column.products.map((p) => `${p.digit_a} × ${p.digit_b}`).join(' + ')
  const carryNote = column.incoming_carry > 0 ? ` plus the carry ${column.incoming_carry}` : ''

  if (column.type === 'final_carry') {
    return {
      prompt: 'No digits are left. Which digit goes at the front?',
      label: 'Front digit',
      hints: ['Look at the carry lane.', 'The waiting carry becomes the front digit.', 'Write the carry that is waiting above this column.'],
    }
  }
  if (match[2] === 'total') {
    return {
      prompt: `Column ${number}: multiply the linked pairs and add${carryNote}. What is the total?`,
      label: `Column ${number} total`,
      hints: [
        `Which digits are linked in column ${number}?`,
        `Multiply each linked pair and add the products${carryNote}.`,
        `Work out ${pairs}${column.incoming_carry > 0 ? ` + ${column.incoming_carry}` : ''}.`,
      ],
    }
  }
  if (match[2] === 'digit') {
    return {
      prompt: `Which digit do you write in answer box ${number}?`,
      label: `Column ${number} digit`,
      hints: ['Only one digit fits in each answer box.', 'Write the last digit of the total.', `The total is ${column.total}. Which digit is in its ones place?`],
    }
  }
  return {
    prompt: `What do you carry from column ${number}?`,
    label: `Column ${number} carry`,
    hints: ['What is left after you write the last digit?', 'The carry is the total without its last digit. It can be 0.', `The total is ${column.total}. Remove its last digit.`],
  }
}

function ekadhikena(lesson: EkadhikenaLesson, key: string): QuestionText {
  const get = (action: string) => lesson.animation_steps.find((e) => e.action === action)
  const number = Number(get('show_number')?.number)
  const previous = Number(get('highlight_last_digit')?.previous)
  const next = Number(get('show_next_number')?.next_number)

  switch (key) {
    case 'next_number':
      return {
        prompt: `${number} ends in 5. What is one more than ${previous}?`,
        label: 'One more',
        hints: ['Look at the part before the 5.', 'Add one to it.', `Work out ${previous} + 1.`],
      }
    case 'left_part':
      return {
        prompt: `Multiply ${previous} by ${next}. What is the left part?`,
        label: 'Left part',
        hints: ['Use the part before the 5 and the number one more than it.', 'Multiply those two numbers.', `Work out ${previous} × ${next}.`],
      }
    case 'right_part':
      return {
        prompt: 'What do you write as the right part?',
        label: 'Right part',
        hints: ['The right part comes from the last digits.', 'Multiply the last digit by itself.', 'Work out 5 × 5.'],
      }
    default:
      return {
        prompt: `Put the parts together. What is ${number}²?`,
        label: `${number}²`,
        hints: ['Write the left part, then the right part.', 'The right part goes on the end.', 'Write the left part followed by the two right-hand digits.'],
      }
  }
}

export function questionText(lesson: Lesson, question: PracticeQuestion): QuestionText {
  switch (lesson.kind) {
    case 'nikhilam':
      return nikhilam(lesson.data, question.key)
    case 'urdhva':
      return urdhva(lesson.data, question.key)
    case 'ekadhikena':
      return ekadhikena(lesson.data, question.key)
  }
}

/** The coach's reply to a checked answer. Correctness always comes from the backend. */
export function feedbackText(check: CheckResponse, question: PracticeQuestion, answer: string, attempts: number): string {
  if (check.status === 'correct') {
    return attempts > 1 ? `Yes, ${fmt(answer.trim())} is right. You kept going, well done!` : `Yes! ${fmt(answer.trim())} is right.`
  }
  if (check.status === 'invalid') return check.message ?? 'Please enter a number.'
  if (check.mistake === 'sign') return 'So close! Check the sign. Is the number above or below the base?'
  if (check.mistake === 'missing_padding') {
    return `That's the right value, but it needs exactly ${question.digits} digits. Add zeros in front.`
  }
  return attempts >= 2 ? "Not quite yet. Let's use a hint together." : "Not quite. Have another look; you can do this."
}
