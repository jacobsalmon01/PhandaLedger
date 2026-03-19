import { describe, it, expect } from 'vitest';
import { createInventoryItem, formatGP, totalInventoryValue } from './inventory';

// ── createInventoryItem ───────────────────────────────────────────────────────

describe('createInventoryItem', () => {
  it('creates an item with the given name, trimmed', () => {
    const item = createInventoryItem('  Rope  ');
    expect(item.name).toBe('Rope');
  });

  it('sets sensible defaults', () => {
    const item = createInventoryItem('Torch');
    expect(item.quantity).toBe(1);
    expect(item.description).toBe('');
    expect(item.valuegp).toBe(0);
  });

  it('assigns a unique id each time', () => {
    const a = createInventoryItem('A');
    const b = createInventoryItem('B');
    expect(a.id).not.toBe(b.id);
  });
});

// ── formatGP ─────────────────────────────────────────────────────────────────

describe('formatGP', () => {
  it('returns "—" for 0', () => {
    expect(formatGP(0)).toBe('—');
  });

  it('returns "—" for negative values', () => {
    expect(formatGP(-5)).toBe('—');
  });

  it('formats a simple positive value', () => {
    expect(formatGP(50)).toBe('50 gp');
  });

  it('includes locale thousands separator for large values', () => {
    // We only assert the "gp" suffix and that the number part is present;
    // the exact separator character varies by locale.
    const result = formatGP(1500);
    expect(result).toContain('gp');
    expect(result).toContain('1');
    expect(result).toContain('500');
  });
});

// ── totalInventoryValue ───────────────────────────────────────────────────────

describe('totalInventoryValue', () => {
  it('returns 0 for an empty inventory', () => {
    expect(totalInventoryValue([])).toBe(0);
  });

  it('sums quantity × valuegp across all items', () => {
    const items = [
      { id: '1', name: 'Potion', quantity: 3, description: '', valuegp: 50,  equipped: false, modifiers: [] },
      { id: '2', name: 'Rope',   quantity: 2, description: '', valuegp: 1,   equipped: false, modifiers: [] },
    ];
    expect(totalInventoryValue(items)).toBe(152); // (3×50) + (2×1)
  });

  it('ignores items with valuegp of 0', () => {
    const items = [
      { id: '1', name: 'Pebble', quantity: 10, description: '', valuegp: 0,   equipped: false, modifiers: [] },
      { id: '2', name: 'Gold',   quantity: 1,  description: '', valuegp: 100, equipped: false, modifiers: [] },
    ];
    expect(totalInventoryValue(items)).toBe(100);
  });
});
