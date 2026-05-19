import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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

createRoot(document.getElementById("root")!).render(<App />);
