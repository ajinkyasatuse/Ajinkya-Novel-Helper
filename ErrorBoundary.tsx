import React, { Component, ErrorInfo, ReactNode } from 'react';
import { SettingsIcon } from './components/Icons';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white">
          <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-2xl w-full border border-red-500/30">
            <div className="flex items-center gap-3 mb-4 text-red-400">
              <SettingsIcon />
              <h1 className="text-2xl font-bold">Something went wrong</h1>
            </div>
            <p className="mb-4 text-slate-300">
              The application encountered an unexpected error. This might be due to a network issue or a temporary glitch.
            </p>
            
            <div className="bg-slate-900 p-4 rounded-lg overflow-auto max-h-64 border border-white/5 mb-6">
              <h3 className="text-red-400 font-bold mb-2 text-sm uppercase tracking-wide">Error Details</h3>
              <p className="font-mono text-sm text-red-300 mb-4">{this.state.error?.message}</p>
              
              {this.state.errorInfo && (
                <>
                  <h3 className="text-slate-400 font-bold mb-2 text-xs uppercase">Component Stack</h3>
                  <pre className="font-mono text-[10px] text-slate-500 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-500 transition-colors font-semibold shadow-lg"
              >
                Try Refreshing
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
