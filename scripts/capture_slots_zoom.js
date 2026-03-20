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

// Scroll spell slots section into view
await page.evaluate(() => {
  const section = Array.from(document.querySelectorAll('.section__heading'))
    .find(el => el.textContent?.includes('Spell Slots'));
  section?.scrollIntoView({ behavior: 'instant', block: 'center' });
});
await page.waitForTimeout(300);

// Grab bounding box of the spell slots section
const box = await page.evaluate(() => {
  const heading = Array.from(document.querySelectorAll('.section__heading'))
    .find(el => el.textContent?.includes('Spell Slots'));
  const section = heading?.closest('.section');
  if (!section) return null;
  const rect = section.getBoundingClientRect();
  return { x: rect.x - 16, y: rect.y - 16, width: rect.width + 32, height: rect.height + 32 };
});

if (box) {
  await page.screenshot({ path: path.join(OUT_DIR, 'slots_zoom.png'), clip: box });
  console.log('Captured: slots_zoom.png');
} else {
  await page.screenshot({ path: path.join(OUT_DIR, 'slots_zoom.png') });
  console.log('Captured: slots_zoom.png (fallback)');
}

await browser.close();
