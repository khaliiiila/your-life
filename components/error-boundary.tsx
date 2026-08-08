"use client";

import { RotateCw } from "lucide-react";
import React from "react";

class ErrorBoundary extends React.Component<{ children: React.ReactNode; onRetry?: () => void }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode; onRetry?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback" role="alert">
          <strong>Gagal memuat konten</strong>
          <p>Terjadi kesalahan saat memuat halaman ini.</p>
          <button className="button subtle" onClick={this.handleRetry}>
            <RotateCw size={16} /> Coba lagi
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: { onError?: () => void }
): React.FC<P> {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary onRetry={options?.onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export { ErrorBoundary };

