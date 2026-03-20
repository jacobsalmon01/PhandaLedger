#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'fs/promises';
import path from 'path';

const OUT_DIR = path.join(process.cwd(), 'tmp', 'screenshots');
await mkdir(OUT_DIR, { recursive: true });

const seed = JSON.parse(await readFile('/tmp/wizard_seed.json', 'utf-8'));
const stateJson = JSON.stringify({ characters: seed.characters, selectedId: seed.selectedId, initiative: [] });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
await page.evaluate((json) => localStorage.setItem('phandaLedger_state', json), stateJson);
await page.reload({ waitUntil: 'networkidle' });

await page.locator('.pc-item').first().click();
await page.waitForTimeout(400);
await page.locator('.sheet-tab', { hasText: 'Spells' }).click();
await page.waitForTimeout(400);

// Scroll to spell slots section
await page.evaluate(() => {
  const main = document.querySelector('.main');
  if (main) main.scrollTop = main.scrollHeight;
});
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT_DIR, 'slots_scrolled.png') });
console.log('Captured: slots_scrolled.png');

// Full page
await page.evaluate(() => { const m = document.querySelector('.main'); if (m) m.scrollTop = 0; });
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(OUT_DIR, 'slots_full.png'), fullPage: true });
console.log('Captured: slots_full.png');

await browser.close();
