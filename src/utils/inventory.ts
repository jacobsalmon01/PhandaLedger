/**
 * inventory.ts
 *
 * Pure utility functions for the inventory system.
 * No React, no store, no DOM — fully unit-testable.
 */

import type { InventoryItem } from '../types/character';

/**
 * Creates a new InventoryItem with sensible defaults.
 * The caller supplies the name so the store never has to hold a "draft" name.
 */
export function createInventoryItem(name: string): InventoryItem {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    quantity: 1,
    description: '',
    valuegp: 0,
    equipped: false,
    modifiers: [],
  };
}

/**
 * Formats a GP value for display.
 *
 * Returns '—' for zero so that items without a set value don't show "0 gp"
 * in the UI. Uses locale-aware number formatting for thousands separators
 * (e.g. "1,500 gp").
 */
export function formatGP(gp: number): string {
  if (gp <= 0) return '—';
  return `${gp.toLocaleString()} gp`;
}

/**
 * Returns the total gold value of the entire inventory (quantity × valuegp).
 * Useful for a future "party wealth" summary line.
 */
export function totalInventoryValue(items: InventoryItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.valuegp, 0);
}
