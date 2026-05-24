/**
 * Rileva sovrapposizioni visibili tra blocchi di testo (demo Pianifica).
 * Uso: node script/demo-text-overlap-check.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";
import { fillDemoGate, waitForPreviewCompletion } from "./demo-test-helpers.mjs";

const BASE = process.argv[2] || "http://127.0.0.1:5199";
const VIEWPORTS = [
  { name: "iPhone SE", ...devices["iPhone SE"] },
  { name: "iPhone 14", ...devices["iPhone 14"] },
];

/** Blocchi testo/CTA significativi nel modale demo. */
const TEXT_SELECTOR =
  '[role="dialog"] p, [role="dialog"] h1, [role="dialog"] h2, [role="dialog"] h3, [role="dialog"] h4, [role="dialog"] button, [role="dialog"] article, [role="dialog"] label';

function overlapArea(a, b) {
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.right, b.right);
  const top = Math.max(a.top, b.top);
  const bottom = Math.min(a.bottom, b.bottom);
  if (right <= left || bottom <= top) return 0;
  return (right - left) * (bottom - top);
}

async function findTextOverlaps(page) {
  return page.evaluate(({ selector }) => {
    function overlapArea(x, y) {
      const left = Math.max(x.left, y.left);
      const right = Math.min(x.right, y.right);
      const top = Math.max(x.top, y.top);
      const bottom = Math.min(x.bottom, y.bottom);
      if (right <= left || bottom <= top) return 0;
      return (right - left) * (bottom - top);
    }

    const modal = document.querySelector('[role="dialog"]');
    if (!modal) return { ok: false, reason: "no-modal", pairs: [] };

    const nodes = [...modal.querySelectorAll(selector)].filter((el) => {
      const text = (el.innerText || "").trim();
      if (!text || text.length < 2) return false;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) < 0.05) {
        return false;
      }
      const r = el.getBoundingClientRect();
      return r.width >= 8 && r.height >= 8;
    });

    const pairs = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (a.contains(b) || b.contains(a)) continue;

        const aHeader = a.closest('[data-testid="group-life-header"]');
        const bHeader = b.closest('[data-testid="group-life-header"]');
        const aIntro = a.closest('[data-testid="group-life-intro"]');
        const bIntro = b.closest('[data-testid="group-life-intro"]');
        if ((aHeader && bIntro) || (bHeader && aIntro)) continue;

        const aId = a.getAttribute("data-testid");
        const bId = b.getAttribute("data-testid");
        if (
          aId === "button-scroll-completion-hint" ||
          bId === "button-scroll-completion-hint" ||
          aId === "button-survey-mode-continue" ||
          bId === "button-survey-mode-continue"
        ) {
          continue;
        }

        const proseguiBtn = a.closest('[data-testid="pianifica-group-life-demo"]')
          ?.querySelector('[data-testid="button-prosegui-group-life-demo"]');
        const aInChatBanner = a.closest('[data-testid="banner-chat-survey-demo"]');
        const bInChatBanner = b.closest('[data-testid="banner-chat-survey-demo"]');
        const aInPublishBanner = a.closest('[data-testid="banner-publish-group-fixed"]');
        const bInPublishBanner = b.closest('[data-testid="banner-publish-group-fixed"]');
        if (
          proseguiBtn &&
          ((aInChatBanner && (b === proseguiBtn || proseguiBtn.contains(b))) ||
            (bInChatBanner && (a === proseguiBtn || proseguiBtn.contains(a))) ||
            (aInPublishBanner && (b === proseguiBtn || proseguiBtn.contains(b))) ||
            (bInPublishBanner && (a === proseguiBtn || proseguiBtn.contains(a))))
        ) {
          continue;
        }

        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const inter = overlapArea(ra, rb);
        if (inter <= 0) continue;

        const verticalOverlap = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (verticalOverlap < 6) continue;

        const minArea = Math.min(ra.width * ra.height, rb.width * rb.height);
        if (inter / minArea < 0.12) continue;

        pairs.push({
          a: a.getAttribute("data-testid") || a.tagName,
          b: b.getAttribute("data-testid") || b.tagName,
          aText: (a.innerText || "").trim().slice(0, 40),
          bText: (b.innerText || "").trim().slice(0, 40),
          ratio: Math.round((inter / minArea) * 100),
        });
      }
    }

    return { ok: pairs.length === 0, pairs };
  }, { selector: TEXT_SELECTOR });
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
  await page.waitForSelector('[data-testid="button-step-venue-to-survey"]', { timeout: 12000 });
  const firstVenue = page.locator('[data-testid^="venue-"]:not([data-testid^="venue-ai-"])').first();
  if (await firstVenue.count()) await firstVenue.click();
  await page.click('[data-testid="button-step-venue-to-survey"]');
}

