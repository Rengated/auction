import { chromium } from 'playwright';

const BASE = process.env.ADMIN_URL || 'http://localhost:5183';
const OUT = '/tmp/shots';
import { mkdirSync } from 'fs';
mkdirSync(OUT, { recursive: true });

const pages = [
  ['dashboard', '/'],
  ['lots', '/lots'],
  ['users', '/users'],
  ['staff', '/staff'],
  ['deals', '/deals'],
  ['settings', '/settings'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

// Login
await page.goto(BASE, { waitUntil: 'networkidle' });
const userInput = page.locator('input[autocomplete="username"]');
if (await userInput.count()) {
  await userInput.fill('admin');
  await page.locator('input[type="password"]').fill('password');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1500);
}

for (const [name, path] of pages) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/m-${name}.png`, fullPage: true });
  console.log('shot', name);
}

// Open the burger drawer on dashboard
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const burger = page.locator('.burger');
if (await burger.count()) {
  await burger.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/m-drawer.png` });
  console.log('shot drawer');
}

await browser.close();
console.log('done');
