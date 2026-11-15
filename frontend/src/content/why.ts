/**
 * Why each method works (draft wording for review).
 *
 * `methodWhy` answers "Why does this work?" for a Sutra at one level.
 * `stepWhy` gives the reason behind one teaching step; it is used when the
 * learner asks for another explanation and after repeated wrong answers.
 *
 * These are reasons, not results: they never contain a value the learner is
 * asked to find. The only numbers are facts that hold for every problem
 * (5 × 5 = 25, 35² as the fixed beginner illustration). Each identity was
 * checked against the Python engines over their whole supported ranges.
 */
import type { LessonSutraId } from '../api/types'
import type { Difficulty } from '../types/learning'

export const WHY_VERSION = '1-draft'

export const METHOD_WHY: Record<LessonSutraId, Record<Difficulty, string>> = {
  nikhilam: {
    beginner:
      'Both numbers are just a small step away from 100. Taking the other number’s step away from one number tells you how many hundreds the answer has, and multiplying the two small steps fills in what is left. That is why the left part counts hundreds and the right part always has two digits.',
    intermediate:
      'Write each number as 1000 minus its deviation. Multiplying out gives 1000 × (one number minus the other’s deviation), plus deviation × deviation. So the left part counts thousands, and the right part fills three places, which is why it needs three digits.',
    advanced:
      'If a = B − x and b = B − y, then a × b = B × (a − y) + x × y. Here B is 10000, so the left part counts ten-thousands and the right part fills four places. Since a − y equals b − x, either diagonal gives the same left part.',
  },
  urdhva: {
    beginner:
      'Every digit has a place: ones or tens. Ones × ones makes ones, so it goes in the first column. Tens × ones and ones × tens both make tens, so the crosswise pair shares the tens column. Tens × tens makes hundreds. A total of 10 or more spills into the next place: that is the carry.',
    intermediate:
      'Each column collects every pair of digits whose places make that column’s place. With three digits, the hundreds column gets three pairs: ones × hundreds, tens × tens and hundreds × ones. It is ordinary long multiplication, done one column at a time instead of in rows.',
    advanced:
      'Digits in places i and j make place i + j, so column k adds every pair with i + j = k. With four digits the middle column has four pairs, so its total can be large and the carry can be more than 1. Passing the carry left keeps one digit in each place.',
  },
  ekadhikena: {
    beginner:
      'A number ending in 5 sits halfway between two tens. 35 × 35 is the same as 30 × 40 plus 5 × 5. So you multiply the tens part by one more than itself, and 5 × 5 = 25 goes on the end.',
    intermediate:
      'Write the number as 10 × n + 5, where n is the part before the 5. Squaring it gives 100 × n × (n + 1) + 25. So n × (n + 1) counts the hundreds, and the last two digits are always 25.',
    advanced:
      'The identity (10n + 5)² = 100 × n × (n + 1) + 25 holds for every n, so a four-digit number ending in 5 works just like a two-digit one. It only works for numbers ending in 5: with any other last digit, the end is not always 25.',
  },
}

/** The reason behind one teaching step, matched by the step title the engine gives. */
export function stepWhy(sutra: LessonSutraId, stepTitle: string): string | undefined {
  const title = stepTitle.toLowerCase()
  switch (sutra) {
    case 'nikhilam':
      if (title.startsWith('choose a base'))
        return 'A base like 100 is easy to multiply by: you just add zeros. Choosing the base both numbers are close to keeps the deviations small.'
      if (title.startsWith('calculate deviations'))
        return 'The deviation measures how far a number is from the base, and small deviations are easy to work with. We write base − number, so a number below the base gets a positive deviation and one above gets a negative one.'
      if (title.startsWith('cross-subtract'))
        return 'Taking the other number’s deviation away tells you how many bases the answer holds. Both diagonals give the same left part, so you can check yourself.'
      if (title.startsWith('multiply deviations'))
        return 'Multiplying the two deviations gives the small piece that is left over. It fills the right-hand places.'
      if (title.startsWith('borrow'))
        return 'The right part is below zero, and digits cannot be negative. Taking one from the left part is worth one whole base on the right, so the total stays the same.'
      if (title.startsWith('carry'))
        return 'The right part has more digits than the base allows. Each full base on the right is worth one more on the left, so moving it keeps the total the same.'
      if (title.startsWith('combine'))
        return 'The left part counts whole bases and the right part fills the places after them, so they sit side by side. Zeros go in front of the right part when it is short.'
      return undefined
    case 'urdhva':
      if (title.startsWith('understand'))
        return 'We work place by place, starting from the ones on the right, so each answer box gets exactly one digit.'
      if (title.startsWith('calculate column'))
        return 'Every pair linked in this column makes the same place, so their products belong together. The carry brings in what spilled over from the place to the right.'
      if (title.startsWith('write remaining carry'))
        return 'Nothing is left to multiply, but the carry still stands for a place of its own, so it becomes the front digit.'
      if (title.startsWith('combine'))
        return 'Each box holds one place, so reading the boxes from left to right gives the whole answer.'
      return undefined
    case 'ekadhikena':
      if (title.startsWith('identify'))
        return 'This shortcut is only for numbers that end in 5.'
      if (title.startsWith('separate'))
        return 'The part before the 5 counts the tens. The 5 is handled on its own.'
      if (title.startsWith('add one'))
        return 'A number ending in 5 is halfway between two tens. The part before the 5 and one more than it are those two tens.'
      if (title.startsWith('multiply'))
        return 'This product counts the hundreds in the answer.'
      if (title.startsWith('append 25'))
        return '5 × 5 is always 25, and it fills the last two places. It never mixes with the hundreds.'
      if (title.startsWith('final'))
        return 'The hundreds come from the product, and 25 fills the last two places.'
      return undefined
  }
}
