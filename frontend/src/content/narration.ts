/**
 * Words that accompany each animation frame (draft wording for review).
 * state  – what is mathematically true on screen; also the text alternative.
 * rabbit – the rabbit's explanation of the visual cue (Let's Learn More).
 * coach  – the boy's teaching line (Theory and Practice).
 * Every number comes from the backend lesson passed in; nothing is calculated here.
 */
import { fmt, magnitude, paren, signed } from '../animation/format'
import type { Narration } from '../animation/types'

// ---------- Nikhilam ----------

export interface NikhilamValues {
  a: number
  b: number
  base: number
  rightDigits: number
  devA: number
  devB: number
  crossA: { number: number; deviation: number; value: number }
  crossB: { number: number; deviation: number; value: number }
  left: number
  right: number
}

function distanceQuestion(number: number, deviation: number, base: number): string {
  return deviation < 0
    ? `How far is ${number} above ${base}? Numbers above the base get a negative deviation.`
    : `How far is ${number} below ${base}?`
}

export const nikhilamText = {
  intro: (v: NikhilamValues): Narration => ({
    state: `The problem ${v.a} × ${v.b} is on the stage. Tile A holds ${v.a} and tile B holds ${v.b}.`,
    rabbit: `These two tiles are the numbers we will multiply: A is ${v.a} and B is ${v.b}.`,
    coach: `Let's multiply ${v.a} by ${v.b} the Nikhilam way.`,
  }),
  base: (v: NikhilamValues): Narration => ({
    state: `Base ${v.base} sits above the numbers. The number line marks ${v.a}, ${v.b} and the base ${v.base}.`,
    rabbit: `The glowing marker is the base, ${v.base}. The dots on the line show how close ${v.a} and ${v.b} are to it.`,
    coach: `We choose ${v.base} because both numbers are close to ${v.base}.`,
  }),
  deviationA: (v: NikhilamValues): Narration => ({
    state: `Base − A: ${v.base} − ${v.a} = ${signed(v.devA)}.`,
    rabbit: `The base and ${v.a} light up together because we take ${v.a} away from the base.`,
    coach: distanceQuestion(v.a, v.devA, v.base),
  }),
  storeA: (v: NikhilamValues): Narration => ({
    state: `${signed(v.devA)} is stored in deviation chip A, beside ${v.a}.`,
    rabbit: `Watch ${signed(v.devA)} slide into the small chip beside ${v.a}. That chip is ${v.a}'s deviation.`,
    coach: `${signed(v.devA)} is how far ${v.a} is from the base.`,
  }),
  deviationB: (v: NikhilamValues): Narration => ({
    state: `Base − B: ${v.base} − ${v.b} = ${signed(v.devB)}, stored in deviation chip B.`,
    rabbit: `Same idea for ${v.b}: the base minus ${v.b} gives ${signed(v.devB)}, and it moves into the chip beside ${v.b}.`,
    coach: distanceQuestion(v.b, v.devB, v.base),
  }),
  crossA: (v: NikhilamValues): Narration => ({
    state: `A − deviation B: ${v.crossA.number} − ${paren(v.crossA.deviation)} = ${v.crossA.value}.`,
    rabbit: `The diagonal arrow connects ${v.a} to the other number's deviation, ${signed(v.devB)}. Watch how we use that difference.`,
    coach: `Take the other number's deviation away from ${v.a}.`,
  }),
  crossB: (v: NikhilamValues): Narration => ({
    state: `B − deviation A, the other diagonal: ${v.crossB.number} − ${paren(v.crossB.deviation)} = ${v.crossB.value}.`,
    rabbit: `Now the other diagonal joins ${v.b} to ${signed(v.devA)}. Both diagonals should land on the same number.`,
    coach: 'Now try the other diagonal.',
  }),
  left: (v: NikhilamValues): Narration => ({
    state: `Both diagonals give ${v.left}, so ${v.left} is the left part of the answer.`,
    rabbit: `Both answers match, so ${v.left} moves down into the left part of the answer.`,
    coach: 'Either diagonal gives the same number.',
  }),
  multiply: (v: NikhilamValues): Narration => ({
    state: `Deviation A × deviation B: ${paren(v.devA)} × ${paren(v.devB)} = ${fmt(v.right)}.`,
    rabbit: 'The line between the two chips means we multiply the deviations.',
    coach: 'Now multiply the two deviations.',
  }),
  placeRight: (v: NikhilamValues, emptyPlaces: number): Narration => ({
    state:
      `${v.right} goes in the right part. Base ${v.base} gives the right part ${v.rightDigits} digit places.` +
      (emptyPlaces === 0 ? '' : emptyPlaces === 1 ? ' One place is still empty.' : ` ${emptyPlaces} places are still empty.`),
    rabbit:
      `The right part has ${v.rightDigits} places because ${v.base} has ${v.rightDigits} zeros. ` +
      (emptyPlaces === 0 ? `${v.right} fills every place.` : `${v.right} slides into the last place${emptyPlaces < v.rightDigits - 1 ? 's' : ''}.`),
    coach: `The right part always has ${v.rightDigits} digits for base ${v.base}.`,
  }),
  needsAdjust: (v: NikhilamValues, borrowing: boolean): Narration => ({
    state:
      `After the deviations multiply, the parts are ${v.left} | ${fmt(v.right)}. ` +
      (borrowing
        ? 'The right part is negative, so it cannot be written as digits yet.'
        : `The right part has too many digits for base ${v.base}.`),
    rabbit: borrowing
      ? `The right part glows amber because ${fmt(v.right)} is below zero. It needs a borrow.`
      : `The right part glows amber because ${v.right} does not fit in ${v.rightDigits} digits. It needs a carry.`,
    coach: borrowing ? 'The right part is below zero. We need to borrow.' : 'The right part is too big. We need to carry.',
  }),
  adjust: (
    v: NikhilamValues,
    adj: { borrowing: boolean; amount: number; leftBefore: number; leftAfter: number; rightBefore: number; rightAfter: number; rightChange: number },
  ): Narration => {
    const leftSign = adj.borrowing ? '−' : '+'
    const rightChange = adj.rightChange < 0 ? `− ${magnitude(adj.rightChange)}` : `+ ${adj.rightChange}`
    return {
      state:
        `${adj.amount} is ${adj.borrowing ? 'borrowed from' : 'carried into'} the left part: ${adj.leftBefore} ${leftSign} ${adj.amount} = ${adj.leftAfter}. ` +
        `On the right it is worth ${v.base}: ${paren(adj.rightBefore)} ${rightChange} = ${adj.rightAfter}.`,
      rabbit: adj.borrowing
        ? `The amber token is ${adj.amount} borrowed from the left part. When it crosses to the right it is worth ${v.base}.`
        : `The amber token carries ${adj.amount} into the left part. It takes ${v.base} away from the right.`,
      coach: adj.borrowing
        ? `Borrow ${adj.amount} from the left. It is worth ${v.base} on the right.`
        : `Carry ${adj.amount} to the left. It takes ${v.base} away from the right.`,
    }
  },
  pad: (v: NikhilamValues, value: number, formatted: string, zeros: number): Narration => ({
    state: `${zeros === 1 ? 'A zero fills the empty place' : `${zeros} zeros fill the empty places`}: ${value} becomes ${formatted}.`,
    rabbit: `A zero slips into the empty place so the right part has exactly ${v.rightDigits} digits.`,
    coach: `Base ${v.base} needs ${v.rightDigits} digits on the right, so we write ${formatted}.`,
  }),
  join: (left: number, formattedRight: string): Narration => ({
    state: `The two parts sit side by side: ${left} | ${formattedRight}.`,
    rabbit: 'The two parts slide together to make one number.',
    coach: 'Put the two parts together.',
  }),
  reveal: (v: NikhilamValues, result: number): Narration => ({
    state: `${v.a} × ${v.b} = ${result}.`,
    rabbit: `That's the answer: ${result}.`,
    coach: `That is the answer. ${v.a} × ${v.b} = ${result}.`,
  }),
}

