#!/usr/bin/env node
/**
 * Screenshot capture script for PhandaLedger.
 * Requires the dev server to be running (npm run dev).
 *
 * Usage:
 *   node scripts/screenshot.js [url] [--seed path/to/export.json]
 *
 * Default URL: http://localhost:5173
 * Screenshots are saved to tmp/screenshots/
 */

import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'fs/promises';
import path from 'path';

// Parse args
let baseUrl = 'http://localhost:5173';
let seedFile = null;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--seed' && args[i + 1]) {
    seedFile = args[++i];
  } else if (!args[i].startsWith('--')) {
    baseUrl = args[i];
  }
}

const OUT_DIR = path.join(process.cwd(), 'tmp', 'screenshots');

async function capture() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.setDefaultTimeout(10000);

  try {
    // If a seed file is provided, inject it into localStorage before loading
    if (seedFile) {
      const raw = await readFile(seedFile, 'utf-8');
      const exported = JSON.parse(raw);
      const stateJson = JSON.stringify({
        characters: exported.characters,
        selectedId: exported.selectedId,
        ...(exported.initiative ? { initiative: exported.initiative } : {}),
      });
      // Navigate to the page first to set localStorage on the correct origin
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await page.evaluate((json) => {
        localStorage.setItem('phandaLedger_state', json);
      }, stateJson);
      // Reload so the app picks up the seeded data
      await page.reload({ waitUntil: 'networkidle' });
    } else {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
    }

    // 0. Expand initiative tracker if it exists
    const initHeader = page.locator('.init-tracker__header');
    if (await initHeader.count() > 0) {
      const body = page.locator('.init-tracker__body');
      if (await body.count() === 0) {
        await initHeader.click();
        await page.waitForTimeout(300);
      }
    }

    // 1. Initial load
    await page.screenshot({ path: path.join(OUT_DIR, '001_initial.png'), fullPage: true });
    console.log('Captured: 001_initial.png');

    // 2. If there are characters in the sidebar, click the first one
    const firstChar = page.locator('.pc-item').first();
    if (await firstChar.count() > 0) {
      await firstChar.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(OUT_DIR, '002_character_selected.png'), fullPage: true });
      console.log('Captured: 002_character_selected.png');

      // 3. Capture each tab if tabs exist
      const tabs = page.locator('.sheet-tab');
      const tabCount = await tabs.count();
      if (tabCount > 0) {
        for (let t = 0; t < tabCount; t++) {
          const tab = tabs.nth(t);
          const label = (await tab.textContent()).trim();
          await tab.click();
          await page.waitForTimeout(300);
          await page.screenshot({ path: path.join(OUT_DIR, `003_tab_${label.toLowerCase()}.png`), fullPage: true });
          console.log(`Captured: 003_tab_${label.toLowerCase()}.png`);
        }
      } else {
        // Fallback: scroll to bottom of the sheet to catch lower sections
        await page.evaluate(() => {
          const main = document.querySelector('.main') || document.documentElement;
          main.scrollTop = main.scrollHeight;
        });
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(OUT_DIR, '003_sheet_bottom.png'), fullPage: true });
        console.log('Captured: 003_sheet_bottom.png');
      }
    } else {
      console.log('No characters found in sidebar — only capturing initial state.');
    }

    console.log(`\nScreenshots saved to: ${OUT_DIR}`);
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error('Screenshot failed:', err.message);
  process.exit(1);
});
