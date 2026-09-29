import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#070A10] text-slate-100 p-6 font-sans">
          <div className="max-w-xl w-full bg-[#0F172A] border border-rose-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle size={32} />
            </div>

            <div className="text-center space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Something went wrong
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                A rendering exception occurred in this component.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-black/50 border border-white/10 rounded-xl p-3.5 text-left overflow-hidden space-y-2">
                <div className="bg-rose-500/20 border border-rose-500/40 rounded-lg p-3">
                  <p className="text-xs font-mono font-black text-rose-300 break-words select-all">
                    {this.state.error?.toString()}
                  </p>
                </div>
                {this.state.error?.stack && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Call Stack:</p>
                    <pre className="text-[10px] font-mono text-amber-300 bg-slate-950/80 p-2.5 rounded border border-slate-800 max-h-48 overflow-y-auto whitespace-pre-wrap select-all">
                      {this.state.error.stack}
                    </pre>
                  </div>
                )}
                {this.state.errorInfo?.componentStack && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Component Stack:</p>
                    <pre className="text-[10px] font-mono text-slate-400 bg-slate-950/80 p-2.5 rounded border border-slate-800 max-h-36 overflow-y-auto whitespace-pre-wrap select-all">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md"
              >
                <RefreshCw size={14} />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer border border-white/10"
              >
                <Home size={14} />
                <span>Go to Home</span>
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
