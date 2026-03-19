#!/usr/bin/env node
/**
 * Screenshot capture script for PhandaLedger.
 * Requires the dev server to be running (npm run dev).
 *
 * Usage:
 *   node scripts/screenshot.js [url]
 *
 * Default URL: http://localhost:5173
 * Screenshots are saved to tmp/screenshots/
 */

import { chromium } from '@playwright/test';
import { mkdir } from 'fs/promises';
import path from 'path';

const BASE_URL = process.argv[2] || 'http://localhost:5173';
const OUT_DIR = path.join(process.cwd(), 'tmp', 'screenshots');

async function capture() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);

  try {
    // Wait for the dev server to be ready
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // 1. Initial load — no character selected
    await page.screenshot({ path: path.join(OUT_DIR, '001_initial.png'), fullPage: true });
    console.log('Captured: 001_initial.png');

    // 2. If there are characters in the sidebar, click the first one
    const firstChar = page.locator('.sidebar .char-entry, .sidebar [data-char], .char-list-item').first();
    if (await firstChar.count() > 0) {
      await firstChar.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT_DIR, '002_character_selected.png'), fullPage: true });
      console.log('Captured: 002_character_selected.png');

      // 3. Scroll to bottom of the sheet to catch lower sections
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(OUT_DIR, '003_sheet_bottom.png'), fullPage: true });
      console.log('Captured: 003_sheet_bottom.png');
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
