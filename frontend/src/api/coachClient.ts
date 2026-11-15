import type { CharacterId } from '../characters/registry'
import type { Role } from '../services/settingsModel'
import { API_BASE, ApiError, describeError } from './client'
import type {
  AnimationResolveRequest,
  CalculateRequest,
  CalculateResponse,
  CoachCharacterId,
  CoachChatHistoryItem,
  CoachChatRequest,
  CoachChatResponse,
  CoachHandoffResponse,
  CreateSessionResponse,
  HandoffErrorBody,
} from './coachTypes'

const SESSION_STORAGE_KEY = 'vedicmath_coach_session_id'
const HISTORY_STORAGE_KEY = 'vedicmath_coach_chat_history'

/**
 * Live ADK Rishi coaching — on by default for learners.
 * Emergency disable: VITE_COACH_LIVE=false (or legacy VITE_COACH_HANDOFF=false).
 * Explicit force-on: VITE_COACH_LIVE=true / VITE_COACH_HANDOFF=true.
 */
export function isLiveCoachEnabled(_role?: Role): boolean {
  const live = import.meta.env.VITE_COACH_LIVE
  const handoff = import.meta.env.VITE_COACH_HANDOFF
  if (live === 'false' || handoff === 'false') return false
  if (live === 'true' || handoff === 'true') return true
  return true
}

/** @deprecated Use isLiveCoachEnabled — kept for older call sites/tests. */
export function isCoachHandoffEnabled(role: Role): boolean {
  return isLiveCoachEnabled(role)
}

export function mapCoachCharacter(id: CoachCharacterId): CharacterId {
  if (id === 'boy_coach') return 'boy'
  return id
}

function readStoredSessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStoredSessionId(sessionId: string): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId)
  } catch {
    // Private mode / blocked storage — still usable for this page load via memory.
  }
}

let memorySessionId: string | null = null

export function clearCoachSession(): void {
  memorySessionId = null
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    sessionStorage.removeItem(HISTORY_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function loadCoachChatHistory(): CoachChatHistoryItem[] {
  try {
    const raw = sessionStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as CoachChatHistoryItem[]) : []
  } catch {
    return []
  }
}

export function saveCoachChatHistory(items: CoachChatHistoryItem[]): void {
  try {
    sessionStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(-40)))
  } catch {
    /* ignore */
  }
}

function handoffDetailMessage(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('detail' in body)) return null
  const detail = (body as { detail: unknown }).detail
  if (typeof detail === 'object' && detail !== null && 'message' in detail) {
    const message = (detail as HandoffErrorBody).message
    if (typeof message === 'string' && message.trim()) return message
  }
  // FastAPI / Pydantic 422 list — keep coach errors distinct from lesson number validation.
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown }
    if (typeof first?.msg === 'string' && first.msg.trim()) {
      return `Coach request invalid: ${first.msg}`
    }
    return 'Coach request was rejected by the server. Please try again.'
  }
  return null
}

async function coachRequest(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, init)
  } catch {
    throw new ApiError('The maths engine is not reachable. Is the Python backend running?', 0)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    const handoffMessage = handoffDetailMessage(body)
    if (handoffMessage) throw new ApiError(handoffMessage, response.status)
    if (response.status >= 500 && body === null) {
      throw new ApiError('The maths engine is not reachable. Is the Python backend running?', response.status)
    }
    throw new ApiError(describeError(response.status, body), response.status)
  }
  return body
}

export async function createCoachSession(): Promise<string> {
  const body = (await coachRequest('/coach/sessions', { method: 'POST' })) as CreateSessionResponse
  memorySessionId = body.session_id
  writeStoredSessionId(body.session_id)
  return body.session_id
}

/** Return the retained session id, creating one when missing. */
export async function ensureCoachSession(): Promise<string> {
  const existing = memorySessionId ?? readStoredSessionId()
  if (existing) {
    memorySessionId = existing
    return existing
  }
  return createCoachSession()
}

export async function createCoachCalculation(
  request: Omit<CalculateRequest, 'session_id'> & { session_id?: string },
): Promise<CalculateResponse> {
  const session_id = request.session_id ?? (await ensureCoachSession())
  return (await coachRequest('/coach/calculations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, session_id }),
  })) as CalculateResponse
}

export async function resolveCoachAnimation(
  request: Omit<AnimationResolveRequest, 'session_id'> & { session_id?: string },
): Promise<CoachHandoffResponse> {
  const session_id = request.session_id ?? (await ensureCoachSession())
  return (await coachRequest('/coach/animations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, session_id }),
  })) as CoachHandoffResponse
}

export async function sendCoachChat(
  request: Omit<CoachChatRequest, 'session_id'> & { session_id?: string },
): Promise<CoachChatResponse> {
  const session_id = request.session_id ?? (await ensureCoachSession())
  const payload: CoachChatRequest = {
    session_id,
    message: request.message,
    animation_intent: request.animation_intent ?? null,
    calculation_id: request.calculation_id ?? null,
    context: request.context ?? null,
  }
  return (await coachRequest('/coach/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })) as CoachChatResponse
}
