/** Verifica: singolo click su "riscontri" non naviga; doppio sì. */
import { chromium, devices } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:5199";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ ...devices["iPhone 14"], locale: "it-IT" });

  await page.goto(`${BASE}/prova-pianifica`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="link-demo-feedback-admin"]');

  const btn = page.locator('[data-testid="link-demo-feedback-admin"]');

  await btn.click();
  await page.waitForTimeout(200);
  let path = await page.evaluate(() => location.pathname);
  if (path !== "/prova-pianifica") {
    throw new Error(`Single click navigated to ${path}`);
  }

  await btn.dblclick();
  await page.waitForURL("**/prova-pianifica/riscontri", { timeout: 5000 });
  path = await page.evaluate(() => location.pathname);
  if (path !== "/prova-pianifica/riscontri") {
    throw new Error(`Double click did not open riscontri, got ${path}`);
  }

  await browser.close();
  console.log("✓ Singolo click ignorato, doppio click apre /prova-pianifica/riscontri");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
