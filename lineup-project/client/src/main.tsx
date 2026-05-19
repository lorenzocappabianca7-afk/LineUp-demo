import { createRoot } from "react-dom/client";
import App from "./App";
import { LineUpMaintenanceScreen } from "@/components/LineUpMaintenanceScreen";
import { checkLineUpServerAvailable } from "@/lib/lineupAvailability";
import "./index.css";

declare global {
  interface Window {
    __lineupBootHide?: () => void;
  }
}

/** In dev, evita che un SW registrato in precedenza (stesso host/porta) serva bundle vecchi. */
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const r of regs) void r.unregister();
  });
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        reg?.update();
      })
      .catch(() => {});
  });
}

async function bootstrap() {
  const rootEl = document.getElementById("root");
  if (!rootEl) return;

  const available = await checkLineUpServerAvailable();
  window.__lineupBootHide?.();

  const root = createRoot(rootEl);
  if (!available) {
    root.render(<LineUpMaintenanceScreen />);
    return;
  }
  root.render(<App />);
}

void bootstrap();
