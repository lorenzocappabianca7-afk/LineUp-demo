/**
 * Esporta griglia loghi verdi (07 + 11–20).
 * Uso: node script/render-logo-grid-green.mjs
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, "../assets/marketing/logos/preview-grid-green.html");
const outPath = path.join(__dirname, "../assets/marketing/logos/lineup-logos-green-grid.png");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2160, height: 2800 } });
await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: outPath, type: "png", fullPage: true });
await browser.close();
console.log("✓ Griglia loghi verdi:", outPath);
