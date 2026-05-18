/** Salta l'anteprima animata post-sondaggio (demo) se visibile. */
export async function skipGroupLifeDemo(page) {
  const skip = page.locator('[data-testid="button-skip-group-life-demo"]');
  try {
    await page.waitForSelector('[data-testid="pianifica-group-life-demo"]', { timeout: 3000 });
    await skip.waitFor({ state: "visible", timeout: 2000 });
    await skip.click();
    await page.waitForSelector('[data-testid="preview-completion-scroll"]', { timeout: 5000 });
  } catch {
    /* già su completamento o build senza animazione */
  }
}

/** Dopo «Crea evento con questo sondaggio» attende la schermata finale. */
export async function waitForPreviewCompletion(page, timeout = 20_000) {
  await skipGroupLifeDemo(page);
  await page.waitForSelector('[data-testid="preview-completion-scroll"]', { timeout });
}
