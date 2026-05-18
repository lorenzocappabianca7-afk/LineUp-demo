/**
 * Verifica scroll e impaginazione mobile demo Pianifica.
 * Uso: node script/mobile-demo-layout-check.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";
import { waitForPreviewCompletion } from "./demo-test-helpers.mjs";

const BASE = process.argv[2] || "http://127.0.0.1:5199";

const VIEWPORTS = [
  { name: "iPhone SE", ...devices["iPhone SE"] },
  { name: "iPhone 14", ...devices["iPhone 14"] },
];

function overflowReport(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      innerHeight: window.innerHeight,
      docOverflow: doc.scrollHeight - doc.clientHeight,
      bodyOverflow: body.scrollHeight - body.clientHeight,
      bodyStyleOverflow: body.style.overflow,
    };
  });
}

/** Verifica che l'area scroll interna accetti lo scroll touch/programmatico. */
async function scrollAreaWorks(page, testId) {
  return page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return { ok: false, reason: "missing-element" };
    const style = getComputedStyle(el);
    const overflowOk = ["auto", "scroll", "overlay"].includes(style.overflowY);
    if (!overflowOk) return { ok: false, reason: `overflow-y:${style.overflowY}` };
    const fits = el.scrollHeight <= el.clientHeight + 4;
    if (fits) return { ok: true, reason: "fits-viewport" };
    const before = el.scrollTop;
    el.scrollTop = Math.min(200, el.scrollHeight);
    const after = el.scrollTop;
    return {
      ok: after > before,
      reason: after > before ? "scrollable" : "scroll-blocked",
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    };
  }, testId);
}

async function footerVisible(page, testId) {
  const box = await page.locator(`[data-testid="${testId}"]`).boundingBox();
  const vh = await page.evaluate(() => window.innerHeight);
  return Boolean(box && box.y + box.height <= vh + 2);
}

