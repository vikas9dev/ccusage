import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(e) { return { error: e } }

  render() {
    if (this.state.error) return (
      <div className="error-boundary">
        <span>⚠️ Failed to render this section</span>
        <button className="btn" onClick={() => this.setState({ error: null })}>Retry</button>
      </div>
    )
    return this.props.children
  }
}
