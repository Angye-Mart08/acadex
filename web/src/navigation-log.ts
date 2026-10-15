export type NavigationLogEntry = {
  timestamp: string
  role: string
  view: string
}

/**
 * Emits a development-only navigation trace for browser tooling.
 * It intentionally excludes user identity, tokens, query strings and form data.
 */
export function logNavigation(role: string, view: string) {
  if (!import.meta.env.DEV) return

  const entry: NavigationLogEntry = {
    timestamp: new Date().toISOString(),
    role,
    view,
  }

  console.debug('[Acadex navigation]', entry)
  window.dispatchEvent(new CustomEvent<NavigationLogEntry>('acadex:navigation', { detail: entry }))
}