async function advanceGroupLife(page) {
  await page.waitForSelector('[data-testid="pianifica-group-life-demo"]', { timeout: 10000 });
  const prosegui = page.locator('[data-testid="button-prosegui-group-life-demo"]');
  for (let i = 0; i < 2; i++) {
    if (await prosegui.isVisible().catch(() => false)) await prosegui.click();
    await page.waitForTimeout(400);
  }
}

const SCENARIOS = [
  {
    id: "survey",
    async setup(page) {
      await page.goto(`${BASE}/prova-pianifica`, { waitUntil: "networkidle" });
      await page.evaluate(() => {
        sessionStorage.removeItem("lineup_pianifica_demo_intro_v1");
      });
      await page.reload({ waitUntil: "networkidle" });
      await fillDemoGate(page);
      await page.click('[data-testid="button-demo-gate-confirm"]');
      await page.click('[data-testid="button-demo-intro-continue"]');
      await page.click('[data-testid="button-pianifica-demo-page"]');
      await page.waitForSelector('[role="dialog"]');
      await runWizardToSurvey(page);
      await page.waitForSelector('[data-testid="survey-mode-scroll"]');
    },
  },
  {
    id: "group-life",
    async setup(page) {
      await page.goto(`${BASE}/prova-pianifica`, { waitUntil: "networkidle" });
      await fillDemoGate(page);
      await page.click('[data-testid="button-demo-gate-confirm"]');
      await page.click('[data-testid="button-demo-intro-continue"]');
      await page.click('[data-testid="button-pianifica-demo-page"]');
      await page.waitForSelector('[role="dialog"]');
      await runWizardToSurvey(page);
      await page.click('[data-testid="button-survey-mode-continue"]');
      await advanceGroupLife(page);
    },
  },
  {
    id: "group-life-step0",
    async setup(page) {
      await page.goto(`${BASE}/prova-pianifica`, { waitUntil: "networkidle" });
      await fillDemoGate(page);
      await page.click('[data-testid="button-demo-gate-confirm"]');
      await page.click('[data-testid="button-demo-intro-continue"]');
      await page.click('[data-testid="button-pianifica-demo-page"]');
      await page.waitForSelector('[role="dialog"]');
      await runWizardToSurvey(page);
      await page.click('[data-testid="button-survey-mode-continue"]');
      await page.waitForSelector('[data-testid="pianifica-group-life-demo"]');
    },
  },
  {
    id: "group-life-step1",
    async setup(page) {
      await page.goto(`${BASE}/prova-pianifica`, { waitUntil: "networkidle" });
      await fillDemoGate(page);
      await page.click('[data-testid="button-demo-gate-confirm"]');
      await page.click('[data-testid="button-demo-intro-continue"]');
      await page.click('[data-testid="button-pianifica-demo-page"]');
      await page.waitForSelector('[role="dialog"]');
      await runWizardToSurvey(page);
      await page.click('[data-testid="button-survey-mode-continue"]');
      await page.waitForSelector('[data-testid="pianifica-group-life-demo"]');
      await page.click('[data-testid="button-prosegui-group-life-demo"]');
      await page.waitForSelector('[data-testid="banner-publish-group-fixed"]');
    },
  },
  {
    id: "completion",
    async setup(page) {
      await page.goto(`${BASE}/prova-pianifica`, { waitUntil: "networkidle" });
      await fillDemoGate(page);
      await fillDemoGate(page);
      await page.click('[data-testid="button-demo-gate-confirm"]');
      await page.click('[data-testid="button-demo-intro-continue"]');
      await page.click('[data-testid="button-pianifica-demo-page"]');
      await runWizardToSurvey(page);
      await page.click('[data-testid="button-survey-mode-continue"]');
      await waitForPreviewCompletion(page);
    },
  },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const allIssues = [];

  for (const vp of VIEWPORTS) {
    for (const scenario of SCENARIOS) {
      const context = await browser.newContext({ ...vp, locale: "it-IT" });
      const page = await context.newPage();
      try {
        await scenario.setup(page);
        await page.waitForTimeout(300);
        const result = await findTextOverlaps(page);
        if (!result.ok) {
          for (const pair of result.pairs) {
            allIssues.push({ viewport: vp.name, screen: scenario.id, ...pair });
          }
        }
      } catch (e) {
        allIssues.push({
          viewport: vp.name,
          screen: scenario.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
      await context.close();
    }
  }

  await browser.close();

  if (allIssues.length) {
    console.error(JSON.stringify(allIssues, null, 2));
    process.exit(1);
  }
  console.log(`✓ Nessuna sovrapposizione testo rilevante (${SCENARIOS.length} schermate × ${VIEWPORTS.length} viewport).`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
