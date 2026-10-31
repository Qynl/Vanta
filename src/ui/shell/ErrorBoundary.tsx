import { Component, type ErrorInfo, type ReactNode } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("VANTA interface fault", error, info.componentStack);
  }

  private retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="shell flex min-h-[68vh] items-center py-20">
        <div className="hud-panel w-full max-w-3xl p-7 md:p-10">
          <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.24em] text-signal">
            <span className="h-1.5 w-1.5 bg-signal" aria-hidden="true" />
            Interface fault / 01
          </div>
          <h1 className="mt-7 font-display text-[clamp(3.5rem,8vw,6.5rem)] leading-[0.84] font-medium uppercase">
            <span className="block">Control link</span>{' '}
            <span className="block text-signal">lost.</span>
          </h1>
          <p className="mt-6 max-w-lg text-sm leading-6 text-muted">
            This view could not be rendered. Retry the interface, or reload the
            arena shell if the fault persists.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.retry}
              className="inline-flex h-11 items-center gap-3 bg-volt px-5 font-mono text-[10px] tracking-[0.16em] text-void uppercase transition-colors hover:bg-bone"
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              Retry interface
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center gap-3 border border-line px-5 font-mono text-[10px] tracking-[0.16em] text-muted uppercase transition-colors hover:border-bone hover:text-bone"
            >
              Reload shell
            </button>
            <a
              href="/"
              className="inline-flex h-11 items-center gap-3 px-3 font-mono text-[10px] tracking-[0.16em] text-muted uppercase transition-colors hover:text-volt"
            >
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
              Arena
            </a>
          </div>
        </div>
      </div>
    );
  }
}
