/**
 * Esporta griglia anteprima 10 loghi LineUp.
 * Uso: node script/render-logo-grid.mjs
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, "../assets/marketing/logos/preview-grid.html");
const outPath = path.join(__dirname, "../assets/marketing/logos/lineup-10-logos-grid.png");

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 2160, height: 3840 },
  deviceScaleFactor: 1,
});
await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: outPath, type: "png" });
await browser.close();
console.log("✓ Griglia loghi:", outPath);
