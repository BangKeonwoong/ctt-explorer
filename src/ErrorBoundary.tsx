import { Component, type ReactNode } from 'react'

import {
  BUILD_ID,
  AppLoadError,
  createRuntimeError,
  updateBootDiagnostics,
  type AppErrorSummary,
} from './lib/loaders'

type BoundaryProps = {
  children: ReactNode
  onRetry: () => void
}

type BoundaryState = {
  error: AppLoadError | null
}

function summarizeError(error: AppLoadError): AppErrorSummary {
  return error.toSummary()
}

function ErrorFallback({
  error,
  onRetry,
}: {
  error: AppLoadError
  onRetry: () => void
}) {
  const summary = summarizeError(error)

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="hero-header">
        <div>
          <p className="eyebrow">CTT Explorer</p>
          <h1>앱을 정상적으로 열지 못했습니다</h1>
          <p className="hero-copy">
            빈 화면 대신 복구 가능한 오류 화면을 표시합니다. 아래 정보로 현재
            실패 단계와 원인을 바로 확인할 수 있습니다.
          </p>
        </div>
        <div className="hero-meta">
          <span className="meta-chip">Build {BUILD_ID.split('/').pop() ?? BUILD_ID}</span>
          <span className="meta-chip">Stage {summary.stage}</span>
        </div>
      </header>

      <section className="control-panel error-panel">
        <div className="status error error-card">
          <strong>{summary.message}</strong>
          <p className="source-note">
            데이터 다시 시도 후에도 같은 문제가 반복되면 아래 오류 코드를 함께
            확인하면 됩니다.
          </p>
          <div className="error-actions">
            <button type="button" className="jump-button" onClick={onRetry}>
              데이터 다시 시도
            </button>
            <button
              type="button"
              className="jump-button"
              onClick={() => window.location.reload()}
            >
              새로고침
            </button>
          </div>
          <dl className="detail-grid error-grid">
            <div>
              <dt>오류 코드</dt>
              <dd>{summary.code}</dd>
            </div>
            <div>
              <dt>로드 단계</dt>
              <dd>{summary.stage}</dd>
            </div>
            <div>
              <dt>실패 URL</dt>
              <dd>{summary.url || '—'}</dd>
            </div>
            <div>
              <dt>빌드 ID</dt>
              <dd>{BUILD_ID}</dd>
            </div>
          </dl>
          {summary.details ? (
            <pre className="hierarchy-preview">
              {JSON.stringify(summary.details, null, 2)}
            </pre>
          ) : null}
        </div>
      </section>
    </div>
  )
}

export class AppErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = {
    error: null,
  }

  componentDidMount() {
    window.addEventListener('error', this.handleWindowError)
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleWindowError)
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
  }

  static getDerivedStateFromError(error: unknown): BoundaryState {
    if (error instanceof AppLoadError) {
      return { error }
    }
    return { error: createRuntimeError('runtime-error', error) }
  }

  componentDidCatch(error: unknown) {
    const runtimeError =
      error instanceof AppLoadError
        ? error
        : createRuntimeError('runtime-error', error)
    updateBootDiagnostics({
      state: 'error',
      error: runtimeError.toSummary(),
    })
  }

  handleWindowError = (event: ErrorEvent) => {
    const error = createRuntimeError('runtime-error', event.error ?? event.message)
    updateBootDiagnostics({
      state: 'error',
      error: error.toSummary(),
    })
    this.setState({ error })
  }

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = createRuntimeError('unhandled-rejection', event.reason)
    updateBootDiagnostics({
      state: 'error',
      error: error.toSummary(),
    })
    this.setState({ error })
  }

  handleRetry = () => {
    updateBootDiagnostics({
      state: 'manifest-loading',
      error: null,
    })
    this.setState({ error: null })
    this.props.onRetry()
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />
    }

    return this.props.children
  }
}
