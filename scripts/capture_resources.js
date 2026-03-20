#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'fs/promises';
import path from 'path';

const OUT_DIR = path.join(process.cwd(), 'tmp', 'screenshots');
await mkdir(OUT_DIR, { recursive: true });

const seed = JSON.parse(await readFile('/tmp/fighter_seed.json', 'utf-8'));
const stateJson = JSON.stringify({ characters: seed.characters, selectedId: seed.selectedId, initiative: [] });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
await page.evaluate((json) => localStorage.setItem('phandaLedger_state', json), stateJson);
await page.reload({ waitUntil: 'networkidle' });

await page.locator('.pc-item').first().click();
await page.waitForTimeout(400);
await page.locator('.sheet-tab', { hasText: 'Character' }).click();
await page.waitForTimeout(400);

const box = await page.evaluate(() => {
  const heading = Array.from(document.querySelectorAll('.section__heading'))
    .find(el => el.textContent?.includes('Resources'));
  const section = heading?.closest('.section');
  if (!section) return null;
  const rect = section.getBoundingClientRect();
  return { x: Math.max(0, rect.x - 24), y: Math.max(0, rect.y - 24), width: rect.width + 48, height: rect.height + 48 };
});

if (box) {
  await page.screenshot({ path: path.join(OUT_DIR, 'resources_zoom.png'), clip: box });
  console.log('Captured: resources_zoom.png');
}

// Full character tab
await page.screenshot({ path: path.join(OUT_DIR, 'resources_full.png'), fullPage: true });
console.log('Captured: resources_full.png');

await browser.close();
