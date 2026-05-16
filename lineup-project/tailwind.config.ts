import type { Config } from "tailwindcss";

/** Tailwind v4: token e plugin in `client/src/index.css`. Questo file serve a CLI (shadcn) e coerenza repo. */
export default {
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
} satisfies Config;
