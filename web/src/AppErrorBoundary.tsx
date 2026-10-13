import { Component, type ErrorInfo, type ReactNode } from 'react'

export default class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error al mostrar Acadex:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="fatal-error" role="alert" aria-labelledby="fatal-error-title" aria-describedby="fatal-error-description">
          <section>
            <h1 id="fatal-error-title">No fue posible mostrar esta pantalla</h1>
            <p id="fatal-error-description">Recarga la aplicación. Si el problema continúa, informa a soporte con el error registrado en la consola.</p>
            <button type="button" onClick={() => window.location.reload()}>Recargar aplicación</button>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}
