import type { AuthenticatedSession } from './auth.js'

declare global {
  namespace Express {
    interface Request {
      requestId: string
      session: AuthenticatedSession
    }
  }
}

export {}
