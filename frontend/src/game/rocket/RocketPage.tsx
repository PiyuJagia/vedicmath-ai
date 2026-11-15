import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Map as MapIcon } from 'lucide-react'
import { friendlyError } from '../../animation/useLesson'
import { CharacterOrchestrator } from '../../characters/CharacterContext'
import { CharacterDialogue, HummingbirdCompanion } from '../../characters/Characters'
import { Breadcrumbs } from '../../components/layout/Breadcrumbs'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Pill } from '../../components/ui/Pill'
import { useProgress } from '../../services/ProgressContext'
import { useSettings } from '../../services/SettingsContext'
import { loadStored, saveStored } from '../../services/storage'
import { fetchMission, fetchRungs, type RungInfo } from './api'
import { Celebration, type CelebrationProps } from './Celebration'
import { CoachVisit } from './CoachVisit'
import { Debrief } from './Debrief'
import { LaunchView } from './LaunchView'
import {
  EMPTY_ROCKET,
  MISSION_NAME,
  RUNG_ORDER,
  WAYPOINTS,
  canFly,
  coachDue,
  debriefPick,
  missionDone,
  missionRungs,
  newSeed,
  nextLaunch,
  noteCoachVisit,
  recordWin,
  rocketAccess,
  rungStatus,
  startMission,
  stopsReached,
  type LaunchRecord,
  type RocketState,
} from './model'
import { RocketColumn } from './parts'
import { birdLine, coachMessage, sutraName } from './voices'
import styles from './Rocket.module.css'

type View = 'home' | 'bay' | 'launch' | 'debrief' | 'map' | 'report'

const STOPS = WAYPOINTS.length - 1

function useRocketState() {
  const [state, setState] = useState<RocketState>(() => loadStored('rocket', EMPTY_ROCKET))
  const commit = useCallback((change: (current: RocketState) => RocketState) => {
    setState((current) => {
      const next = change(current)
      saveStored('rocket', next)
      return next
    })
  }, [])
  return [state, commit] as const
}

