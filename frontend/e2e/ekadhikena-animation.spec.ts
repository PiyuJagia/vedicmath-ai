import { expect, test } from '@playwright/test'
import { goToMoment, moment, readStage, settle, stage, startFresh, waitForStage, wakeBackend, watchProblems } from './helpers'

/** Expected values worked out independently of the app. */
function ekadhikena(number: number) {
  const previous = Math.floor(number / 10)
  return { previous, next: previous + 1, left: previous * (previous + 1), square: number * number }
}

test.beforeEach(async ({ page }) => {
  await wakeBackend(page)
})

for (const [level, number] of [['beginner', 35], ['intermediate', 115], ['advanced', 1005]] as const) {
  test(`Theory ${number}²: a new learner sees every moment with the right numbers`, async ({ page }) => {
    const watch = watchProblems(page)
    await startFresh(page)
    await page.goto(`/sutras/ekadhikena/theory?level=${level}`)
    await waitForStage(page)
    await expect(page.getByRole('heading', { name: `Example: ${number}²` })).toBeVisible()
    const expected = ekadhikena(number)

    const { total } = await moment(page)
    expect(total).toBe(6)

    await goToMoment(page, 1)
    expect((await readStage(page)).values['tile:input_number']).toBe(String(number))

    await goToMoment(page, 2)
    let shown = await readStage(page)
    expect(shown.values['tile:previous_part']).toBe(String(expected.previous))
    expect(shown.values['tile:last_digit']).toBe('5')
    expect(shown.states['last_digit']).toBe('active')

    await goToMoment(page, 3)
    shown = await readStage(page)
    expect(shown.values['tile:next_number']).toBe(String(expected.next))
    expect(shown.work).toEqual([`${expected.previous} + 1 = ${expected.next}`])

    await goToMoment(page, 4)
    shown = await readStage(page)
    expect(shown.work).toEqual([`${expected.previous} × ${expected.next} = ${expected.left}`])
    expect(shown.values['tile:left_part']).toBe(String(expected.left))

    await goToMoment(page, 5)
    shown = await readStage(page)
    expect(shown.values['tile:left_part']).toBe(String(expected.left))
    expect(shown.values['tile:right_part']).toBe('25')

    await goToMoment(page, 6)
    expect((await readStage(page)).answer).toBe(String(expected.square))
    await settle(page)
    await page.locator('main').screenshot({ path: `e2e/screenshots/ekadhikena-${number}-answer.png` })
    expect(watch.problems).toEqual([])
  })
}

test('Ekadhikena practice: a new learner can answer every step', async ({ page }) => {
  await startFresh(page)
  await page.goto('/sutras/ekadhikena/practice?level=beginner')
  await waitForStage(page)
  const expected = ekadhikena(45)
  await page.getByLabel('Number to square').fill('45')
  await page.getByRole('button', { name: 'Go' }).click()
  await expect(stage(page)).toHaveAttribute('aria-label', /45/)
  const answers = [expected.next, expected.left, 25, expected.square]
  for (const [index, value] of answers.entries()) {
    await expect(page.getByRole('list', { name: `Question ${index + 1} of ${answers.length}` })).toBeVisible()
    await page.locator('#practice-answer').fill(String(value))
    await page.getByRole('button', { name: 'Check' }).click()
  }
  await expect(page.getByText(/Level passed!/)).toBeVisible()
  await expect.poll(async () => (await readStage(page)).answer, { timeout: 60_000 }).toBe(String(expected.square))
})
