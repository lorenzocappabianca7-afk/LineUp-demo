import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorId: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorId: "" };
  }

  static getDerivedStateFromError(): State {
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    return { hasError: true, errorId: id };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[LineUp] Uncaught error:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center px-8 text-center">
        <div className="w-full max-w-sm">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg"
            style={{ background: "linear-gradient(135deg, #4A9BD9, #7CB9E8)" }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ops, qualcosa è andato storto</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            Si è verificato un problema inaspettato. Il team&nbsp;
            <span className="font-semibold text-[#4A9BD9]">LineUp</span>&nbsp;
            sta già lavorando per risolverlo nel più breve tempo possibile.
            <br /><br />
            Ci scusiamo per il disagio.
          </p>

          <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-6">
            <p className="text-[11px] text-gray-400">
              Codice errore&nbsp;
              <span className="font-mono font-semibold text-gray-600">#{this.state.errorId}</span>
            </p>
          </div>

          <button
            onClick={() => {
              this.setState({ hasError: false, errorId: "" });
              window.location.href = "/";
            }}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm shadow-sm active:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #4A9BD9, #7CB9E8)" }}
          >
            Torna alla Home
          </button>

          <p className="text-[11px] text-gray-300 mt-4">LineUp · versione {new Date().getFullYear()}</p>
        </div>
      </div>
    );
  }
}
