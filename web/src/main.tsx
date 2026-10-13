import { StrictMode, type ReactElement } from 'react'
import App from './App'
import AppErrorBoundary from './AppErrorBoundary'

export function AppRoot(): ReactElement {
  return (
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>
  )
}
