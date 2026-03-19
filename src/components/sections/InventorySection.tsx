/**
 * InventorySection
 *
 * Renders the character's inventory as a compact list. Each row shows the item
 * name, quantity, value, and an equipped toggle. Hovering a row (desktop) reveals
 * a read-only tooltip. Clicking the name toggles an inline edit panel that also
 * exposes a stat-modifier editor for items that affect character stats.
 *
 * Interaction model
 * ─────────────────
 *   • Add     — type in the footer input and press Enter or click Add.
 *   • Equip   — click the ◇/◆ toggle at the right of any row.
 *   • Edit    — click the item name to expand the edit panel.
 *   • Effects — add/remove StatModifiers in the edit panel.
 *   • Delete  — available inside the edit panel to prevent accidental removal.
 *   • Tooltip — CSS :hover, suppressed when the row is in edit mode.
 */

import { useState, useEffect } from 'react';
import type { Character, InventoryItem, StatKey, StatModifier } from '../../types/character';
import { createInventoryItem, formatGP, totalInventoryValue } from '../../utils/inventory';
import { NumericInput } from '../NumericInput';

interface Props {
  ch: Character;
  updateSelected: (updater: (ch: Character) => Character) => void;
}

const STAT_OPTIONS: { key: StatKey; label: string }[] = [
  { key: 'ac',            label: 'AC' },
  { key: 'speed',         label: 'Speed' },
  { key: 'initiative',    label: 'Initiative' },
  { key: 'hp.max',        label: 'HP Max' },
  { key: 'abilities.str', label: 'STR' },
  { key: 'abilities.dex', label: 'DEX' },
  { key: 'abilities.con', label: 'CON' },
  { key: 'abilities.int', label: 'INT' },
  { key: 'abilities.wis', label: 'WIS' },
  { key: 'abilities.cha', label: 'CHA' },
];

function formatModifier(m: StatModifier): string {
  const label = STAT_OPTIONS.find((o) => o.key === m.stat)?.label ?? m.stat;
  if (m.op === 'add') return `${m.value >= 0 ? '+' : ''}${m.value} ${label}`;
  if (m.op === 'mul') return `×${m.value} ${label}`;
  return `=${m.value} ${label}`;
}

// ── InventoryRow ──────────────────────────────────────────────────────────────

interface RowProps {
  item: InventoryItem;
  isEditing: boolean;
  onToggleEdit: () => void;
  /** Partial update — only supply the fields that changed. */
  onUpdate: (patch: Partial<Omit<InventoryItem, 'id'>>) => void;
  onRemove: () => void;
}

