import { Component } from 'react';

// Catches a failed 3D chunk load (e.g. a stale cached build after a redeploy)
// or a WebGL/three.js error, so the game falls back to the 2D backdrop instead
// of unmounting to a blank page.
export class SceneBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    this.props.onFail?.(error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
