import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;
const BASE = 'http://127.0.0.1:5173';
const OUT = '/home/user/minimarket-pos/docs/screenshots';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
for (const [hash, name] of [['#/customer-display','electron-06-display-cliente'],['#/kitchen-display','electron-07-display-cocina']]) {
  await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log('✔', name);
}
await browser.close();
console.log('DONE');