export function RocketPage() {
  const { progress } = useProgress()
  const { settings } = useSettings()
  const access = rocketAccess(progress, settings.role === 'admin')
  const [state, commit] = useRocketState()
  const [view, setView] = useState<View>('home')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [celebration, setCelebration] = useState<Omit<CelebrationProps, 'onDone'> | null>(null)
  const [coach, setCoach] = useState<string | null>(null)
  const [replay, setReplay] = useState<LaunchRecord | null>(null)

  const mission = state.mission
  const flying = mission && !missionDone(mission) ? mission : null

  const go = (next: View) => {
    setView(next)
    window.scrollTo({ top: 0 })
  }

  const newMission = async () => {
    setBusy(true)
    setError(null)
    try {
      const seed = newSeed()
      const planned = await fetchMission(seed, missionRungs(state, access))
      commit((current) => startMission(current, seed, planned.launches))
      go('bay')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const toBay = () => (flying ? go('bay') : newMission())

  const win = (record: LaunchRecord) => {
    const after = recordWin(state, record)
    commit(() => after)
    const stop = stopsReached(after.mission)
    const name = WAYPOINTS[stop].name
    setCelebration({
      stop,
      title: `You reached ${stop === STOPS ? 'Mars' : name === 'Moon' ? 'the Moon' : name}!`,
      sub: `${record.label} = ${record.facts.result} · stop ${stop} of ${STOPS} on the ${MISSION_NAME}`,
      bird: birdLine(record, name === 'Moon' ? 'The Moon' : name, STOPS - stop),
    })
  }

  const afterCelebration = () => {
    setCelebration(null)
    if (coachDue(state)) {
      setCoach(coachMessage(state.log.slice(0, 2)))
      commit(noteCoachVisit)
      return
    }
    go(missionDone(state.mission) ? 'report' : 'bay')
  }

  const closeCoach = () => {
    setCoach(null)
    go(missionDone(state.mission) ? 'report' : 'bay')
  }

  const startReplay = () => {
    setReplay(debriefPick(state.log))
    setCoach(null)
    go('debrief')
  }

  if (!canFly(access)) {
    return (
      <CharacterOrchestrator screen="play">
        <div className={styles.page}>
          <Breadcrumbs items={[{ label: 'Play to Win', to: '/play' }, { label: 'Number Rocket' }]} />
          <h1>Number Rocket</h1>
          <Card padding="lg">
            <p>Number Rocket opens when you pass Nikhilam Beginner in Practice with Coach, or open the Ekadhikena lessons.</p>
            <div className={styles.row}>
              <Button to="/sutras/nikhilam/practice?level=beginner">Practise Nikhilam</Button>
              <Button variant="secondary" to="/sutras/ekadhikena/theory?level=beginner">
                Open Ekadhikena
              </Button>
            </div>
          </Card>
        </div>
      </CharacterOrchestrator>
    )
  }

  return (
    <CharacterOrchestrator screen={view === 'debrief' ? 'practice' : 'play'}>
      <div className={styles.page} data-view={view}>
        <Breadcrumbs items={[{ label: 'Play to Win', to: '/play' }, { label: 'Number Rocket' }]} />
        {error && (
          <Card padding="md" className={styles.error} role="alert">
            {error}
          </Card>
        )}

        {view === 'home' && <Home state={state} access={access} busy={busy} onFly={toBay} onMap={() => go('map')} />}

        {view === 'bay' && mission && (
          <Bay state={state} busy={busy} onLaunch={() => go('launch')} onMap={() => go('map')} onReport={() => go('report')} onNew={newMission} />
        )}

        {view === 'launch' && flying && nextLaunch(flying) && (
          <LaunchView
            key={`${flying.number}-${flying.records.length}`}
            launch={nextLaunch(flying)!}
            launchNumber={flying.records.length + 1}
            totalLaunches={flying.launches.length}
            onWin={win}
          />
        )}

        {view === 'debrief' && replay && <Debrief record={replay} onDone={() => go(missionDone(state.mission) ? 'report' : 'bay')} />}

        {view === 'map' && <StarMap state={state} onBack={() => go(flying ? 'bay' : 'home')} />}

        {view === 'report' && mission && <Report state={state} busy={busy} onNew={newMission} onHome={() => go('home')} />}
      </div>

      {celebration && <Celebration {...celebration} onDone={afterCelebration} />}
      {coach && <CoachVisit message={coach} onReplay={startReplay} onClose={closeCoach} />}
    </CharacterOrchestrator>
  )
}

function Home({ state, access, busy, onFly, onMap }: { state: RocketState; access: ReturnType<typeof rocketAccess>; busy: boolean; onFly: () => void; onMap: () => void }) {
  const flying = state.mission && !missionDone(state.mission)
  const stop = flying ? stopsReached(state.mission) : 0
  const bird = flying
    ? stop === 0
      ? 'Your rocket is fuelled. Earth orbit is the first stop!'
      : `Welcome back! You are ${stop} ${stop === 1 ? 'stop' : 'stops'} into the ${MISSION_NAME}. ${WAYPOINTS[stop + 1].name} is next!`
    : state.missionsFlown > 0
      ? `You have flown ${state.missionsFlown} ${state.missionsFlown === 1 ? 'mission' : 'missions'}. Ready for another run to Mars?`
      : 'Six launches stand between you and Mars. Ready?'
  return (
    <>
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>Play to Win · Number Rocket</span>
          <h1>Number Rocket</h1>
          <p>
            Every launch is a multiplication. Pick the engine that fits, then fire it one stage at a time. When the last stage fires, the rocket takes off and you see how far
            you have come.
          </p>
        </div>
        <RocketColumn altitude={20 + stop * 12} label={`Mission: Mars`} />
      </div>
      <div className={styles.grid2}>
        <Card padding="lg" tone="lavender">
          <span className={styles.eyebrow}>Mission · chosen for you</span>
          <h3>{MISSION_NAME} · 6 launches</h3>
          <div className={styles.row}>
            {access.nikhilam && <Pill tone="teal">Nikhilam Beginner</Pill>}
            {access.ekadhikena && <Pill tone="gold">Ekadhikena Beginner</Pill>}
            <Pill tone="neutral">1 × review</Pill>
          </div>
          {access.ekadhikena && !access.nikhilam && <p className={styles.small}>Pass Nikhilam Beginner practice to add pad-engine launches.</p>}
          {access.nikhilam && access.ekadhikena && <p className={styles.small}>Ekadhikena launches appear because you opened its lessons.</p>}
          {access.nikhilam && !access.ekadhikena && <p className={styles.small}>Open the Ekadhikena lessons to add booster launches.</p>}
        </Card>
        <Card padding="lg">
          <span className={styles.eyebrow}>How you fly</span>
          <ul className={styles.list}>
            <li>Each correct stage adds fuel. No countdown.</li>
            <li>Every win flies you to the next stop on the way to Mars.</li>
            <li>Rabbit hops in if you get stuck.</li>
            <li>After every two wins, the coach stops by.</li>
          </ul>
        </Card>
      </div>
      <div className={styles.birdRow}>
        <HummingbirdCompanion size={64} />
        <CharacterDialogue character="hummingbird">{bird}</CharacterDialogue>
      </div>
      <div className={styles.row}>
        <Button onClick={onFly} disabled={busy} icon={<ArrowRight size={16} aria-hidden="true" />}>
          {busy ? 'Planning the mission…' : flying ? 'Go to launch bay' : 'Start a mission'}
        </Button>
        <Button variant="secondary" onClick={onMap} icon={<MapIcon size={16} aria-hidden="true" />}>
          See the star map
        </Button>
      </div>
    </>
  )
}

function Bay({ state, busy, onLaunch, onMap, onReport, onNew }: { state: RocketState; busy: boolean; onLaunch: () => void; onMap: () => void; onReport: () => void; onNew: () => void }) {
  const mission = state.mission!
  const done = missionDone(mission)
  const stop = stopsReached(mission)
  const next = nextLaunch(mission)
  return (
    <>
      <div className={styles.launchHead}>
        <div>
          <span className={styles.eyebrow}>Mission {mission.number}</span>
          <h2>Launch bay · {MISSION_NAME}</h2>
        </div>
        <Pill tone="teal">
          Stop {stop} of {STOPS} reached
        </Pill>
      </div>
      <div className={styles.bay}>
        <RocketColumn altitude={20 + stop * 12} />
        <div className={styles.bayMain}>
          <div className={styles.table}>
            <table>
              <thead>
                <tr>
                  <th>Launch</th>
                  <th>Engine</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {mission.launches.map((launch, i) => {
                  const record = mission.records[i]
                  return (
                    <tr key={i} data-next={i === mission.records.length || undefined}>
                      <td>
                        <b>{launch.label}</b>
                        {launch.review && <span className={styles.small}> · review</span>}
                      </td>
                      <td>{record ? (launch.engine === 'pad' ? 'Pad · Nikhilam' : 'Booster · Ekadhikena') : i === mission.records.length ? 'You choose' : '?'}</td>
                      <td>
                        {record
                          ? `Reached ${WAYPOINTS[i + 1].name}${record.clean ? ' · clean' : ''}`
                          : i === mission.records.length
                            ? `Next stop: ${WAYPOINTS[i + 1].name}`
                            : `Then: ${WAYPOINTS[i + 1].name}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className={styles.row}>
            {next && <Button onClick={onLaunch}>Launch {next.label}</Button>}
            {done && <Button onClick={onReport}>Flight report</Button>}
            {done && (
              <Button variant="secondary" onClick={onNew} disabled={busy}>
                New mission
              </Button>
            )}
            <Button variant="ghost" onClick={onMap}>
              Star map
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

function StarMap({ state, onBack }: { state: RocketState; onBack: () => void }) {
  const [rungs, setRungs] = useState<RungInfo[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    fetchRungs()
      .then((body) => !cancelled && setRungs(body.rungs))
      .catch((err: unknown) => !cancelled && setError(friendlyError(err)))
    return () => {
      cancelled = true
    }
  }, [])
  const column = (sutra: 'nikhilam' | 'ekadhikena', title: string) => (
    <Card padding="lg">
      <span className={styles.eyebrow}>{title}</span>
      <div className={styles.rungs}>
        {RUNG_ORDER[sutra].map((id) => {
          const info = rungs?.find((rung) => rung.id === id)
          const status = rungStatus(state, id, sutra)
          return (
            <div key={id} className={styles.rung} data-status={status}>
              <span className={styles.rungId}>{id}</span>
              <span>
                {info ? `${info.name}: ${info.skill}` : id}
                <br />
                <span className={styles.small}>{info?.example}</span>
              </span>
              <Pill tone={status === 'done' ? 'teal' : status === 'now' ? 'purple' : 'neutral'}>{status === 'done' ? 'reached' : status === 'now' ? 'next' : 'later'}</Pill>
            </div>
          )
        })}
      </div>
    </Card>
  )
  return (
    <>
      <div>
        <span className={styles.eyebrow}>Difficulty progression</span>
        <h2>Star map: rungs inside Beginner</h2>
        <p className={styles.small}>
          Missions show progress inside one flight. The star map shows skill progress across flights: two clean launches on a rung open the next one. Beginner, Intermediate and
          Advanced rings still come only from Practice with Coach.
        </p>
      </div>
      {error && (
        <Card padding="md" className={styles.error} role="alert">
          {error}
        </Card>
      )}
      <div className={styles.grid2}>
        {column('nikhilam', 'Nikhilam · Beginner (pad 100, 90 to 109)')}
        {column('ekadhikena', 'Ekadhikena · Beginner (2 digits, ends in 5)')}
      </div>
      <div className={styles.row}>
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
      </div>
    </>
  )
}

function Report({ state, busy, onNew, onHome }: { state: RocketState; busy: boolean; onNew: () => void; onHome: () => void }) {
  const mission = state.mission!
  const records = mission.records
  const hints = records.reduce((sum, record) => sum + record.hints, 0)
  const clean = records.filter((record) => record.clean).length
  const engines = records.filter((record) => record.engineRight).length
  const byRung = new Map<string, LaunchRecord[]>()
  records.forEach((record) => byRung.set(record.rung, [...(byRung.get(record.rung) ?? []), record]))
  const slipped = records.filter((record) => record.mistakes.includes('sign'))
  const coachLine = slipped.length
    ? `You learned to watch the sign: numbers above 100 have deviations below zero. Next time, say it before you type, and ${slipped[0].label} will feel easy.`
    : clean === records.length
      ? 'Six clean launches. You found the friendly number every time. Try the next rung on the star map!'
      : 'You kept going when a stage was tricky. That is how the small sums become easy.'
  return (
    <>
      <div>
        <span className={styles.eyebrow}>Flight report</span>
        <h2>{MISSION_NAME} · what you learned</h2>
      </div>
      <div className={styles.grid3}>
        <Card padding="lg" tone="lavender">
          <span className={styles.eyebrow}>Launches</span>
          <span className={styles.big}>
            {records.length} / {mission.launches.length}
          </span>
          <p className={styles.small}>
            {missionDone(mission) ? 'Mars reached' : 'Still flying'} · {engines} with the right engine first time
          </p>
        </Card>
        <Card padding="lg" tone="lavender">
          <span className={styles.eyebrow}>Rabbit hints</span>
          <span className={styles.big}>{hints}</span>
          <p className={styles.small}>{clean} clean launches</p>
        </Card>
        <Card padding="lg" tone="lavender">
          <span className={styles.eyebrow}>Coach visits</span>
          <span className={styles.big}>{Math.floor(records.length / 2)}</span>
          <p className={styles.small}>One after every two wins</p>
        </Card>
      </div>
      <Card padding="lg">
        <span className={styles.eyebrow}>Rungs you flew</span>
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>Rung</th>
                <th>Launches</th>
                <th>Clean</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...byRung.entries()].map(([rung, list]) => (
                <tr key={rung}>
                  <td>
                    {rung} · {sutraName(list[0])}
                  </td>
                  <td>{list.map((record) => record.label).join(', ')}</td>
                  <td>
                    {list.filter((record) => record.clean).length} of {list.length}
                  </td>
                  <td>{state.cleared.includes(list[0].rung) ? 'reached' : 'keep practising'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className={styles.birdRow}>
        <HummingbirdCompanion size={64} />
        <CharacterDialogue character="hummingbird">{coachLine}</CharacterDialogue>
      </div>
      <div className={styles.row}>
        <Button onClick={onNew} disabled={busy}>
          {busy ? 'Planning…' : 'Fly another mission'}
        </Button>
        <Button variant="secondary" onClick={onHome}>
          Back to Number Rocket
        </Button>
      </div>
    </>
  )
}
