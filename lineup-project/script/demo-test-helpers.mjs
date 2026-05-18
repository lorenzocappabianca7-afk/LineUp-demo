/** Compila il gate demo (nome, email, anno di nascita). */
export async function fillDemoGate(page, { name, email, birthYear = "1990" } = {}) {
  await page.fill('[data-testid="input-demo-gate-name"]', name ?? "Test Demo");
  await page.fill('[data-testid="input-demo-gate-email"]', email ?? "demo@test.it");
  await page.fill('[data-testid="input-demo-gate-birth-year"]', String(birthYear));
}

/** Avanza i due banner post-creazione (demo): solo Prosegui, niente skip. */
export async function skipGroupLifeDemo(page) {
  const prosegui = page.locator('[data-testid="button-prosegui-group-life-demo"]');
  try {
    await page.waitForSelector('[data-testid="pianifica-group-life-demo"]', { timeout: 8000 });
    for (let i = 0; i < 3; i++) {
      if (await page.locator('[data-testid="preview-completion-scroll"]').isVisible().catch(() => false)) {
        break;
      }
      if (await prosegui.isVisible().catch(() => false)) {
        await prosegui.click();
      }
      await page.waitForTimeout(350);
    }
    await page.waitForSelector('[data-testid="preview-completion-scroll"]', { timeout: 10000 });
  } catch {
    /* già su completamento o build senza animazione */
  }
}

/** Dopo «Crea evento con questo sondaggio» attende la schermata finale. */
export async function waitForPreviewCompletion(page, timeout = 20_000) {
  await skipGroupLifeDemo(page);
  await page.waitForSelector('[data-testid="preview-completion-scroll"]', { timeout });
}
