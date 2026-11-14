import { expect, test, type Page } from '@playwright/test'
import { chooseLevel, readStage, startFresh, waitForStage, wakeBackend, watchProblems } from './helpers'

/** Independent expected answers for Nikhilam with deviation = base - number. */
function nikhilamAnswers(a: number, b: number, base: number) {
  const zeros = String(base).length - 1
  const devA = base - a
  const devB = base - b
  const left = a - devB
  const right = devA * devB
  let leftAfter = left
  let rightAfter = right
  while (rightAfter < 0) {
    rightAfter += base
    leftAfter -= 1
  }
  while (rightAfter >= base) {
    rightAfter -= base
    leftAfter += 1
  }
  const padded = String(rightAfter).padStart(zeros, '0')
  const answers: [string, string][] = [
    [`Deviation of ${a}`, String(devA)],
    [`Deviation of ${b}`, String(devB)],
    ['Left part', String(left)],
    ['Right part', String(right)],
  ]
  if (leftAfter !== left) {
    answers.push(['Adjusted left part', String(leftAfter)], ['Adjusted right part', String(rightAfter)])
  }
  if (padded !== String(rightAfter)) answers.push(['Right part, padded', padded])
  answers.push([`${a} × ${b}`, String(a * b)])
  expect(Number(`${leftAfter}${padded}`)).toBe(a * b)
  return answers
}

async function answer(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true })
  await expect(input).toBeVisible()
  await input.fill(value)
  await page.getByRole('button', { name: 'Check' }).click()
}

async function solve(page: Page, answers: [string, string][]) {
  for (const [label, value] of answers) {
    await answer(page, label, value)
    if (answers[answers.length - 1][0] !== label) await expect(page.getByLabel(label, { exact: true })).toHaveCount(0)
  }
  await expect(page.getByText(/Level passed!/)).toBeVisible()
}

/** After each correct answer the stage replays the revealed moments, so the final answer arrives a little later. */
async function expectFinalAnswer(page: Page, expected: string) {
  await expect.poll(async () => (await readStage(page)).answer, { timeout: 60_000 }).toBe(expected)
}

test.beforeEach(async ({ page }) => {
  await wakeBackend(page)
})

test('Nikhilam beginner practice: feedback, hints, retries and passing', async ({ page }) => {
  const watch = watchProblems(page)
  const checks: { body: Record<string, unknown>; result: Record<string, unknown> }[] = []
  page.on('response', async (response) => {
    if (response.url().endsWith('/sutras/nikhilam/check')) {
      checks.push({ body: JSON.parse(response.request().postData() ?? '{}'), result: await response.json() })
    }
  })

  await startFresh(page)
  await page.goto('/explore')
  await expect(page.getByRole('button', { name: /Urdhva Tiryagbhyam/ })).toBeVisible()

  await page.goto('/sutras/nikhilam/practice?level=beginner')
  await waitForStage(page)
  const answers = nikhilamAnswers(98, 93, 100)

  // Empty answers are not sent to the backend.
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByText('Type your answer first, then press Check.')).toBeVisible()
  expect(checks).toHaveLength(0)

  // Not a number.
  await answer(page, 'Deviation of 98', 'abc')
  await expect(page.getByText(/Enter a whole number/)).toBeVisible()

  // Old sign convention gets a specific nudge, and the rabbit offers help.
  await answer(page, 'Deviation of 98', '-2')
  await expect(page.getByText(/Check the sign/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ask the rabbit for a hint' })).toBeVisible()
  await page.getByRole('button', { name: 'Hint', exact: true }).click()
  await expect(page.getByText('Hint 1 of 3')).toBeVisible()
  await page.getByRole('button', { name: 'Hint', exact: true }).click()
  await expect(page.getByText('Hint 2 of 3')).toBeVisible()

  // The answer is never shown on screen, even though the API returns it.
  expect(checks.at(-1)?.result.correct_answer).toBe('2')
  await expect(page.locator('main')).not.toContainText('correct answer is')

  await solve(page, answers)
  expect(checks.filter((check) => check.result.is_correct === true)).toHaveLength(answers.length)
  await expectFinalAnswer(page, String(98 * 93))

  // Passing beginner earns beginner only, unlocks Urdhva and the beginner games.
  await page.goto('/explore')
  await expect(page.getByRole('img', { name: 'Nikhilam mastery: Beginner passed, Intermediate not yet passed, Advanced not yet passed' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /Urdhva Tiryagbhyam/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Ekadhikena Purvena/ })).toBeVisible()

  await page.goto('/play')
  await expect(page.getByText('Unlocked').first()).toBeVisible()
  await chooseLevel(page, 'Intermediate')
  await expect(page.getByText(/Pass Nikhilam Intermediate practice to unlock/).first()).toBeVisible()

  expect(watch.problems.filter((problem) => !problem.includes('HTTP 400'))).toEqual([])
})

test('Mixed-sign borrow typed by the learner: 98 × 103', async ({ page }) => {
  await startFresh(page)
  await page.goto('/sutras/nikhilam/practice?level=beginner')
  await waitForStage(page)
  await page.getByLabel('First number').fill('98')
  await page.getByLabel('Second number').fill('103')
  await page.getByRole('button', { name: 'Go' }).click()
  await expect(page.getByLabel('Deviation of 98', { exact: true })).toBeVisible()
  const answers = nikhilamAnswers(98, 103, 100)
  expect(answers.map(([label]) => label)).toContain('Adjusted left part')
  await solve(page, answers)
  await expectFinalAnswer(page, '10094')
})

test('Intermediate padding: 1002 × 1003 needs 006', async ({ page }) => {
  await startFresh(page)
  await page.goto('/sutras/nikhilam/practice?level=intermediate')
  await waitForStage(page)
  await page.getByLabel('First number').fill('1002')
  await page.getByLabel('Second number').fill('1003')
  await page.getByRole('button', { name: 'Go' }).click()
  const answers = nikhilamAnswers(1002, 1003, 1000)
  expect(answers).toContainEqual(['Right part, padded', '006'])

  // Missing zeros get a specific message.
  for (const [label, value] of answers.slice(0, 4)) await answer(page, label, value)
  await answer(page, 'Right part, padded', '6')
  await expect(page.getByText(/needs exactly 3 digits/)).toBeVisible()
  await solve(page, answers.slice(4))
  await expectFinalAnswer(page, '1005006')
})

test('Numbers outside the level are rejected with the backend message', async ({ page }) => {
  await startFresh(page)
  await page.goto('/sutras/nikhilam/practice?level=beginner')
  await waitForStage(page)
  await page.getByLabel('First number').fill('50')
  await page.getByLabel('Second number').fill('97')
  await page.getByRole('button', { name: 'Go' }).click()
  await expect(page.getByText('beginner requires numbers between 90 and 109.')).toBeVisible()

  await page.getByLabel('First number').fill('9x')
  await page.getByRole('button', { name: 'Go' }).click()
  await expect(page.getByText('Please enter whole numbers.')).toBeVisible()
})
