import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;
import { mkdirSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8001';
const OUT = '/home/user/minimarket-pos/docs/screenshots';
mkdirSync(OUT, { recursive: true });

async function login(pin) {
  const res = await fetch(`${BASE}/api/users/login/pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  const json = await res.json();
  const data = json.data ?? json;
  data.expires_at = new Date(Date.now() + (data.expires_in ?? 28800) * 1000).toISOString();
  return data;
}

async function shot(page, path, name, { wait = 1200 } = {}) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(wait);
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(`✔ ${name}  (${path})`);
}

const ADMIN_ROUTES = [
  ['/admin/', 'admin-01-dashboard'],
  ['/admin/products', 'admin-02-productos'],
  ['/admin/categories', 'admin-03-categorias'],
  ['/admin/sales', 'admin-04-ventas'],
  ['/admin/inventory', 'admin-05-inventario'],
  ['/admin/cash', 'admin-06-cajas'],
  ['/admin/users', 'admin-07-usuarios'],
  ['/admin/reports', 'admin-08-reportes'],
  ['/admin/config', 'admin-09-configuracion'],
  ['/admin/suppliers', 'admin-10-proveedores'],
  ['/admin/purchases', 'admin-11-compras'],
  ['/admin/promotions', 'admin-12-promociones'],
  ['/admin/customers', 'admin-13-clientes'],
  ['/admin/expenses', 'admin-14-gastos'],
  ['/admin/tables', 'admin-15-mesas'],
  ['/admin/sync', 'admin-16-sincronizacion'],
  ['/admin/audit', 'admin-17-auditoria'],
];

const POS_ROUTES = [
  ['/pos/', 'pos-02-venta'],
  ['/pos/cash', 'pos-03-caja'],
  ['/pos/sales', 'pos-04-ventas'],
  ['/pos/inventory', 'pos-05-inventario'],
  ['/pos/settings', 'pos-06-configuracion'],
];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

// ---------- ADMIN ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  // Login screen (no session)
  await shot(page, '/admin/login', 'admin-00-login');
  // Inject session
  const session = await login('1234');
  await page.goto(`${BASE}/admin/`);
  await page.evaluate((s) => localStorage.setItem('admin_session', JSON.stringify(s)), session);
  for (const [path, name] of ADMIN_ROUTES) await shot(page, path, name);
  await ctx.close();
}

// ---------- POS WEB (tablet) ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await shot(page, '/pos/login', 'pos-01-login');
  const session = await login('1234');
  // Pick a register and open a cash session so the sale screen renders
  const regs = await (await fetch(`${BASE}/api/cash/registers`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })).json();
  const register = regs[0];
  const cashSession = await (await fetch(`${BASE}/api/cash/sessions/open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ register_id: register.id, opening_amount: 50000 }),
  })).json();
  await page.goto(`${BASE}/pos/`);
  await page.evaluate(({ s, cs, r }) => {
    localStorage.setItem('pos_session', JSON.stringify(s));
    localStorage.setItem('pos_cash_session', JSON.stringify(cs));
    localStorage.setItem('pos_register', JSON.stringify(r));
  }, { s: session, cs: cashSession, r: register });
  for (const [path, name] of POS_ROUTES) await shot(page, path, name);
  await ctx.close();
}

await browser.close();
console.log('\nDONE');
