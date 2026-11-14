import { expect, test } from '@playwright/test'
import { distanceToBox, goToMoment, moment, readStage, settle, signed, startFresh, waitForStage, wakeBackend, watchProblems } from './helpers'

/** Expected values worked out independently of the app. */
function nikhilam(a: number, b: number, base: number) {
  const devA = base - a
  const devB = base - b
  return { devA, devB, left: a - devB, right: devA * devB, product: a * b }
}

test.beforeEach(async ({ page }) => {
  await wakeBackend(page)
})

test('Theory 98 × 97: every moment shows the right numbers', async ({ page }) => {
  const watch = watchProblems(page)
  await startFresh(page)
  await page.goto('/sutras/nikhilam/theory?level=beginner')
  await waitForStage(page)
  await expect(page.getByRole('heading', { name: 'Example: 98 × 97' })).toBeVisible()

  const expected = nikhilam(98, 97, 100)
  const { total } = await moment(page)
  expect(total).toBe(13)

  for (let index = 1; index <= total; index++) {
    await goToMoment(page, index)
    const shown = await readStage(page)
    await settle(page)
    await page.locator('main').screenshot({ path: `e2e/screenshots/nikhilam-98x97/moment-${String(index).padStart(2, '0')}.png` })

    expect(shown.values['tile:number_a']).toBe('98')
    expect(shown.values['tile:number_b']).toBe('97')
    if (shown.base) expect(shown.base).toBe('100')
    if (shown.values['chip:deviation_a']) expect(shown.values['chip:deviation_a']).toBe(signed(expected.devA))
    if (shown.values['chip:deviation_b']) expect(shown.values['chip:deviation_b']).toBe(signed(expected.devB))
    // The explanation under the stage always matches what the stage shows.
    await expect(page.locator('p[aria-live="polite"]').first()).toContainText(shown.label.split('.')[0].replace(/\u2212/g, '−'))
  }

  await goToMoment(page, 3)
  expect((await readStage(page)).work).toEqual(['100 - 98 = +2'])
  await goToMoment(page, 5)
  expect((await readStage(page)).work).toEqual(['100 - 97 = +3'])

  await goToMoment(page, 6)
  let shown = await readStage(page)
  expect(shown.work).toEqual(['98 - 3 = 95'])
  const crossA = shown.lines.find((line) => line.id === 'cross-a')!
  expect(distanceToBox(crossA.x1, crossA.y1, shown.boxes.number_a!)).toBeLessThan(3)
  expect(distanceToBox(crossA.x2, crossA.y2, shown.boxes.deviation_b!)).toBeLessThan(8)

  await goToMoment(page, 7)
  shown = await readStage(page)
  expect(shown.work).toEqual(['98 - 3 = 95', '97 - 2 = 95'])
  const crossB = shown.lines.find((line) => line.id === 'cross-b')!
  expect(distanceToBox(crossB.x1, crossB.y1, shown.boxes.number_b!)).toBeLessThan(3)
  expect(distanceToBox(crossB.x2, crossB.y2, shown.boxes.deviation_a!)).toBeLessThan(8)
  expect(shown.lines.find((line) => line.id === 'cross-a')!.faded).toBe(true)

  await goToMoment(page, 8)
  expect((await readStage(page)).values['tile:left_part']).toBe(String(expected.left))

  await goToMoment(page, 9)
  shown = await readStage(page)
  expect(shown.work).toEqual([`2 × 3 = ${expected.right}`])
  expect(shown.lines.map((line) => line.id)).toEqual(['multiply'])

  await goToMoment(page, 10)
  shown = await readStage(page)
  expect([shown.values['tile:right_cell_0'], shown.values['tile:right_cell_1']]).toEqual(['', '6'])

  await goToMoment(page, 11)
  shown = await readStage(page)
  expect([shown.values['tile:right_cell_0'], shown.values['tile:right_cell_1']]).toEqual(['0', '6'])
  expect(shown.work).toEqual(['6  becomes  06'])

  await goToMoment(page, 13)
  expect((await readStage(page)).answer).toBe(String(expected.product))
  expect(watch.problems).toEqual([])
})

