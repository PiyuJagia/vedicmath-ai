import type { LessonSutraId } from '../api/types'

export interface SutraInfo {
  id: string
  name: string
  fullName: string
  /** Three- or four-word description shown on the journey. */
  short: string
  /** One-sentence explanation shown on hover, focus or tap. */
  explanation: string
  /** Mathematical symbol for the journey node. */
  symbol: string
  /** Set only for Sutras with a Python engine and an animation renderer. */
  lessonId?: LessonSutraId
  /** Intrinsic conceptual difficulty, 1–10 (draft values for review). */
  conceptDifficulty?: number
}

/**
 * Journey order from the bottom (first) to the top (last).
 * Nikhilam, Urdhva and Ekadhikena come first; the remaining order is a
 * placeholder and is not an approved curriculum.
 */
export const SUTRAS: SutraInfo[] = [
  {
    id: 'nikhilam',
    name: 'Nikhilam',
    fullName: 'Nikhilam Navatashcaramam Dashatah',
    short: 'Near a base (e.g., 100)',
    explanation: 'Multiply numbers that are close to a base like 100 by working with how far each is from it.',
    symbol: '×',
    lessonId: 'nikhilam',
    conceptDifficulty: 3,
  },
  {
    id: 'urdhva',
    name: 'Urdhva Tiryagbhyam',
    fullName: 'Urdhva Tiryagbhyam',
    short: 'Vertically and crosswise',
    explanation: 'Multiply any two numbers by pairing digits vertically and crosswise, column by column.',
    symbol: '⨯',
    lessonId: 'urdhva',
    conceptDifficulty: 5,
  },
  {
    id: 'ekadhikena',
    name: 'Ekadhikena Purvena',
    fullName: 'Ekadhikena Purvena',
    short: 'More than the previous',
    explanation: 'Square a number ending in 5 by multiplying the part before the 5 by one more than itself.',
    symbol: 'x²',
    lessonId: 'ekadhikena',
    conceptDifficulty: 2,
  },
  { id: 'paravartya', name: 'Paravartya Yojayet', fullName: 'Paravartya Yojayet', short: 'Transpose and adjust', explanation: 'Divide and solve equations by transposing and adjusting.', symbol: '÷' },
  { id: 'shunyam', name: 'Shunyam Saamyasamuccaye', fullName: 'Shunyam Saamyasamuccaye', short: 'Zero and equality', explanation: 'When the sum is the same, that sum is zero.', symbol: '0' },
  { id: 'anurupye', name: 'Anurupye Shunyamanyat', fullName: 'Anurupye Shunyamanyat', short: 'By proportion', explanation: 'If one is in ratio, the other is zero.', symbol: '∝' },
  { id: 'sankalana', name: 'Sankalana-vyavakalanabhyam', fullName: 'Sankalana-vyavakalanabhyam', short: 'Add and subtract', explanation: 'Solve by addition and by subtraction.', symbol: '±' },
  { id: 'puranapuranabhyam', name: 'Puranapuranabhyam', fullName: 'Puranapuranabhyam', short: 'Complete or not', explanation: 'Solve by completing or not completing.', symbol: '□' },
  { id: 'chalana', name: 'Chalana-Kalanabhyam', fullName: 'Chalana-Kalanabhyam', short: 'Differences and similarities', explanation: 'Work with differences and similarities.', symbol: 'Δ' },
  { id: 'yavadunam', name: 'Yavadunam', fullName: 'Yavadunam', short: 'Whatever the deficiency', explanation: 'Square numbers near a base using their deficiency.', symbol: 'n²' },
  { id: 'vyashtisamanstih', name: 'Vyashtisamanstih', fullName: 'Vyashtisamanstih', short: 'Part and whole', explanation: 'Use the part and the whole.', symbol: '⊂' },
  { id: 'shesanyankena', name: 'Shesanyankena Charamena', fullName: 'Shesanyankena Charamena', short: 'Remainders by last digit', explanation: 'Find remainders using the last digit.', symbol: '%' },
  { id: 'sopaantyadvayamantyam', name: 'Sopaantyadvayamantyam', fullName: 'Sopaantyadvayamantyam', short: 'Ultimate and twice penultimate', explanation: 'The ultimate and twice the penultimate.', symbol: '2′' },
  { id: 'ekanyunena', name: 'Ekanyunena Purvena', fullName: 'Ekanyunena Purvena', short: 'One less than previous', explanation: 'Multiply by numbers made of nines.', symbol: '9' },
  { id: 'gunitasamuchyah', name: 'Gunitasamuchyah', fullName: 'Gunitasamuchyah', short: 'Product of the sum', explanation: 'The product of the sum equals the sum of the product.', symbol: 'Σ' },
  { id: 'gunakasamuchyah', name: 'Gunakasamuchyah', fullName: 'Gunakasamuchyah', short: 'Factors of the sum', explanation: 'The factors of the sum equal the sum of the factors.', symbol: 'Π' },
]

export function findSutra(id: string | undefined): SutraInfo | undefined {
  return SUTRAS.find((sutra) => sutra.id === id)
}
