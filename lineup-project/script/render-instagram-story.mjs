/**
 * Esporta story Instagram 1080×1920 da HTML.
 * Uso: node script/render-instagram-story.mjs
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, "../assets/marketing/story-lineup.html");
const outPath = path.join(__dirname, "../assets/marketing/lineup-instagram-story-9x16.png");

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 2,
});
await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: outPath, type: "png" });
await browser.close();
console.log("✓ Story salvata:", outPath, "(1080×1920 @2x)");
