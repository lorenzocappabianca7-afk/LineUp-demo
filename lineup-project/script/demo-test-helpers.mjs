/** Salta l'anteprima animata post-sondaggio (demo) se visibile. */
export async function skipGroupLifeDemo(page) {
  const skip = page.locator('[data-testid="button-skip-group-life-demo"]');
  const prosegui = page.locator('[data-testid="button-prosegui-group-life-demo"]');
  try {
    await page.waitForSelector('[data-testid="pianifica-group-life-demo"]', { timeout: 8000 });
    // Test automatici: salta subito (l'animazione può durare ~25s se si aspetta Prosegui).
    if (await skip.isVisible().catch(() => false)) {
      await skip.click();
    } else if (await prosegui.isVisible().catch(() => false)) {
      await prosegui.click();
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
