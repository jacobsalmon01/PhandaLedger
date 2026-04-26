import { useState, useMemo } from 'react';
import type { Character } from '../../types/character';
import { spellAttackBonus, spellSaveDC } from '../../types/character';
import { SPELLS, type SpellEntry } from '../../data/spells';
import { normalizeClass } from '../SpellCompendium';

interface Props {
  ch: Character;
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function spellDescriptionHtml(description: string): string {
  const normalized = description.replace(/<br\s*\/?>/gi, '<br/>');
  if (/<[a-zA-Z][\s\S]*>/.test(normalized)) return normalized;
  return normalized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br/>');
}

const LEVEL_LABELS = ['Cantrips', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

type SpellStatus = 'prepared' | 'learned' | 'available';

interface BookEntry {
  spell: SpellEntry;
  status: SpellStatus;
}

function SpellBook({ ch }: Props) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [collapsedLevels, setCollapsedLevels] = useState<Set<number>>(() => new Set([0,1,2,3,4,5,6,7,8,9]));

  const normalizedClass = useMemo(() => normalizeClass(ch.class), [ch.class]);

  const classSpells = useMemo(() => {
    if (!normalizedClass) return [];
    return SPELLS.filter(s => s.classes.includes(normalizedClass));
  }, [normalizedClass]);

  // Map character's spells by lowercase name for lookup
  const charSpellMap = useMemo(() => {
    const m = new Map<string, typeof ch.spells[number]>();
    for (const s of ch.spells) {
      m.set(s.name.toLowerCase(), s);
    }
    return m;
  }, [ch.spells]);

  // Build book entries grouped by level
  const grouped = useMemo(() => {
    const query = search.toLowerCase();
    const groups = new Map<number, BookEntry[]>();

    for (const spell of classSpells) {
      if (query && !spell._nameLower.includes(query)) continue;

      const charSpell = charSpellMap.get(spell._nameLower);
      let status: SpellStatus = 'available';
      if (charSpell) {
        status = (charSpell.prepared || charSpell.alwaysPrepared) ? 'prepared' : 'learned';
      }

      const group = groups.get(spell.level) ?? [];
      group.push({ spell, status });
      groups.set(spell.level, group);
    }

    // Sort each group: prepared → learned → available, alpha within
    const statusOrder: Record<SpellStatus, number> = { prepared: 0, learned: 1, available: 2 };
    for (const [, entries] of groups) {
      entries.sort((a, b) => {
        const d = statusOrder[a.status] - statusOrder[b.status];
        if (d !== 0) return d;
        return a.spell.name.localeCompare(b.spell.name);
      });
    }

    return groups;
  }, [classSpells, charSpellMap, search]);

  if (classSpells.length === 0) return null;

  const isSearching = search.length > 0;
  const statusIcon: Record<SpellStatus, string> = { prepared: '\u25cf', learned: '\u25d0', available: '\u25cb' };

  const toggleLevel = (level: number) => {
    setCollapsedLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  return (
    <div className="pv-spellbook">
      <div className="pv-spellbook__header">Spell Book</div>
      <input
        type="text"
        className="pv-spellbook__search"
        placeholder="Search spells\u2026"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {Array.from(grouped.entries())
        .sort(([a], [b]) => a - b)
        .map(([level, entries]) => {
          const isCollapsed = !isSearching && collapsedLevels.has(level);
          const prepCount = entries.filter(e => e.status === 'prepared').length;
          const learnedCount = entries.filter(e => e.status === 'learned').length;

          return (
            <div key={level} className="pv-spellbook__group">
              <button
                className="pv-spellbook__group-toggle"
                onClick={() => toggleLevel(level)}
              >
                <span className={`pv-spellbook__chevron${isCollapsed ? '' : ' pv-spellbook__chevron--open'}`}>&#9656;</span>
                <span className="pv-spellbook__group-name">{LEVEL_LABELS[level]}</span>
                <span className="pv-spellbook__group-count">{entries.length}</span>
                {prepCount > 0 && <span className="pv-spellbook__group-badge pv-spellbook__group-badge--prep">{prepCount} prep</span>}
                {learnedCount > 0 && <span className="pv-spellbook__group-badge pv-spellbook__group-badge--learned">{learnedCount} learned</span>}
              </button>

              {!isCollapsed && entries.map(({ spell, status }) => (
                <div key={spell.slug} className={`pv-spellbook__row pv-spellbook__row--${status}`}>
                  <button
                    className="pv-spellbook__row-btn"
                    onClick={() => setExpandedId(expandedId === spell.slug ? null : spell.slug)}
                  >
                    <span className={`pv-spellbook__indicator pv-spellbook__indicator--${status}`}>{statusIcon[status]}</span>
                    <span className="pv-spellbook__spell-name">{spell.name}</span>
                    {spell.concentration && <span className="pv-spell-row__conc">C</span>}
                    {spell.ritual && <span className="pv-spell-row__conc">R</span>}
                  </button>
                  {expandedId === spell.slug && spell.description && (
                    <div
                      className="pv-spell-row__desc"
                      dangerouslySetInnerHTML={{ __html: spell.description }}
                    />
                  )}
                </div>
              ))}
            </div>
          );
        })}
    </div>
  );
}

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
  const hasClassSpells = normalizeClass(ch.class) !== '';

  if (!hasSpells && ch.spellSlots.every((s) => s.max === 0) && !hasClassSpells) {
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

      {/* ── Active Spells by level ── */}
      {hasSpells && (
        <>
          <div className="pv-spellbook__section-label">Active Spells</div>
          <div className="pv-spells__list">
            {Array.from(spellsByLevel.entries())
              .sort(([a], [b]) => a - b)
              .map(([level, spells]) => (
                <div key={level} className="pv-spells__group">
                  <div className="pv-spells__group-header">{LEVEL_LABELS[level]}</div>
                  {spells.map((s, spellIndex) => {
                    const hasDescription = s.description.trim().length > 0;
                    const rowId = s.id || `${level}:${spellIndex}:${s.name}`;
                    const isExpanded = expandedId === rowId;
                    return (
                      <div key={rowId} className="pv-spell-row">
                        <button
                          className={`pv-spell-row__name${hasDescription ? ' pv-spell-row__name--expandable' : ''}`}
                          onClick={() => hasDescription && setExpandedId(isExpanded ? null : rowId)}
                          title={hasDescription ? (isExpanded ? 'Hide description' : 'Show description') : undefined}
                        >
                          {s.active && <span className="pv-spell-row__active">{'\u25c6'}</span>}
                          <span className="pv-spell-row__title">{s.name}</span>
                          {s.concentration && <span className="pv-spell-row__conc">C</span>}
                          {hasDescription && <span className="pv-spell-row__info">{isExpanded ? '\u25be' : '\u25b8'}</span>}
                        </button>
                        {(s.castingTime || s.duration || s.notes) && (
                          <div className="pv-spell-row__summary">
                            {(s.castingTime || s.duration) && (
                              <span className="pv-spell-row__meta">
                                {[s.castingTime, s.duration].filter(Boolean).join(' · ')}
                              </span>
                            )}
                            {s.notes && <span className="pv-spell-row__notes">{s.notes}</span>}
                          </div>
                        )}
                        {isExpanded && hasDescription && (
                          <div
                            className="pv-spell-row__desc"
                            dangerouslySetInnerHTML={{ __html: spellDescriptionHtml(s.description) }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        </>
      )}

      {/* ── Spell Book ── */}
      <SpellBook ch={ch} />
    </div>
  );
}
