import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;

const BASE = 'http://127.0.0.1:5173';
const OUT = '/home/user/minimarket-pos/docs/screenshots';

async function shot(page, name, wait = 1200) {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`✔ ${name}`);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('  [console.error]', m.text().slice(0, 120)); });

// 1. Login (PIN pad)
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await shot(page, 'electron-01-login');

// 2. Enter PIN 1234 by clicking the on-screen pad -> RegisterSelect
for (const d of ['1', '2', '3', '4']) {
  await page.locator('button', { hasText: new RegExp(`^${d}$`) }).first().click();
  await page.waitForTimeout(150);
}
await page.locator('button', { hasText: /^OK$/ }).first().click();
await page.waitForTimeout(2000);
await shot(page, 'electron-02-seleccion-caja');

// 3. Pick a register WITHOUT an open session -> OpenSession
await page.locator('button', { hasText: /Caja 2/ }).first().click();
await page.waitForTimeout(1500);
await shot(page, 'electron-03-apertura-caja');

// 4. Fill opening amount -> POS
const amount = page.locator('input[type="number"]').first();
await amount.click();
await amount.fill('50000');
await page.locator('button', { hasText: /Abrir Caja/i }).first().click();
await page.waitForTimeout(2500);
await shot(page, 'electron-04-pos');

// 5. Settings (client-side nav from POS)
const settingsBtn = page.locator('button:has(svg.lucide-settings)').first();
if (await settingsBtn.count()) {
  await settingsBtn.click();
  await page.waitForTimeout(1500);
  await shot(page, 'electron-05-configuracion');
} else {
  console.log('  settings button not found');
}

// 6 & 7. Secondary displays (auth-bypass routes, full reload OK)
await page.goto(`${BASE}/customer-display`, { waitUntil: 'networkidle' });
await shot(page, 'electron-06-display-cliente');
await page.goto(`${BASE}/kitchen-display`, { waitUntil: 'networkidle' });
await shot(page, 'electron-07-display-cocina');

await browser.close();
console.log('\nDONE');
