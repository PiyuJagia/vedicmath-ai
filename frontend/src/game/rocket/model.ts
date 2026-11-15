import type { ProgressState } from '../../services/progressModel'
import type { MissionLaunch, RocketSutra, RungId, SolutionFacts } from './api'

/**
 * Number Rocket's own progress. It lives beside, never inside, the Practice
 * progress: the game reads which levels are passed but never fills a ring.
 */

export const MISSION_NAME = 'Mars run'

/** The launch site, then the six stops of the Mars run (positions on a 1000 × 600 map). */
export const WAYPOINTS = [
  { name: 'Launch pad', x: 70, y: 575, colour: '#6fb3e6' },
  { name: 'Earth orbit', x: 120, y: 470, colour: '#6fb3e6' },
  { name: 'Space station', x: 270, y: 420, colour: '#c9c3e6' },
  { name: 'Moon', x: 420, y: 360, colour: '#e8e3c8' },
  { name: 'Asteroid gate', x: 570, y: 280, colour: '#b9a58f' },
  { name: 'Phobos', x: 720, y: 230, colour: '#c7a08a' },
  { name: 'Mars', x: 880, y: 120, colour: '#e0714f' },
] as const

export const RUNG_ORDER: Record<RocketSutra, RungId[]> = {
  nikhilam: ['N1', 'N2', 'N3', 'N4'],
  ekadhikena: ['E1', 'E2'],
}

/** Clean wins (no hints, no slips) on a rung before the next rung opens. */
export const CLEAN_WINS_TO_CLEAR = 2

export interface LaunchRecord {
  label: string
  sutra: RocketSutra
  rung: RungId
  hints: number
  slips: number
  /** Mistake tags from the engine checks, such as "sign" or "missing_padding". */
  mistakes: string[]
  engineRight: boolean
  clean: boolean
  facts: SolutionFacts
  at: string
}

export interface Mission {
  number: number
  seed: number
  launches: MissionLaunch[]
  records: LaunchRecord[]
}

export interface RocketState {
  mission: Mission | null
  cleared: RungId[]
  cleanWins: Partial<Record<RungId, number>>
  totalWins: number
  coachVisits: number
  missionsFlown: number
  /** Recent wins across missions, newest first. */
  log: LaunchRecord[]
}

export const EMPTY_ROCKET: RocketState = {
  mission: null,
  cleared: [],
  cleanWins: {},
  totalWins: 0,
  coachVisits: 0,
  missionsFlown: 0,
  log: [],
}

export interface RocketAccess {
  nikhilam: boolean
  ekadhikena: boolean
}

/**
 * Nikhilam launches open once Nikhilam Beginner practice is passed (the app's
 * existing game rule). Ekadhikena launches open as soon as its lessons have
 * been opened, as Piyu decided, or once its practice is passed.
 */
export function rocketAccess(progress: ProgressState, isAdmin: boolean): RocketAccess {
  if (isAdmin) return { nikhilam: true, ekadhikena: true }
  const ekaOpened =
    progress.explored.includes('ekadhikena') ||
    progress.history.some((entry) => entry.sutraId === 'ekadhikena' && entry.section === 'theory') ||
    Boolean(progress.mastery.ekadhikena?.beginner)
  return { nikhilam: Boolean(progress.mastery.nikhilam?.beginner), ekadhikena: ekaOpened }
}

export function canFly(access: RocketAccess): boolean {
  return access.nikhilam || access.ekadhikena
}

export function currentRung(state: RocketState, sutra: RocketSutra): RungId {
  const order = RUNG_ORDER[sutra]
  return order.find((rung) => !state.cleared.includes(rung)) ?? order[order.length - 1]
}

export type RungStatus = 'done' | 'now' | 'later'

export function rungStatus(state: RocketState, rung: RungId, sutra: RocketSutra): RungStatus {
  if (state.cleared.includes(rung)) return 'done'
  return currentRung(state, sutra) === rung ? 'now' : 'later'
}

export function missionRungs(state: RocketState, access: RocketAccess): { nikhilam?: RungId; ekadhikena?: RungId } {
  return {
    nikhilam: access.nikhilam ? currentRung(state, 'nikhilam') : undefined,
    ekadhikena: access.ekadhikena ? currentRung(state, 'ekadhikena') : undefined,
  }
}

export function startMission(state: RocketState, seed: number, launches: MissionLaunch[]): RocketState {
  return { ...state, mission: { number: state.missionsFlown + 1, seed, launches, records: [] } }
}

export function missionDone(mission: Mission | null): boolean {
  return Boolean(mission && mission.records.length >= mission.launches.length)
}

export function nextLaunch(mission: Mission | null): MissionLaunch | null {
  if (!mission || missionDone(mission)) return null
  return mission.launches[mission.records.length]
}

/** Stops reached on the current mission: one stop per win. */
export function stopsReached(mission: Mission | null): number {
  return mission ? mission.records.length : 0
}

export function recordWin(state: RocketState, record: LaunchRecord): RocketState {
  if (!state.mission || missionDone(state.mission)) return state
  const mission = { ...state.mission, records: [...state.mission.records, record] }
  const cleanWins = { ...state.cleanWins }
  let cleared = state.cleared
  if (record.clean) {
    cleanWins[record.rung] = (cleanWins[record.rung] ?? 0) + 1
    if (cleanWins[record.rung]! >= CLEAN_WINS_TO_CLEAR && !cleared.includes(record.rung)) cleared = [...cleared, record.rung]
  }
  return {
    ...state,
    mission,
    cleanWins,
    cleared,
    totalWins: state.totalWins + 1,
    missionsFlown: missionDone(mission) ? state.missionsFlown + 1 : state.missionsFlown,
    log: [record, ...state.log].slice(0, 30),
  }
}

/** The coach stops by after every second win. */
export function coachDue(state: RocketState): boolean {
  return state.totalWins > 0 && state.totalWins % 2 === 0
}

export function noteCoachVisit(state: RocketState): RocketState {
  return { ...state, coachVisits: state.coachVisits + 1 }
}

/** The launch the coach replays: the one with the most slips among the last two wins. */
export function debriefPick(records: LaunchRecord[]): LaunchRecord | null {
  const recent = records.slice(0, 2)
  if (!recent.length) return null
  return [...recent].sort((x, y) => y.slips + y.hints - (x.slips + x.hints))[0]
}

export function newSeed(): number {
  return Math.floor(Math.random() * 2_000_000_000)
}
