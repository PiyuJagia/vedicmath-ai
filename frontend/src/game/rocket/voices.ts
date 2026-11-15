import type { EkadhikenaFacts, NikhilamFacts, SolutionFacts } from './api'
import type { LaunchRecord } from './model'

/**
 * What the characters say in Number Rocket. Every line is a template filled
 * with values the Python engines worked out; nothing here does maths. Later the
 * coach agent (Gemini) can write these lines from the same facts.
 */

const minus = (n: number) => (n < 0 ? `−${-n}` : String(n))
const signed = (n: number) => (n < 0 ? `(${minus(n)})` : String(n))

function smallSum(facts: SolutionFacts): string {
  if (facts.sutra === 'ekadhikena') return `${facts.previous} × ${facts.next}`
  const [da, db] = facts.deviations
  return `${signed(da)} × ${signed(db)}`
}

function nikhilamIdea(f: NikhilamFacts): string {
  const [da, db] = f.deviations
  if (da < 0 && db < 0) return `For ${f.label} both numbers sat above 100, so both deviations were below zero, and two of those multiply to ${f.product}.`
  if (da * db < 0) return `For ${f.label} one number sat above 100 and one below, so the right part came out as ${minus(f.product)} and you borrowed a hundred to fix it.`
  if (f.formatted_right.length > String(f.right_part).length) return `For ${f.label} the deviations were so small that the right part needed a zero in front: ${f.formatted_right}.`
  return `For ${f.label} you measured each number from 100 and only had to work out ${smallSum(f)}.`
}

function ekadhikenaIdea(f: EkadhikenaFacts): string {
  return `For ${f.label} you only needed ${f.previous} × ${f.next}, then 25 on the end.`
}

function idea(facts: SolutionFacts): string {
  return facts.sutra === 'nikhilam' ? nikhilamIdea(facts) : ekadhikenaIdea(facts)
}

/** The coach's message after every second win, about the idea or the journey. */
export function coachMessage(recent: LaunchRecord[]): string {
  const [last, before] = recent
  if (!last) return 'Two wins! Keep flying.'
  const slipped = recent.find((record) => record.mistakes.includes('sign'))
  const helped = recent.find((record) => record.hints > 0)
  const pair = before ? [before, last] : [last]

  const opening = pair.every((record) => record.clean)
    ? 'Two clean launches! Did you notice what they had in common? You never multiplied big numbers.'
    : 'Two more launches done! Look at what made them work: you never multiplied big numbers.'
  const middle = pair.map((record) => idea(record.facts)).join(' ')
  let close = 'That is the heart of Vedic maths: find a friendly number nearby, and the hard sum turns into a small one.'
  if (slipped) close += ` On ${slipped.label} a minus sign tried to sneak away. Say "above the pad means below zero" before you type, and it cannot.`
  else if (helped) close += ` You asked Rabbit for help on ${helped.label} and then finished it yourself. That is how pilots learn.`
  else if (pair.some((record) => record.sutra === 'ekadhikena') && pair.some((record) => record.sutra === 'nikhilam')) {
    close += ' Next time, try to spot the friendly number before you pick an engine.'
  } else {
    close += ' Next time, try saying the small sum out loud before you start.'
  }
  return `${opening} ${middle} ${close}`
}

/** The coach's first line in the replay. */
export function debriefOpening(record: LaunchRecord): string {
  if (record.mistakes.includes('sign')) return `Let's replay ${record.label} together, the ${sutraName(record)} way. Watch the minus sign this time.`
  if (record.mistakes.includes('missing_padding')) return `Let's replay ${record.label} together. Watch how the right part keeps two digits.`
  if (record.hints > 0) return `Let's replay ${record.label} together, step by step, so the next one feels easy.`
  return `Let's replay ${record.label} together. You flew it cleanly. Here is why it works.`
}

export function sutraName(record: { sutra: string }): string {
  return record.sutra === 'nikhilam' ? 'Nikhilam' : 'Ekadhikena'
}

/** The Hummingbird's line in the celebration. */
export function birdLine(record: LaunchRecord, stop: string, stopsLeft: number): string {
  const where = stopsLeft === 0 ? 'Mars is yours!' : `${stop} reached. ${stopsLeft === 1 ? 'One stop' : `${stopsLeft} stops`} to Mars!`
  if (record.clean) return `Not a drop of fuel wasted on ${record.label}. ${where}`
  if (record.hints > 0) return `You asked Rabbit, then flew ${record.label} yourself. ${where}`
  return `You fixed your slip and kept going. ${where}`
}

export const ENGINE_NAMES = {
  pad: { title: 'Pad engine', sub: 'Nikhilam · both numbers near the pad' },
  booster: { title: '+1 Booster engine', sub: 'Ekadhikena · squares ending in 5' },
  standard: { title: 'Standard engine', sub: 'Works for anything, uses more fuel' },
} as const

export function engineMiss(launch: { engine: 'pad' | 'booster'; label: string }, picked: 'pad' | 'booster' | 'standard'): string {
  if (launch.engine === 'pad') {
    return picked === 'booster'
      ? 'The booster is for squares ending in 5. This launch multiplies two numbers near 100.'
      : 'The standard engine works, but both numbers are parked right next to the pad.'
  }
  return picked === 'pad'
    ? `${launch.label.replace('²', '')} is far from the pad at 100, so the pad engine would need big numbers.`
    : 'The standard engine works. But see the 5 at the end? The booster fits.'
}