test('Previous and Next return to exactly the same picture', async ({ page }) => {
  await startFresh(page)
  await page.goto('/sutras/nikhilam/theory?level=beginner')
  await waitForStage(page)
  await goToMoment(page, 7)
  const before = await readStage(page)
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('button', { name: 'Previous', exact: true }).click()
  expect(await readStage(page)).toEqual(before)

  await page.getByRole('button', { name: 'Restart' }).click()
  await page.getByRole('button', { name: 'Pause' }).click()
  expect((await moment(page)).current).toBeLessThanOrEqual(2)
})

test('Play advances by itself and Pause stops it', async ({ page }) => {
  await startFresh(page)
  await page.goto('/sutras/nikhilam/theory?level=beginner')
  await waitForStage(page)
  await page.getByRole('button', { name: 'Play' }).click()
  await expect.poll(async () => (await moment(page)).current, { timeout: 15_000 }).toBeGreaterThan(2)
  await page.getByRole('button', { name: 'Pause' }).click()
  const paused = (await moment(page)).current
  await page.waitForTimeout(4000)
  expect((await moment(page)).current).toBe(paused)
})

test("Let's Learn More resets cleanly when the example changes", async ({ page }) => {
  await startFresh(page)
  await page.goto('/sutras/nikhilam/learn?level=beginner')
  await waitForStage(page)
  await goToMoment(page, 7)
  expect((await readStage(page)).values['tile:number_a']).toBe('96')

  await page.getByRole('tab', { name: /Example 2/ }).click()
  await expect(page.getByText(/moment 1 of/)).toBeVisible()
  const shown = await readStage(page)
  expect(shown.values['tile:number_a']).toBe('103')
  expect(shown.values['tile:number_b']).toBe('104')
  expect(shown.values['chip:deviation_a']).toBeUndefined()
  expect(shown.work).toEqual([])
  expect(JSON.stringify(shown.values)).not.toContain('96')
})

test('Borrow example 98 × 103 shows the adjustment step', async ({ page }) => {
  await startFresh(page)
  await page.goto('/sutras/nikhilam/learn?level=beginner&example=3')
  await waitForStage(page)
  const expected = nikhilam(98, 103, 100)
  expect([expected.devA, expected.devB, expected.left, expected.right]).toEqual([2, -3, 101, -6])

  await goToMoment(page, 4)
  expect((await readStage(page)).values['chip:deviation_a']).toBe('+2')
  await goToMoment(page, 10)
  let shown = await readStage(page)
  expect(shown.values['tile:right_part']).toBe('-6')
  expect(shown.states.right_part).toBe('warn')
  await goToMoment(page, 11)
  shown = await readStage(page)
  await settle(page)
  await page.locator('main').screenshot({ path: 'e2e/screenshots/nikhilam-98x103-borrow.png' })
  expect(shown.carries).toEqual([{ id: 'adjust', value: '1', ghost: false }])
  expect(shown.values['tile:left_part']).toBe('100')
  expect(shown.values['tile:right_part']).toBe('94')
  expect(shown.work).toEqual(['101 - 1 = 100', '(-6) + 100 = 94'])
  await goToMoment(page, 13)
  expect((await readStage(page)).answer).toBe(String(expected.product))
})

test('Intermediate and advanced Theory use bases 1000 and 10000', async ({ page }) => {
  await startFresh(page)
  for (const [level, a, b, base] of [
    ['intermediate', 998, 997, 1000],
    ['advanced', 9998, 9997, 10000],
  ] as const) {
    await page.goto(`/sutras/nikhilam/theory?level=${level}`)
    await waitForStage(page)
    await expect(page.getByRole('heading', { name: `Example: ${a} × ${b}` })).toBeVisible()
    await goToMoment(page, 2)
    expect((await readStage(page)).base).toBe(String(base))
    const { total } = await moment(page)
    await goToMoment(page, total)
    expect((await readStage(page)).answer).toBe(String(a * b))
  }
})
