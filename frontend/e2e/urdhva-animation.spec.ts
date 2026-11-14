import { expect, test } from '@playwright/test'
import { distanceToBox, goToMoment, moment, readStage, settle, startFresh, waitForStage, wakeBackend, watchProblems } from './helpers'

type Shown = Awaited<ReturnType<typeof readStage>>

/** A line must start on the first tile and end on the second. */
function expectLineJoins(shown: Shown, lineId: string, fromTile: string, toTile: string) {
  const line = shown.lines.find((candidate) => candidate.id === lineId)
  expect(line, `line ${lineId}`).toBeTruthy()
  expect(distanceToBox(line!.x1, line!.y1, shown.boxes[fromTile]!)).toBeLessThan(4)
  expect(distanceToBox(line!.x2, line!.y2, shown.boxes[toTile]!)).toBeLessThan(4)
}

test('Theory 23 × 14: vertical, crosswise and final stages', async ({ page }) => {
  const watch = watchProblems(page)
  await wakeBackend(page)
  // Urdhva is locked until Nikhilam beginner is passed; admin opens it directly.
  await startFresh(page, { admin: true })
  await page.goto('/sutras/urdhva/theory?level=beginner')
  await waitForStage(page)
  await expect(page.getByRole('heading', { name: 'Example: 23 × 14' })).toBeVisible()
  expect(23 * 14).toBe(322)

  const { total } = await moment(page)
  expect(total).toBe(11)
  for (let index = 1; index <= total; index++) {
    await goToMoment(page, index)
    await settle(page)
    await page.locator('main').screenshot({ path: `e2e/screenshots/urdhva-23x14/moment-${String(index).padStart(2, '0')}.png` })
  }

  // Digits are in their own tiles, lined up by place value.
  await goToMoment(page, 1)
  let shown = await readStage(page)
  expect([shown.values['tile:a-0'], shown.values['tile:a-1'], shown.values['tile:b-0'], shown.values['tile:b-1']]).toEqual(['2', '3', '1', '4'])
  expect(Math.abs(shown.boxes['a-1']!.cx - shown.boxes['b-1']!.cx)).toBeLessThan(1)
  expect(Math.abs(shown.boxes['a-0']!.cx - shown.boxes['b-0']!.cx)).toBeLessThan(1)

  // Vertical stage: 3 × 4 = 12, write 2, carry 1.
  await goToMoment(page, 2)
  shown = await readStage(page)
  expect(Object.entries(shown.states).filter(([, state]) => state === 'active').map(([id]) => id)).toEqual(['a-1', 'b-1'])
  expect(shown.work).toEqual(['3 × 4 = 12'])
  expectLineJoins(shown, 'pair-1-1', 'a-1', 'b-1')

  await goToMoment(page, 3)
  shown = await readStage(page)
  expect(shown.work).toEqual(['Total 12', 'write 2    carry 1'])
  expect(shown.values['tile:answer-1']).toBe('2')
  expect(shown.carries).toEqual([{ id: 'lane-2', value: '1', ghost: false }])
  expect(Math.abs(shown.boxes['lane-2']!.cx - shown.boxes['answer-2']!.cx)).toBeLessThan(1)

  // Crosswise stage: (2 × 4) + (3 × 1) + 1 = 12, write 2, carry 1.
  await goToMoment(page, 4)
  shown = await readStage(page)
  expect(shown.work).toEqual(['3 × 1 = 3', '2 × 4 = 8', '3 + 8 = 11'])
  expectLineJoins(shown, 'pair-1-0', 'a-1', 'b-0')
  expectLineJoins(shown, 'pair-0-1', 'a-0', 'b-1')
  expect(shown.carries).toEqual([{ id: 'lane-2', value: '1', ghost: false }])

  await goToMoment(page, 5)
  shown = await readStage(page)
  expect(shown.work[3]).toBe('11 + 1 = 12')
  expect(shown.carries).toEqual([{ id: 'lane-2', value: '1', ghost: true }])
  expect(shown.moving).toEqual(['1'])

  await goToMoment(page, 6)
  shown = await readStage(page)
  expect(shown.values['tile:answer-2']).toBe('2')
  expect(shown.carries).toEqual([{ id: 'lane-3', value: '1', ghost: false }])

  // Final stage: (2 × 1) + 1 = 3.
  await goToMoment(page, 7)
  shown = await readStage(page)
  expect(shown.work).toEqual(['2 × 1 = 2'])
  expectLineJoins(shown, 'pair-0-0', 'a-0', 'b-0')

  await goToMoment(page, 8)
  expect((await readStage(page)).work[1]).toBe('2 + 1 = 3')

  await goToMoment(page, 9)
  shown = await readStage(page)
  expect([shown.values['tile:answer-3'], shown.values['tile:answer-2'], shown.values['tile:answer-1']]).toEqual(['3', '2', '2'])
  expect(shown.carries).toEqual([])

  await goToMoment(page, 11)
  expect((await readStage(page)).answer).toBe('322')
  expect(watch.problems).toEqual([])
})

test('Larger Urdhva problems keep digits aligned: 87 × 877 and 1234 × 5678', async ({ page }) => {
  await wakeBackend(page)
  await startFresh(page, { admin: true })
  for (const [path, a, b] of [
    ['/sutras/urdhva/learn?level=intermediate&example=2', 87, 877],
    ['/sutras/urdhva/learn?level=advanced&example=1', 1234, 5678],
  ] as const) {
    await page.goto(path)
    await waitForStage(page)
    const shown = await readStage(page)
    const digitsA = String(a).split('')
    const digitsB = String(b).split('')
    digitsA.forEach((digit, index) => expect(shown.values[`tile:a-${index}`]).toBe(digit))
    digitsB.forEach((digit, index) => expect(shown.values[`tile:b-${index}`]).toBe(digit))
    // Units digits share a column even when the numbers have different lengths.
    expect(Math.abs(shown.boxes[`a-${digitsA.length - 1}`]!.cx - shown.boxes[`b-${digitsB.length - 1}`]!.cx)).toBeLessThan(1)
    const { total } = await moment(page)
    await goToMoment(page, total)
    expect((await readStage(page)).answer).toBe(String(a * b))
  }
})
