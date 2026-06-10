#!/usr/bin/env node
/**
 * One-off visual check for the Combat Board overlay.
 * Seeds an SKT-scale fight (5 PCs + 5 allied NPCs + 3 enemy packs ×5 + giants),
 * opens the board, and captures it. Requires `npm run dev` running on :5173.
 */
import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'fs/promises';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:5173';
const OUT = path.join(process.cwd(), 'tmp', 'screenshots');

// stable id helper for seeded enemies
let n = 0;
const eid = () => `e${++n}`;
const pack = (count, maxHp, woundedIdx = []) =>
  Array.from({ length: count }, (_, i) => ({
    id: eid(),
    maxHp,
    hp: woundedIdx.includes(i) ? Math.ceil(maxHp * (i % 2 ? 0.2 : 0.5)) : maxHp,
  }));

async function main() {
  await mkdir(OUT, { recursive: true });
  const seed = JSON.parse(await readFile('our_party_setup_seed.json', 'utf-8'));
  const chars = seed.characters;

  // Give a couple of PCs conditions + a concentration spell to exercise chips.
  chars[0].conditions = [{ name: 'Prone' }];
  chars[1].conditions = [{ name: 'Poisoned', rounds: 3 }];
  chars[3].spells = [
    {
      id: 's1', name: 'Bless', level: 1, concentration: true,
      duration: 'Concentration, up to 1 minute', durationRounds: 10,
      castingTime: '1 action', notes: '', description: '', prepared: true,
      alwaysPrepared: false, fromItem: false, itemChargesEmpty: false,
      active: true, roundsRemaining: 10,
    },
  ];

  const initiative = [
    // 5 PCs (linked)
    ...chars.map((c, i) => ({
      id: `pc${i}`, name: c.name, initiative: [22, 19, 15, 11, 8][i],
      type: 'pc', characterId: c.id,
    })),
    // 5 allied NPCs (single creatures with HP)
    { id: 'npc-volo', name: 'Volothamp', initiative: 17, type: 'npc', enemies: pack(1, 24) },
    { id: 'npc-sgt', name: 'Sgt. Halira', initiative: 14, type: 'npc', enemies: pack(1, 30, [0]) },
    { id: 'npc-scout', name: 'Scout Brem', initiative: 13, type: 'npc', enemies: pack(1, 16) },
    { id: 'npc-priest', name: 'Acolyte Pell', initiative: 9, type: 'npc', enemies: pack(1, 18) },
    { id: 'npc-mage', name: 'Aldwin', initiative: 6, type: 'npc', enemies: pack(1, 22) },
    // 3 enemy packs ×5
    { id: 'goblins', name: 'Goblins', initiative: 16, type: 'npc', enemies: pack(5, 7, [0, 2]) },
    { id: 'wolves', name: 'Winter Wolves', initiative: 12, type: 'npc', enemies: pack(5, 9, [1, 3, 4]) },
    { id: 'cultists', name: 'Frost Cultists', initiative: 10, type: 'npc', enemies: pack(5, 9) },
    // 2 giants
    { id: 'giants', name: 'Frost Giants', initiative: 7, type: 'npc', enemies: pack(2, 138, [0]) },
  ];

  const state = JSON.stringify({ characters: chars, selectedId: chars[0].id, initiative });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1680, height: 1000 } });
  page.setDefaultTimeout(10000);
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate((j) => localStorage.setItem('phandaLedger_state', j), state);
    await page.reload({ waitUntil: 'networkidle' });

    // Open the board from the sidebar tracker.
    await page.locator('.init-btn--board').click();
    await page.waitForSelector('.cb-board');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, 'cb_01_open.png') });
    console.log('Captured cb_01_open.png');

    // Start combat → first turn active (shows NOW/NEXT + active glow).
    await page.locator('.cb-btn--next').click();
    await page.waitForTimeout(200);
    // Advance a couple turns via spacebar to land the active highlight on a pack.
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, 'cb_02_active.png') });
    console.log('Captured cb_02_active.png');
  } finally {
    await browser.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
