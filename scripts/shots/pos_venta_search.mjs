import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;
const BASE = 'http://127.0.0.1:8001';
const OUT = '/home/user/minimarket-pos/docs/screenshots';

const res = await fetch(`${BASE}/api/users/login/pin`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({pin:'1234'}) });
const session = (await res.json()).data; session.expires_at = new Date(Date.now()+28800000).toISOString();
const regs = await (await fetch(`${BASE}/api/cash/registers`, {headers:{Authorization:`Bearer ${session.access_token}`}})).json();
const register = regs[0];
const cs = await (await fetch(`${BASE}/api/cash/sessions/open`, {method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}`}, body: JSON.stringify({register_id: register.id, opening_amount: 50000})})).json();

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport:{width:1024,height:768}, deviceScaleFactor:2 });
const page = await ctx.newPage();
await page.goto(`${BASE}/pos/`);
await page.evaluate(({s,cs,r})=>{localStorage.setItem('pos_session',JSON.stringify(s));localStorage.setItem('pos_cash_session',JSON.stringify(cs));localStorage.setItem('pos_register',JSON.stringify(r));},{s:session,cs,r:register});
await page.goto(`${BASE}/pos/`, {waitUntil:'networkidle'});
await page.waitForTimeout(1000);
const box = page.locator('input[placeholder*="Buscar"]').first();
await box.click(); await box.fill('cerveza');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/pos-02-venta.png`, fullPage:true });
console.log('venta con búsqueda OK');
await browser.close();
