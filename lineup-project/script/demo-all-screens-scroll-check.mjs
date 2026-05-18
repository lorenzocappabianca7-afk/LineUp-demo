/**
 * Verifica scroll su OGNI schermata della demo (gate → completamento).
 * Uso: node script/demo-all-screens-scroll-check.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";
import { waitForPreviewCompletion } from "./demo-test-helpers.mjs";

const BASE = process.argv[2] || "http://127.0.0.1:5199";
const VIEWPORTS = [
  { name: "iPhone SE", ...devices["iPhone SE"] },
  { name: "iPhone 14", ...devices["iPhone 14"] },
];

const SCREENS = [
  { id: "gate", testId: "demo-gate-scroll", before: null },
  { id: "intro", testId: "demo-intro-scroll", before: "gate-done" },
  { id: "home", testId: "demo-home-scroll", before: "intro-done" },
  { id: "wizard-0", testId: "wizard-step-scroll", before: "modal-open" },
  { id: "wizard-1", testId: "wizard-step-scroll", before: "step-0" },
  { id: "wizard-2", testId: "wizard-step-scroll", before: "step-1" },
  { id: "wizard-3", testId: "wizard-step-scroll", before: "step-2" },
  { id: "wizard-4", testId: "wizard-step-scroll", before: "step-3" },
  { id: "wizard-5", testId: "wizard-step-scroll", before: "step-4" },
  { id: "survey", testId: "survey-mode-scroll", before: "step-5" },
  { id: "completion", testId: "preview-completion-scroll", before: "survey-done" },
];

async function scrollProbe(page, testId) {
  return page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return { ok: false, reason: "missing-element", testId: id };
    const style = getComputedStyle(el);
    if (!["auto", "scroll", "overlay"].includes(style.overflowY)) {
      return { ok: false, reason: `overflow-y:${style.overflowY}`, testId: id };
    }
    const fits = el.scrollHeight <= el.clientHeight + 4;
    if (fits) return { ok: true, reason: "fits-viewport", clientHeight: el.clientHeight };
    el.scrollTop = 0;
    const before = el.scrollTop;
    el.scrollTop = Math.min(280, el.scrollHeight - el.clientHeight);
    const after = el.scrollTop;
    return {
      ok: after > before,
      reason: after > before ? "scrollable" : "scroll-blocked",
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      testId: id,
    };
  }, testId);
}

async function advanceTo(page, marker) {
  switch (marker) {
    case null:
      return;
    case "gate-done":
      await page.fill('[data-testid="input-demo-gate-name"]', "Scroll All");
      await page.fill('[data-testid="input-demo-gate-email"]', "all@scroll.it");
      await page.click('[data-testid="button-demo-gate-confirm"]');
      return;
    case "intro-done":
      await page.click('[data-testid="button-demo-intro-continue"]');
      return;
    case "modal-open":
      await page.click('[data-testid="button-pianifica-demo-page"]');
      await page.waitForSelector('[data-testid="wizard-step-scroll"]');
      return;
    case "step-0":
      await page.click('[data-testid="contact-Elena"]');
      await page.click('[data-testid="button-step-0-next"]');
      return;
    case "step-1":
      await page.click('[data-testid="category-sport"]');
      await page.click('[data-testid="subcategory-Calcio"]');
      await page.click('[data-testid="button-step-1-next"]');
      return;
    case "step-2":
      await page.locator('[data-testid^="cal-day-"]:not([disabled])').first().click();
      await page.click('[data-testid="button-step-2-next"]');
      await page.waitForSelector('[data-testid="button-step-3-next"]');
      return;
    case "step-3":
      await page.click('[data-testid="button-step-3-next"]');
      await page.waitForSelector('[data-testid="button-step-4-next"]');
      return;
    case "step-4":
      await page.click('[data-testid="button-step-4-next"]');
      await page.waitForSelector('[data-testid="button-step-venue-to-survey"]', { timeout: 12000 });
      return;
    case "step-5": {
      const v = page.locator('[data-testid^="venue-"]:not([data-testid^="venue-ai-"])').first();
      if (await v.count()) await v.click();
      await page.click('[data-testid="button-step-venue-to-survey"]');
      await page.waitForSelector('[data-testid="survey-mode-scroll"]');
      return;
    }
    case "survey-done":
      await page.click('[data-testid="button-survey-mode-continue"]');
      await waitForPreviewCompletion(page);
      return;
    default:
      throw new Error(`unknown marker ${marker}`);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const issues = [];
  const results = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ ...vp, locale: "it-IT" });
    await page.goto(`${BASE}/prova-pianifica`, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      sessionStorage.removeItem("lineup_pianifica_demo_gate_v1");
      sessionStorage.removeItem("lineup_pianifica_demo_intro_v1");
    });
    await page.reload({ waitUntil: "networkidle" });

    for (const screen of SCREENS) {
      if (screen.before) await advanceTo(page, screen.before);
      if (screen.id === "gate") {
        await page.waitForSelector(`[data-testid="${screen.testId}"]`);
      }
      const probe = await scrollProbe(page, screen.testId);
      results.push({ viewport: vp.name, screen: screen.id, ...probe });
      if (!probe.ok) {
        issues.push({ viewport: vp.name, screen: screen.id, probe });
      }
    }
    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
  if (issues.length) {
    console.error("\n⚠️ Scroll non OK:", JSON.stringify(issues, null, 2));
    process.exit(1);
  }
  console.log(`\n✓ Scroll OK su tutte le ${SCREENS.length} schermate (×${VIEWPORTS.length} viewport).`);
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});
