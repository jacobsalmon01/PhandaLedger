#!/usr/bin/env node
/**
 * Screenshot script focused on the Battle Map view and toolbar.
 * Injects a synthetic map image via IndexedDB so the DM toolbar is visible.
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'fs/promises';
import path from 'path';

const OUT_DIR = path.join(process.cwd(), 'tmp', 'screenshots');
const BASE_URL = 'http://localhost:5173';

/** Build a small grid-patterned canvas data URL inside the browser context. */
async function makeMapDataUrl(page) {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 600;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2a2218';
    ctx.fillRect(0, 0, 800, 600);
    ctx.strokeStyle = 'rgba(180,150,80,0.25)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 800; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 600); ctx.stroke(); }
    for (let y = 0; y <= 600; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke(); }
    return canvas.toDataURL('image/png');
  });
}

/** Write a data URL into the app's IndexedDB map image store. */
async function writeMapToIndexedDB(page, dataUrl) {
  await page.evaluate((url) => new Promise((resolve, reject) => {
    const req = indexedDB.open('phandaLedger', 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('battleMapImages')) {
        req.result.createObjectStore('battleMapImages');
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('battleMapImages', 'readwrite');
      tx.objectStore('battleMapImages').put(url, 'current');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  }), dataUrl);
}

/** Delete the injected map from IndexedDB so it doesn't pollute future runs. */
async function clearMapFromIndexedDB(page) {
  await page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('phandaLedger', 1);
    req.onsuccess = () => {
      const tx = req.result.transaction('battleMapImages', 'readwrite');
      tx.objectStore('battleMapImages').delete('current');
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    };
    req.onerror = resolve;
  }));
}

async function capture() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  try {
    // ── Desktop 1440×900 ──────────────────────────────────────────────────────
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(10000);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // 1. Empty battle map state
    const mapBtn = page.locator('.sidebar-nav__btn', { hasText: 'Battle Map' });
    await mapBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, 'bm_01_empty.png') });
    console.log('Captured: bm_01_empty.png');

    // Inject map image into IndexedDB, then reload so the store picks it up
    const dataUrl = await makeMapDataUrl(page);
    await writeMapToIndexedDB(page, dataUrl);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.sidebar-nav__btn', { hasText: 'Battle Map' }).click();
    await page.waitForTimeout(800);

    // 2. Full page with map + toolbar
    await page.screenshot({ path: path.join(OUT_DIR, 'bm_02_full.png') });
    console.log('Captured: bm_02_full.png');

    // 3. Toolbar strip only
    const toolbar = page.locator('.bm-toolbar').first();
    if (await toolbar.count() > 0) {
      await toolbar.screenshot({ path: path.join(OUT_DIR, 'bm_03_toolbar.png') });
      console.log('Captured: bm_03_toolbar.png');
    }

    // 4. + Token menu open (icon button with gold colour)
    const tokenBtn = page.locator('.bm-toolbar__icon-btn--gold').first();
    if (await tokenBtn.count() > 0) {
      await tokenBtn.click();
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(OUT_DIR, 'bm_04_token_menu.png') });
      console.log('Captured: bm_04_token_menu.png');
      await tokenBtn.click();
      await page.waitForTimeout(200);
    }

    // 5. AoE menu open (icon button with purple colour)
    const aoeBtn = page.locator('.bm-toolbar__icon-btn--purple').first();
    if (await aoeBtn.count() > 0) {
      await aoeBtn.click();
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(OUT_DIR, 'bm_05_aoe_menu.png') });
      console.log('Captured: bm_05_aoe_menu.png');
      await aoeBtn.click();
      await page.waitForTimeout(200);
    }

    // ── Narrow 1024×768 (toolbar wrap stress test) ────────────────────────────
    const narrowPage = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    narrowPage.setDefaultTimeout(10000);
    await narrowPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await writeMapToIndexedDB(narrowPage, dataUrl);
    await narrowPage.reload({ waitUntil: 'networkidle' });
    await narrowPage.locator('.sidebar-nav__btn', { hasText: 'Battle Map' }).click();
    await narrowPage.waitForTimeout(800);
    await narrowPage.screenshot({ path: path.join(OUT_DIR, 'bm_06_narrow.png') });
    console.log('Captured: bm_06_narrow.png');
    await narrowPage.close();

    await clearMapFromIndexedDB(page);
    console.log(`\nScreenshots saved to: ${OUT_DIR}`);
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error('Screenshot failed:', err.message);
  process.exit(1);
});
