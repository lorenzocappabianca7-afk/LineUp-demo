import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, "../assets/marketing/logos/preview-grid-huddle.html");
const outPath = path.join(__dirname, "../assets/marketing/logos/lineup-huddle-5-grid.png");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });
await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: outPath, type: "png", fullPage: true });
await browser.close();
console.log("✓", outPath);