function InventoryRow({ item, isEditing, onToggleEdit, onUpdate, onRemove }: RowProps) {
  const [nameDraft, setNameDraft] = useState(item.name);
  const [descDraft, setDescDraft] = useState(item.description);

  useEffect(() => {
    if (!isEditing) {
      setNameDraft(item.name);
      setDescDraft(item.description);
    }
  }, [item.name, item.description, isEditing]);

  function addModifier() {
    onUpdate({ modifiers: [...item.modifiers, { stat: 'ac', op: 'add', value: 1 }] });
  }

  function updateModifier(idx: number, patch: Partial<StatModifier>) {
    onUpdate({
      modifiers: item.modifiers.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    });
  }

  function removeModifier(idx: number) {
    onUpdate({ modifiers: item.modifiers.filter((_, i) => i !== idx) });
  }

  const hasTooltipContent =
    item.description.trim() !== '' || item.valuegp > 0 || item.modifiers.length > 0;

  return (
    <div className={`inv-row${isEditing ? ' inv-row--editing' : ''}${item.equipped ? ' inv-row--equipped' : ''}`}>

      {/* ── Main (always-visible) row ── */}
      <div className="inv-row__main">
        {/* Name — click to toggle edit panel */}
        <button
          className="inv-row__name-btn"
          onClick={onToggleEdit}
          title={isEditing ? 'Collapse' : 'Edit item'}
          aria-expanded={isEditing}
        >
          <span className="inv-row__chevron">{isEditing ? '▾' : '▸'}</span>
          {item.name || <em>Unnamed</em>}
          {item.equipped && item.modifiers.length > 0 && (
            <span className="inv-row__mod-badges">
              {item.modifiers.map((m, i) => (
                <span key={i} className="inv-mod-badge">{formatModifier(m)}</span>
              ))}
            </span>
          )}
        </button>

        {/* Quantity stepper */}
        <div className="inv-row__qty">
          <button
            className="inv-qty-btn"
            onClick={() => onUpdate({ quantity: Math.max(1, item.quantity - 1) })}
            title="Decrease quantity"
            tabIndex={-1}
          >−</button>
          <span className="inv-qty-val">×{item.quantity}</span>
          <button
            className="inv-qty-btn"
            onClick={() => onUpdate({ quantity: item.quantity + 1 })}
            title="Increase quantity"
            tabIndex={-1}
          >+</button>
        </div>

        {/* Value — shown only when set */}
        <span className="inv-row__value">
          {formatGP(item.valuegp)}
        </span>

        {/* Equipped toggle */}
        <button
          className={`inv-equip-btn${item.equipped ? ' inv-equip-btn--on' : ''}`}
          onClick={(e) => { e.stopPropagation(); onUpdate({ equipped: !item.equipped }); }}
          title={item.equipped ? 'Unequip' : 'Equip'}
        >
          {item.equipped ? '◆' : '◇'}
        </button>

        {/* Tooltip — CSS :hover, suppressed in edit mode via .inv-row--editing */}
        {hasTooltipContent && (
          <div className="inv-tooltip" role="tooltip" aria-hidden="true">
            {item.description && (
              <p className="inv-tooltip__desc">{item.description}</p>
            )}
            {item.valuegp > 0 && (
              <p className="inv-tooltip__value">{formatGP(item.valuegp)}</p>
            )}
            {item.modifiers.length > 0 && (
              <p className="inv-tooltip__mods">
                {item.modifiers.map((m, i) => (
                  <span key={i} className="inv-tooltip__mod">{formatModifier(m)}</span>
                ))}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Inline edit panel (accordion) ── */}
      {isEditing && (
        <div className="inv-edit-panel">
          <div className="inv-edit-row">
            <label className="inv-edit-label">Name</label>
            <input
              className="inv-edit-input"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => onUpdate({ name: nameDraft.trim() || item.name })}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          </div>

          <div className="inv-edit-row">
            <label className="inv-edit-label">Description</label>
            <textarea
              className="inv-edit-textarea"
              value={descDraft}
              rows={3}
              placeholder="Appears in hover tooltip…"
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={() => onUpdate({ description: descDraft })}
            />
          </div>

          <div className="inv-edit-row inv-edit-row--inline">
            <div className="inv-edit-pair">
              <label className="inv-edit-label">Quantity</label>
              <NumericInput
                className="inv-edit-input inv-edit-input--short"
                value={item.quantity}
                fallback={1}
                min={1}
                onCommit={(n) => onUpdate({ quantity: Math.max(1, n) })}
              />
            </div>
            <div className="inv-edit-pair">
              <label className="inv-edit-label">Value</label>
              <div className="inv-edit-gp-row">
                <NumericInput
                  className="inv-edit-input inv-edit-input--short"
                  value={item.valuegp}
                  fallback={0}
                  min={0}
                  onCommit={(n) => onUpdate({ valuegp: Math.max(0, n) })}
                />
                <span className="inv-edit-gp-label">gp</span>
              </div>
            </div>
          </div>

          {/* ── Stat modifiers ── */}
          <div className="inv-effects-section">
            <span className="inv-effects-label">Effects</span>
            {item.modifiers.length > 0 && (
              <div className="inv-effects-list">
                {item.modifiers.map((m, idx) => (
                  <div key={idx} className="inv-effect-row">
                    <select
                      className="inv-effect-select"
                      value={m.stat}
                      onChange={(e) => updateModifier(idx, { stat: e.target.value as StatKey })}
                    >
                      {STAT_OPTIONS.map((o) => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                    <select
                      className="inv-effect-select inv-effect-select--op"
                      value={m.op}
                      onChange={(e) => updateModifier(idx, { op: e.target.value as StatModifier['op'] })}
                    >
                      <option value="add">+/−</option>
                      <option value="mul">×</option>
                      <option value="set">=</option>
                    </select>
                    <NumericInput
                      className="inv-effect-input"
                      value={m.value}
                      fallback={1}
                      onCommit={(v) => updateModifier(idx, { value: v })}
                    />
                    <button
                      className="inv-effect-remove"
                      onClick={() => removeModifier(idx)}
                      title="Remove effect"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
            <button className="inv-add-effect-btn" onClick={addModifier}>
              + Add Effect
            </button>
          </div>

          <button className="inv-remove-btn" onClick={onRemove}>
            ✕ Remove Item
          </button>
        </div>
      )}
    </div>
  );
}

// ── InventorySection ──────────────────────────────────────────────────────────

export function InventorySection({ ch, updateSelected }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  /** Applies a partial update to a single item by id. */
  function updateItem(id: string, patch: Partial<Omit<InventoryItem, 'id'>>) {
    updateSelected((c) => ({
      ...c,
      inventory: c.inventory.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  }

  /** Appends a new item and immediately opens its edit panel. */
  function addItem() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const item = createInventoryItem(trimmed);
    updateSelected((c) => ({ ...c, inventory: [...c.inventory, item] }));
    setEditingId(item.id);
    setNewName('');
  }

  /** Removes an item and collapses the edit panel if it was open. */
  function removeItem(id: string) {
    updateSelected((c) => ({
      ...c,
      inventory: c.inventory.filter((item) => item.id !== id),
    }));
    if (editingId === id) setEditingId(null);
  }

  /** Toggles the edit panel; collapses any other open panel first. */
  function toggleEdit(id: string) {
    setEditingId((prev) => (prev === id ? null : id));
  }

  /** Updates the raw gold amount held (stored on ch.gold.gp). */
  function setGold(gp: number) {
    updateSelected((c) => ({
      ...c,
      gold: { ...c.gold, gp: Math.max(0, gp) },
    }));
  }

  const itemsValue = totalInventoryValue(ch.inventory);
  const goldHeld = ch.gold.gp;

  return (
    <section className="section">
      <h2 className="section__heading">Inventory &amp; Gold</h2>

      {/* ── Gold tracker ── */}
      <div className="gold-tracker">
        <span className="gold-tracker__label">Gold held</span>
        <NumericInput
          className="gold-tracker__input"
          value={goldHeld}
          fallback={0}
          min={0}
          onCommit={setGold}
        />
        <span className="gold-tracker__unit">gp</span>

        {itemsValue > 0 && (
          <span className="gold-tracker__items-value" title="Total value of carried items">
            Items: {formatGP(itemsValue)}
          </span>
        )}
      </div>

      {/* ── Item list ── */}
      {ch.inventory.length === 0 ? (
        <p className="inv-empty">No items carried.</p>
      ) : (
        <div className="inv-list">
          {ch.inventory.map((item) => (
            <InventoryRow
              key={item.id}
              item={item}
              isEditing={editingId === item.id}
              onToggleEdit={() => toggleEdit(item.id)}
              onUpdate={(patch) => updateItem(item.id, patch)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      )}

      {/* Add-item footer */}
      <div className="inv-add-row">
        <input
          className="inv-add-input"
          placeholder="Add item…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
        />
        <button
          className="inv-add-btn"
          onClick={addItem}
          disabled={!newName.trim()}
        >
          Add
        </button>
      </div>
    </section>
  );
}
