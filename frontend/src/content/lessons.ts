import type { LessonSutraId, Problem } from '../api/types'
import type { Difficulty } from '../types/learning'

export interface LevelContent {
  /** At most two sentences. */
  idea: string
  theoryExample: Problem
  learnMore: [Problem, Problem, Problem]
  suggestions: Problem[]
}

export interface SutraLessonContent {
  /** Bump when approved wording or examples change. */
  version: string
  /** Draft until the team approves the wording. */
  approved: boolean
  levels: Record<Difficulty, LevelContent>
}

const pair = (a: number, b: number): Problem => ({ a, b })
const square = (number: number): Problem => ({ number })

export const LESSON_CONTENT: Record<LessonSutraId, SutraLessonContent> = {
  nikhilam: {
    version: '1-draft',
    approved: false,
    levels: {
      beginner: {
        idea: 'When both numbers are close to 100, find how far each one is from 100. Those small differences do the hard work for you.',
        theoryExample: pair(98, 97),
        learnMore: [pair(96, 97), pair(103, 104), pair(98, 103)],
        suggestions: [pair(98, 93), pair(97, 96), pair(103, 104), pair(99, 94), pair(102, 105), pair(90, 90)],
      },
      intermediate: {
        idea: 'For numbers close to 1000, use 1000 as the base. The right part now needs three digits.',
        theoryExample: pair(998, 997),
        learnMore: [pair(996, 995), pair(1004, 1003), pair(997, 1002)],
        suggestions: [pair(999, 991), pair(1006, 1002), pair(993, 995), pair(1003, 998)],
      },
      advanced: {
        idea: 'Near 10000 the method is the same with a bigger base. The right part needs four digits.',
        theoryExample: pair(9998, 9997),
        learnMore: [pair(9996, 9995), pair(10004, 10003), pair(9997, 10002)],
        suggestions: [pair(9999, 9991), pair(10007, 10002), pair(9993, 9995), pair(10003, 9998)],
      },
    },
  },
  urdhva: {
    version: '1-draft',
    approved: false,
    levels: {
      beginner: {
        idea: 'Multiply the digits that line up vertically and the pairs that cross, working from right to left. Add any carry as you go.',
        theoryExample: pair(23, 14),
        learnMore: [pair(32, 21), pair(47, 36), pair(7, 45)],
        suggestions: [pair(31, 12), pair(46, 23), pair(58, 37), pair(99, 99)],
      },
      intermediate: {
        idea: 'With three digits, the middle columns have more crossing pairs. Add every pair in a column, plus the carry.',
        theoryExample: pair(123, 214),
        learnMore: [pair(213, 121), pair(87, 877), pair(456, 789)],
        suggestions: [pair(132, 201), pair(345, 67), pair(608, 129)],
      },
      advanced: {
        idea: 'Four digits make up to four pairs in one column. Keep each carry moving to the next column on the left.',
        theoryExample: pair(1203, 2101),
        learnMore: [pair(1234, 5678), pair(999, 1001), pair(2345, 67)],
        suggestions: [pair(1111, 1234), pair(4021, 3012), pair(5678, 98)],
      },
    },
  },
  ekadhikena: {
    version: '1-draft',
    approved: false,
    levels: {
      beginner: {
        idea: 'To square a number ending in 5, multiply the part before the 5 by one more than itself. Then write 25 on the end.',
        theoryExample: square(35),
        learnMore: [square(25), square(65), square(95)],
        suggestions: [square(45), square(75), square(85), square(15)],
      },
      intermediate: {
        idea: 'For three-digit numbers ending in 5, the part before the 5 has two digits. Multiply it by one more than itself and write 25.',
        theoryExample: square(115),
        learnMore: [square(105), square(125), square(205)],
        suggestions: [square(135), square(245), square(995)],
      },
      advanced: {
        idea: 'For four-digit numbers ending in 5, the same steps apply to a three-digit part. The answer still ends in 25.',
        theoryExample: square(1005),
        learnMore: [square(1015), square(1125), square(2005)],
        suggestions: [square(1035), square(9995), square(4505)],
      },
    },
  },
}

export function problemLabel(problem: Problem): string {
  return 'number' in problem ? `${problem.number}²` : `${problem.a} × ${problem.b}`
}

export function problemKey(problem: Problem): string {
  return 'number' in problem ? String(problem.number) : `${problem.a}x${problem.b}`
}
