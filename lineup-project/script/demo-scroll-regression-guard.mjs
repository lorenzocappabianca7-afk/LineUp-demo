/**
 * Guardrail anti-regressione scroll demo (pattern che bloccano iOS).
 * Uso: node script/demo-scroll-regression-guard.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";
import { fillDemoGate, waitForPreviewCompletion } from "./demo-test-helpers.mjs";

const BASE = process.argv[2] || "http://127.0.0.1:5199";
const VP = { name: "iPhone SE", ...devices["iPhone SE"] };

async function reachCompletion(page) {
  await page.goto(`${BASE}/prova-pianifica`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    sessionStorage.removeItem("lineup_pianifica_demo_gate_v1");
    sessionStorage.removeItem("lineup_pianifica_demo_gate_v2");
    sessionStorage.removeItem("lineup_pianifica_demo_intro_v1");
  });
  await page.reload({ waitUntil: "networkidle" });
  await fillDemoGate(page, { name: "Guard", email: "guard@test.it", birthYear: "1994" });
  await page.click('[data-testid="button-demo-gate-confirm"]');
  await page.click('[data-testid="button-demo-intro-continue"]');
  await page.click('[data-testid="button-pianifica-demo-page"]');
  await page.click('[data-testid="contact-Elena"]');
  await page.click('[data-testid="button-step-0-next"]');
  await page.click('[data-testid="category-sport"]');
  await page.click('[data-testid="subcategory-Calcio"]');
  await page.click('[data-testid="button-step-1-next"]');
  await page.click('[data-testid="button-step-2-next"]');
  await page.waitForSelector('[data-testid="button-step-3-next"]');
  await page.click('[data-testid="button-step-3-next"]');
  await page.waitForSelector('[data-testid="button-step-venue-to-survey"]', { timeout: 12000 });
  const v = page.locator('[data-testid^="venue-"]:not([data-testid^="venue-ai-"])').first();
  if (await v.count()) await v.click();
  await page.click('[data-testid="button-step-venue-to-survey"]');
  await page.click('[data-testid="button-survey-mode-continue"]');
  await waitForPreviewCompletion(page);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ ...VP, locale: "it-IT" });
  const issues = [];

  await reachCompletion(page);

  const layout = await page.evaluate(() => {
    const scroll = document.querySelector('[data-testid="preview-completion-scroll"]');
    if (!scroll) return { ok: false, reason: "missing-scroll" };
    const style = getComputedStyle(scroll);
    const dialog = scroll.closest('[role="dialog"]');
    const badAncestors = [];
    let p = scroll.parentElement;
    while (p && dialog && p !== dialog) {
      const oy = getComputedStyle(p).overflowY;
      if (oy === "hidden" || oy === "clip") {
        badAncestors.push({
          testId: p.getAttribute("data-testid"),
          className: p.className?.slice?.(0, 80),
          overflowY: oy,
        });
      }
      p = p.parentElement;
    }
    return {
      ok: true,
      position: style.position,
      overflowY: style.overflowY,
      touchAction: style.touchAction,
      clientHeight: scroll.clientHeight,
      scrollHeight: scroll.scrollHeight,
      bodyPosition: document.body.style.position,
      bodyOverflow: document.body.style.overflow,
      wizardMounted: !!document.querySelector('[data-testid="wizard-step-scroll"]'),
      badAncestors,
    };
  });

  if (!layout.ok) issues.push({ check: "scroll-exists", detail: layout });
  if (layout.position === "absolute" || layout.position === "fixed") {
    issues.push({ check: "no-absolute-scroll", detail: { position: layout.position } });
  }
  if (!["scroll", "auto", "overlay"].includes(layout.overflowY)) {
    issues.push({ check: "overflow-y-scroll", detail: { overflowY: layout.overflowY } });
  }
  if (layout.clientHeight < 200) {
    issues.push({ check: "scroll-viewport-height", detail: { clientHeight: layout.clientHeight } });
  }
  if (layout.scrollHeight <= layout.clientHeight + 8) {
    issues.push({ check: "content-taller-than-viewport", detail: layout });
  }
  if (layout.bodyPosition === "fixed") {
    issues.push({ check: "body-not-locked-on-completion", detail: { bodyPosition: layout.bodyPosition } });
  }
  if (layout.wizardMounted) {
    issues.push({ check: "wizard-unmounted", detail: {} });
  }
  if (layout.badAncestors.length > 0) {
    issues.push({ check: "no-overflow-hidden-ancestors", detail: layout.badAncestors });
  }

  const before = await page.evaluate(() => document.querySelector('[data-testid="preview-completion-scroll"]')?.scrollTop ?? 0);
  await page.locator('[data-testid="preview-completion-scroll"]').evaluate((el) => {
    el.scrollTop += 250;
  });
  const afterProgrammatic = await page.evaluate(() => document.querySelector('[data-testid="preview-completion-scroll"]')?.scrollTop ?? 0);
  if (afterProgrammatic <= before) {
    issues.push({ check: "programmatic-scroll", detail: { before, afterProgrammatic } });
  }

  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="preview-completion-scroll"]');
    if (el) el.scrollTop = 0;
  });
  await page.click('[data-testid="button-scroll-completion-hint"]');
  await page.waitForTimeout(400);
  const afterHint = await page.evaluate(() => document.querySelector('[data-testid="preview-completion-scroll"]')?.scrollTop ?? 0);
  if (afterHint < 40) {
    issues.push({ check: "hint-button-scroll", detail: { afterHint } });
  }

  await browser.close();

  if (issues.length) {
    console.error("⚠️ Regressione scroll demo:\n", JSON.stringify(issues, null, 2));
    process.exit(1);
  }
  console.log("✓ Guardrail scroll demo OK (layout iOS-safe, body libero, scroll funzionante).");
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});
