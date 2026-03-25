import { useState } from 'react';
import type { Character } from '../../types/character';
import { spellAttackBonus, spellSaveDC } from '../../types/character';

interface Props {
  ch: Character;
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

const LEVEL_LABELS = ['Cantrips', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

export function SpellsCard({ ch }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const atk = spellAttackBonus(ch);
  const dc = spellSaveDC(ch);

  // Group prepared/active spells by level
  const spellsByLevel = new Map<number, typeof ch.spells>();
  for (const s of ch.spells) {
    if (!s.prepared && !s.alwaysPrepared && !s.fromItem && s.level > 0) continue;
    const group = spellsByLevel.get(s.level) ?? [];
    group.push(s);
    spellsByLevel.set(s.level, group);
  }

  const hasSpells = spellsByLevel.size > 0;

  if (!hasSpells && ch.spellSlots.every((s) => s.max === 0)) {
    return (
      <div className="pv-card pv-card--spells">
        <h2 className="pv-card__title">Spells</h2>
        <div className="pv-card__empty">No spells prepared</div>
      </div>
    );
  }

  return (
    <div className="pv-card pv-card--spells">
      <h2 className="pv-card__title">Spells</h2>

      {/* ── Spell stats banner ── */}
      <div className="pv-spells__banner">
        <div className="pv-spells__stat">
          <span className="pv-spells__stat-value">{signed(atk)}</span>
          <span className="pv-spells__stat-label">Attack</span>
        </div>
        <div className="pv-spells__stat">
          <span className="pv-spells__stat-value">{dc}</span>
          <span className="pv-spells__stat-label">Save DC</span>
        </div>
        <div className="pv-spells__stat">
          <span className="pv-spells__stat-value">{ch.spellcastingAbility.toUpperCase()}</span>
          <span className="pv-spells__stat-label">Ability</span>
        </div>
      </div>

      {/* ── Spell slot gems ── */}
      {ch.spellSlots.some((s) => s.max > 0) && (
        <div className="pv-slots">
          {ch.spellSlots.map((slot, i) => {
            if (slot.max === 0) return null;
            const remaining = slot.max - slot.used;
            return (
              <div key={i} className="pv-slots__level">
                <span className="pv-slots__label">{LEVEL_LABELS[i + 1]}</span>
                <div className="pv-slots__gems">
                  {Array.from({ length: slot.max }, (_, j) => (
                    <span
                      key={j}
                      className={`pv-slot-gem${j < remaining ? ' pv-slot-gem--available' : ''}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Spell list by level ── */}
      <div className="pv-spells__list">
        {Array.from(spellsByLevel.entries())
          .sort(([a], [b]) => a - b)
          .map(([level, spells]) => (
            <div key={level} className="pv-spells__group">
              <div className="pv-spells__group-header">{LEVEL_LABELS[level]}</div>
              {spells.map((s) => (
                <div key={s.id} className="pv-spell-row">
                  <button
                    className="pv-spell-row__name"
                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  >
                    {s.active && <span className="pv-spell-row__active">{'\u25c6'}</span>}
                    {s.name}
                    {s.concentration && <span className="pv-spell-row__conc">C</span>}
                  </button>
                  {expandedId === s.id && s.description && (
                    <div
                      className="pv-spell-row__desc"
                      dangerouslySetInnerHTML={{ __html: s.description }}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