// ---------- Urdhva Tiryagbhyam ----------

export interface UrdhvaProductText {
  digitA: number
  digitB: number
  product: number
}

export const urdhvaText = {
  intro: (a: number, b: number, instruction: string): Narration => ({
    state: `The digits of ${a} and ${b} sit in separate tiles, lined up by place value.`,
    rabbit: 'Each digit has its own tile. The empty boxes below the line are where the answer digits will go.',
    coach: instruction,
  }),
  multiply: (column: number, products: UrdhvaProductText[], subtotal: number, waitingCarry: number): Narration => {
    const words = products.map((p) => `${p.digitA} × ${p.digitB} = ${p.product}`)
    const many = products.length > 1
    return {
      state: many
        ? `Column ${column}: the linked pairs give ${words.join(' and ')}. Together: ${products.map((p) => p.product).join(' + ')} = ${subtotal}.`
        : `Column ${column}: the linked pair gives ${words[0]}.`,
      rabbit:
        (many
          ? 'Each line links two digits to multiply. Lines that cross are the crosswise pairs; we add their products.'
          : `The line joins ${products[0].digitA} and ${products[0].digitB}: these two digits are multiplied.`) +
        (waitingCarry > 0 ? ` The amber carry ${waitingCarry} is still waiting above this column.` : ''),
      coach: many ? 'Multiply each linked pair, then add the products.' : 'Multiply the linked digits.',
    }
  },
  carryIn: (subtotal: number, carry: number, total: number): Narration => ({
    state: `The waiting carry joins the sum: ${subtotal} + ${carry} = ${total}.`,
    rabbit: `The amber token is the carry from the last column. It moves into this column's sum.`,
    coach: 'Do not forget the carry from the last column.',
  }),
  split: (column: number, total: number, digit: number, carry: number): Narration =>
    carry > 0
      ? {
          state: `${total} splits into ${digit} to write and ${carry} to carry.`,
          rabbit: `Only one digit fits in each answer box, so ${digit} drops into box ${column} and ${carry} moves up to the carry lane above the next column.`,
          coach: 'Write the last digit and carry the rest.',
        }
      : {
          state: `Write ${digit}. The carry out is ${carry}, so nothing waits in the lane.`,
          rabbit: `${digit} drops into answer box ${column}. Nothing needs to be carried.`,
          coach: 'Write the digit. Nothing to carry.',
        },
  finalCarry: (digit: number): Narration => ({
    state: `No digits are left to multiply. The waiting carry ${digit} is written as the next answer digit.`,
    rabbit: `There is nothing left to multiply, so the waiting carry ${digit} becomes the front digit.`,
    coach: 'Write the last carry at the front.',
  }),
  assemble: (digits: number[]): Narration => ({
    state: `The answer digits are assembled: ${digits.join(' | ')}.`,
    rabbit: 'All the answer boxes are filled. Read them from left to right.',
    coach: 'Read the answer digits from left to right.',
  }),
  reveal: (a: number, b: number, result: number): Narration => ({
    state: `${a} × ${b} = ${result}.`,
    rabbit: `That's the answer: ${result}.`,
    coach: `That is the answer. ${a} × ${b} = ${result}.`,
  }),
}

