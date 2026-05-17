/**
 * QA completa demo Pianifica: scroll, modale, body lock, riscontri, cicli di vita.
 * Uso: node script/demo-full-qa-check.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:5199";
const VP = { name: "iPhone SE", ...devices["iPhone SE"] };

function scrollProbe(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { ok: false, reason: "missing", selector: sel };
    const style = getComputedStyle(el);
    const overflowOk = ["auto", "scroll", "overlay"].includes(style.overflowY);
    if (!overflowOk) return { ok: false, reason: `overflow-y:${style.overflowY}` };
    const fits = el.scrollHeight <= el.clientHeight + 4;
    if (fits) return { ok: true, reason: "fits", clientHeight: el.clientHeight };
    const before = el.scrollTop;
    el.scrollTop = Math.min(280, el.scrollHeight);
    const moved = el.scrollTop > before;
    return {
      ok: moved,
      reason: moved ? "scrollable" : "blocked",
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    };
  }, selector);
}

async function firstScrollableInModal(page) {
  return page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]');
    if (!modal) return { ok: false, reason: "no-modal" };
    const nodes = modal.querySelectorAll("*");
    let hasScrollContainer = false;
    for (const el of nodes) {
      const s = getComputedStyle(el);
      if (!["auto", "scroll", "overlay"].includes(s.overflowY)) continue;
      hasScrollContainer = true;
      if (el.scrollHeight > el.clientHeight + 8) {
        const before = el.scrollTop;
        el.scrollTop = 40;
        if (el.scrollTop > before) {
          return { ok: true, reason: "scrollable", testId: el.getAttribute("data-testid") };
        }
      }
    }
    if (hasScrollContainer) return { ok: true, reason: "fits-viewport" };
    return { ok: false, reason: "no-scroll-container-in-modal" };
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...VP, locale: "it-IT" });
  const page = await context.newPage();
  const issues = [];

  const fail = (id, detail) => issues.push({ id, ...detail });

  await page.goto(`${BASE}/prova-pianifica`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    sessionStorage.removeItem("lineup_pianifica_demo_gate_v1");
    sessionStorage.removeItem("lineup_pianifica_demo_intro_v1");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="demo-gate-scroll"]');

  const gateArea = await scrollProbe(page, '[data-testid="demo-gate-scroll"]');
  if (!gateArea.ok && gateArea.reason !== "fits") fail("gate-scroll", gateArea);

  await page.click('[data-testid="link-demo-feedback-admin"]');
  await page.waitForTimeout(150);
  if ((await page.evaluate(() => location.pathname)) !== "/prova-pianifica") {
    fail("riscontri-single", { path: await page.evaluate(() => location.pathname) });
  }
  await page.locator('[data-testid="link-demo-feedback-admin"]').dblclick();
  await page.waitForURL("**/prova-pianifica/riscontri", { timeout: 5000 });
  await page.goto(`${BASE}/prova-pianifica`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    sessionStorage.removeItem("lineup_pianifica_demo_gate_v1");
    sessionStorage.removeItem("lineup_pianifica_demo_intro_v1");
  });
  await page.reload({ waitUntil: "networkidle" });

  await page.fill('[data-testid="input-demo-gate-name"]', "QA Demo");
  await page.fill('[data-testid="input-demo-gate-email"]', "qa@demo.it");
  await page.click('[data-testid="button-demo-gate-confirm"]');

  // Intro scroll
  const introArea = await scrollProbe(page, '[data-testid="demo-intro-scroll"]');
  if (!introArea.ok && introArea.reason !== "fits") fail("intro-scroll", introArea);

  await page.click('[data-testid="button-demo-intro-continue"]');
  await page.click('[data-testid="button-pianifica-demo-page"]');
  await page.waitForSelector('[role="dialog"]');

  const bodyLocked = await page.evaluate(() => document.body.style.position === "fixed");
  if (!bodyLocked) fail("body-lock-on-modal-open", {});

  const w0 = await scrollProbe(page, '[data-testid="wizard-step-scroll"]');
  if (!w0.ok) fail("wizard-step0-scroll", w0);

  await page.click('[data-testid="contact-Elena"]');
  await page.click('[data-testid="button-step-0-next"]');

  const w1 = await firstScrollableInModal(page);
  if (!w1?.ok) fail("wizard-step1-scroll", w1);

  await page.click('[data-testid="category-sport"]');
  await page.click('[data-testid="subcategory-Calcio"]');
  await page.click('[data-testid="button-step-1-next"]');
  await page.click('[data-testid="button-step-2-next"]');
  await page.waitForSelector('[data-testid="button-step-3-next"]');
  const w3 = await firstScrollableInModal(page);
  if (!w3?.ok) fail("wizard-step3-scroll", w3);

  await page.click('[data-testid="button-step-3-next"]');
  await page.waitForSelector('[data-testid="button-step-venue-to-survey"]', { timeout: 12000 });
  const w5 = await firstScrollableInModal(page);
  if (!w5?.ok) fail("wizard-venues-scroll", w5);

  const venue = page.locator('[data-testid^="venue-"]:not([data-testid^="venue-ai-"])').first();
  if (await venue.count()) await venue.click();
  await page.click('[data-testid="button-step-venue-to-survey"]');

  const survey = await scrollProbe(page, '[data-testid="survey-mode-scroll"]');
  if (!survey.ok) fail("survey-scroll", survey);

  await page.click('[data-testid="button-survey-mode-continue"]');
  await page.waitForSelector('[data-testid="preview-completion-scroll"]', { timeout: 8000 });

  const arch = await page.evaluate(() => ({
    wizard: !!document.querySelector('[data-testid="wizard-step-scroll"]'),
    completion: !!document.querySelector('[data-testid="preview-completion-scroll"]'),
    root: !!document.querySelector('[data-testid="preview-completion-root"]'),
  }));
  if (arch.wizard) fail("completion-wizard-still-mounted", arch);
  if (!arch.completion || !arch.root) fail("completion-missing", arch);

  const completion = await scrollProbe(page, '[data-testid="preview-completion-scroll"]');
  if (!completion.ok) fail("completion-scroll", completion);
  if (completion.clientHeight < 200) fail("completion-viewport-too-small", completion);

  const iosSafeLayout = await page.evaluate(() => {
    const scroll = document.querySelector('[data-testid="preview-completion-scroll"]');
    const style = scroll ? getComputedStyle(scroll) : null;
    return {
      position: style?.position,
      bodyFixed: document.body.style.position === "fixed",
    };
  });
  if (iosSafeLayout.position === "absolute" || iosSafeLayout.position === "fixed") {
    fail("completion-scroll-ios-unsafe-position", iosSafeLayout);
  }
  if (iosSafeLayout.bodyFixed) fail("body-locked-during-completion", iosSafeLayout);

  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="preview-completion-scroll"]');
    if (el) el.scrollTop = 320;
  });
  const teaserMid = await page.locator('[data-testid="preview-teaser-social"]').isVisible();
  if (!teaserMid) fail("teaser-not-visible-mid-scroll", {});

  await page.click('[data-testid="button-scroll-completion-hint"]');
  await page.waitForTimeout(400);
  const afterHintTap = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="preview-completion-scroll"]');
    return el ? el.scrollTop : 0;
  });
  if (afterHintTap < 40) fail("scroll-hint-button", { scrollTop: afterHintTap });

  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="preview-completion-scroll"]');
    if (el) el.scrollTop = el.scrollHeight;
  });
  const feedbackEnd = await page.locator('[data-testid="button-submit-demo-feedback"]').isVisible();
  if (!feedbackEnd) fail("feedback-not-visible-end-scroll", {});

  // Chiudi modale → body sbloccato, wizard reset al riaprire
  await page.click('[data-testid="button-close-create-demo"]');
  await page.waitForTimeout(200);
  const bodyUnlocked = await page.evaluate(
    () => document.body.style.position !== "fixed" && document.body.style.overflow !== "hidden",
  );
  if (!bodyUnlocked) fail("body-unlock-after-close", await page.evaluate(() => document.body.style));

  await page.click('[data-testid="button-pianifica-demo-page"]');
  await page.waitForSelector('[data-testid="wizard-step-scroll"]');
  const wizardAgain = await page.evaluate(() => !!document.querySelector('[data-testid="wizard-step-scroll"]'));
  if (!wizardAgain) fail("wizard-not-reset-on-reopen", {});

  await page.click('[data-testid="button-close-create-demo"]');

  // Backdrop chiude modale
  await page.click('[data-testid="button-pianifica-demo-page"]');
  await page.waitForSelector('[role="dialog"]');
  const box = await page.locator('[role="dialog"]').boundingBox();
  if (box) {
    await page.mouse.click(box.x + 8, box.y + 8);
    await page.waitForTimeout(300);
    const dialogOpen = await page.locator('[role="dialog"]').count();
    if (dialogOpen > 0) fail("backdrop-close", { dialogOpen });
  }

  await context.close();
  await browser.close();

  if (issues.length) {
    console.error("⚠️ Problemi QA demo:\n", JSON.stringify(issues, null, 2));
    process.exit(1);
  }
  console.log("✓ QA demo completa OK (scroll, modale, body lock, completamento, ciclo riapertura).");
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});
