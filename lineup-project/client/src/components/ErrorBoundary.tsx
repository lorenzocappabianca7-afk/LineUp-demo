import { Component, type ReactNode, type ErrorInfo } from "react";
import { LINEUP_CRASH_COPY } from "@shared/maintenanceCopy";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorId: string;
}

/** Schermata di scuse solo dopo crash React non recuperabile (non per errori di rete/API). */
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

    const { title, lead, team, retry } = LINEUP_CRASH_COPY;

    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#F4FAFF] via-[#FFF9E6] to-white px-5 py-10"
        data-testid="lineup-crash-screen"
        role="alert"
      >
        <div className="w-full max-w-sm rounded-2xl border-2 border-primary/30 bg-white px-6 py-8 text-center shadow-lg">
          <p className="text-3xl font-extrabold tracking-tight text-[#4A9BD9]">LineUp</p>
          <h1 className="mt-4 text-lg font-bold leading-snug text-gray-900">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">{lead}</p>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-gray-800">{team}</p>

          <div className="mt-4 rounded-xl bg-gray-50 px-3 py-2">
            <p className="text-[11px] text-gray-500">
              Riferimento{" "}
              <span className="font-mono font-semibold text-gray-700">#{this.state.errorId}</span>
            </p>
          </div>

          <button
            type="button"
            data-testid="button-crash-reload"
            onClick={() => window.location.reload()}
            className="mt-6 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm active:opacity-90"
          >
            {retry}
          </button>
        </div>
      </div>
    );
  }
}