// ---------- Ekadhikena Purvena ----------

export const ekadhikenaText = {
  intro: (number: number, explanation: string): Narration => ({
    state: `The number ${number} is on the stage, to be squared.`,
    rabbit: `This is the number we will square: ${number} × ${number}.`,
    coach: explanation,
  }),
  split: (number: number, previous: number, last: number, explanation: string): Narration => ({
    state: `${number} is split into the preceding part ${previous} and the last digit ${last}.`,
    rabbit: `The tile splits in two. The highlighted ${last} is the last digit; ${previous} is the part before it.`,
    coach: explanation,
  }),
  next: (previous: number, next: number, explanation: string): Narration => ({
    state: `One more than ${previous} is ${next}.`,
    rabbit: `A copy of ${previous} moves down and the +1 token joins it, so it becomes ${next}.`,
    coach: explanation,
  }),
  multiply: (a: number, b: number, value: number, explanation: string): Narration => ({
    state: `${a} × ${b} = ${value}. This is the left part of the answer.`,
    rabbit: `The line links ${a} and ${b}: multiply them. The result slides into the left part.`,
    coach: explanation,
  }),
  append: (left: number, right: string, explanation: string): Narration => ({
    state: `${right} is appended as the right part: ${left} | ${right}.`,
    rabbit: `${right} goes into the right part. Every number ending in 5 finishes with ${right} when squared.`,
    coach: explanation,
  }),
  reveal: (number: number, result: number, explanation: string): Narration => ({
    state: `The two parts join to give ${result}.`,
    rabbit: `That's the answer: ${number}² = ${result}.`,
    coach: explanation,
  }),
}
