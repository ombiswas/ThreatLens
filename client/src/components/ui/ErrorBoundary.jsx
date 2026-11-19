import React, { Component } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";
import { Button } from "./Button.jsx";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // In production, avoid logging sensitive user details
    console.error("UI Uncaught Error caught by ErrorBoundary:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex min-h-screen flex-col items-center justify-center bg-soc-dark p-6 text-stone-100"
        >
          <div className="w-full max-w-md rounded-xl border border-soc-border bg-soc-surface p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-950/60 text-rose-400">
              <AlertOctagon className="h-6 w-6" aria-hidden="true" />
            </div>

            <h1 className="mt-4 text-lg font-semibold text-stone-100">
              Application Error Encountered
            </h1>
            <p className="mt-2 text-xs text-soc-muted leading-relaxed">
              An unexpected runtime error occurred in the security dashboard interface. State has
              been protected.
            </p>

            {this.state.error && (
              <div className="mt-4 rounded border border-soc-border bg-soc-dark/70 p-3 text-left font-mono text-[11px] text-rose-300">
                {this.state.error.message || "Unknown error"}
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="secondary" size="sm" onClick={this.handleReset}>
                Try Again
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={this.handleReload}
                iconLeft={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
              >
                Reload Application
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
