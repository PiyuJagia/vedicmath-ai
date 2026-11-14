/**
 * Development-only persistence in the browser. This is not the production
 * database; it keeps sample settings and progress between page reloads.
 */
const PREFIX = 'vedicmath-ai:'

export function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<T>) } : fallback
  } catch {
    return fallback
  }
}

export function saveStored<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable (private mode); the app still works without it.
  }
}