async function runWizardToSurvey(page) {
  await page.click('[data-testid="contact-Elena"]');
  await page.click('[data-testid="button-step-0-next"]');
  await page.click('[data-testid="category-sport"]');
  await page.click('[data-testid="subcategory-Calcio"]');
  await page.click('[data-testid="button-step-1-next"]');
  await page.click('[data-testid="button-step-2-next"]');
  await page.waitForSelector('[data-testid="button-step-3-next"]');
  await page.click('[data-testid="button-step-3-next"]');
  await page.waitForSelector('[data-testid="button-step-venue-to-survey"]', { timeout: 10000 });
  const firstVenue = page.locator('[data-testid^="venue-"]:not([data-testid^="venue-ai-"])').first();
  if (await firstVenue.count()) await firstVenue.click();
  await page.click('[data-testid="button-step-venue-to-survey"]');
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const issues = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ ...vp, locale: "it-IT" });
    const page = await context.newPage();

    await page.goto(`${BASE}/prova-pianifica`, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      sessionStorage.removeItem("lineup_pianifica_demo_gate_v1");
      sessionStorage.removeItem("lineup_pianifica_demo_intro_v1");
    });
    await page.reload({ waitUntil: "networkidle" });

    await page.fill('[data-testid="input-demo-gate-name"]', "Test Mobile");
    await page.fill('[data-testid="input-demo-gate-email"]', "mobile@test.it");

    let r = await overflowReport(page);
    const gateScroll = await scrollAreaWorks(page, "demo-gate-scroll");
    results.push({ viewport: vp.name, screen: "gate", gateScroll, ...r });
    if (!gateScroll.ok) issues.push({ viewport: vp.name, screen: "gate", problem: gateScroll });

    await page.click('[data-testid="button-demo-gate-confirm"]');
    await page.waitForSelector('[data-testid="button-demo-intro-continue"]');

    r = await overflowReport(page);
    const introScroll = await scrollAreaWorks(page, "demo-intro-scroll");
    results.push({ viewport: vp.name, screen: "intro", introScroll, ...r });
    if (!introScroll.ok) issues.push({ viewport: vp.name, screen: "intro", problem: introScroll });
    if (!(await footerVisible(page, "button-demo-intro-continue"))) {
      issues.push({ viewport: vp.name, screen: "intro", problem: "footer-hidden" });
    }

    await page.click('[data-testid="button-demo-intro-continue"]');
    const homeScroll = await scrollAreaWorks(page, "demo-home-scroll");
    results.push({ viewport: vp.name, screen: "home", homeScroll });
    if (!homeScroll.ok) issues.push({ viewport: vp.name, screen: "home", problem: homeScroll });

    await page.click('[data-testid="button-pianifica-demo-page"]');
    await page.waitForSelector('[data-testid="wizard-step-scroll"]');

    r = await overflowReport(page);
    const wizardScroll = await scrollAreaWorks(page, "wizard-step-scroll");
    results.push({
      viewport: vp.name,
      screen: "wizard-step0",
      ...r,
      bodyStyleOverflow: r.bodyStyleOverflow,
      wizardScroll,
      footerVisible: await footerVisible(page, "button-step-0-next"),
    });
    if (!wizardScroll.ok) issues.push({ viewport: vp.name, screen: "wizard-step0", problem: wizardScroll });
    if (r.docOverflow > 8 || r.bodyOverflow > 8) {
      issues.push({ viewport: vp.name, screen: "wizard-step0", problem: "page-overflow" });
    }

    await runWizardToSurvey(page);
    await page.waitForSelector('[data-testid="survey-mode-scroll"]');

    const surveyScroll = await scrollAreaWorks(page, "survey-mode-scroll");
    results.push({
      viewport: vp.name,
      screen: "survey-mode",
      ...r,
      surveyScroll,
      surveyFooterVisible: await footerVisible(page, "button-survey-mode-continue"),
    });
    if (!surveyScroll.ok) issues.push({ viewport: vp.name, screen: "survey-mode", problem: surveyScroll });

    const t0 = Date.now();
    await page.click('[data-testid="button-survey-mode-continue"]');
    await waitForPreviewCompletion(page);
    const transitionMs = Date.now() - t0;
    if (transitionMs > 6000) {
      issues.push({ viewport: vp.name, screen: "create-transition", problem: `slow:${transitionMs}ms` });
    }

    const completionScroll = await scrollAreaWorks(page, "preview-completion-scroll");
    const completionArch = await page.evaluate(() => {
      const scroll = document.querySelector('[data-testid="preview-completion-scroll"]');
      const wizard = document.querySelector('[data-testid="wizard-step-scroll"]');
      if (wizard) return { ok: false, reason: "wizard-still-mounted" };
      if (!scroll) return { ok: false, reason: "missing-scroll-surface" };
      const root = document.querySelector('[data-testid="preview-completion-root"]');
      if (!root) return { ok: false, reason: "missing-completion-root" };
      return { ok: true, reason: "modal-level-completion" };
    });
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="preview-completion-scroll"]');
      if (el) el.scrollTop = 320;
    });
    const socialTeaserVisible = await page.locator('[data-testid="preview-teaser-social"]').isVisible();
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="preview-completion-scroll"]');
      if (el) el.scrollTop = el.scrollHeight;
    });
    const feedbackVisible = await footerVisible(page, "button-submit-demo-feedback");

    results.push({
      viewport: vp.name,
      screen: "completion",
      transitionMs,
      completionScroll,
      completionArch,
      feedbackReachable: feedbackVisible,
      socialTeaserVisible,
    });
    if (!completionScroll.ok) issues.push({ viewport: vp.name, screen: "completion", problem: completionScroll });
    if (!completionArch.ok) issues.push({ viewport: vp.name, screen: "completion", problem: completionArch });
    if (!feedbackVisible) issues.push({ viewport: vp.name, screen: "completion", problem: "feedback-not-reachable" });
    if (!socialTeaserVisible) {
      issues.push({ viewport: vp.name, screen: "completion", problem: "social-teaser-not-visible-after-scroll" });
    }

    await context.close();
  }

  await browser.close();

  console.log(JSON.stringify(results, null, 2));

  if (issues.length > 0) {
    console.error("\n⚠️  Problemi rilevati:", JSON.stringify(issues, null, 2));
    process.exit(1);
  }
  console.log("\n✓ Scroll e transizioni OK su tutte le schermate critiche (iPhone SE + 14).");
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});
