import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { SPELLS, ALL_CLASSES, levelLabel, type SpellEntry } from '../data/spells';

interface Props {
  onClose: () => void;
  onAddSpell?: (spell: SpellEntry, alwaysPrepared: boolean) => void;
  characterName?: string;
  existingSpellNames?: Set<string>;
  /** Pre-select this class in the filter (e.g. character's class) */
  defaultClass?: string;
}

const LEVEL_PILL_LABELS = ['C', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ALL_SCHOOLS = [...new Set(SPELLS.map((s) => s.school).filter(Boolean))].sort();

/** Normalize a class string to a compendium class key, e.g. "Life Cleric" → "cleric" */
function normalizeClass(cls: string): string {
  const lower = cls.toLowerCase();
  for (const known of ALL_CLASSES) {
    if (lower.includes(known)) return known;
  }
  return '';
}

/** Simple name substring match */
function spellMatches(s: SpellEntry, query: string): boolean {
  return !query || s._nameLower.includes(query);
}

function ComponentsBadge({ v, s, m }: { v: boolean; s: boolean; m: boolean }) {
  const parts: string[] = [];
  if (v) parts.push('V');
  if (s) parts.push('S');
  if (m) parts.push('M');
  if (!parts.length) return <span className="sc-components sc-components--none">—</span>;
  return <span className="sc-components">{parts.join(' · ')}</span>;
}

export function SpellCompendium({
  onClose,
  onAddSpell,
  characterName,
  existingSpellNames,
  defaultClass = '',
}: Props) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [classFilter, setClassFilter] = useState(() => normalizeClass(defaultClass));
  const [schoolFilter, setSchoolFilter] = useState('');
  const [selectedSpell, setSelectedSpell] = useState<SpellEntry | null>(null);
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set(existingSpellNames));
  const [alwaysPrepared, setAlwaysPrepared] = useState(false);
  // Mobile: 'list' | 'detail'
  const [mobilePanel, setMobilePanel] = useState<'list' | 'detail'>('list');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const searchRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Reset scroll when spell changes
  useEffect(() => {
    if (detailRef.current) detailRef.current.scrollTop = 0;
  }, [selectedSpell]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SPELLS.filter((s) => {
      if (levelFilter !== null && s.level !== levelFilter) return false;
      if (classFilter && !s.classes.includes(classFilter)) return false;
      if (schoolFilter && s.school !== schoolFilter) return false;
      return spellMatches(s, q);
    });
  }, [search, levelFilter, classFilter, schoolFilter]);

  // Reset focused index when results change
  useEffect(() => { setFocusedIndex(-1); }, [results]);

  // Count per level for pill badges (ignores levelFilter so you can see counts at each level)
  const levelCounts = useMemo(() => {
    const counts = new Array(10).fill(0);
    const q = search.trim().toLowerCase();
    SPELLS.forEach((s) => {
      if (classFilter && !s.classes.includes(classFilter)) return;
      if (schoolFilter && s.school !== schoolFilter) return;
      if (!spellMatches(s, q)) return;
      counts[s.level]++;
    });
    return counts;
  }, [search, classFilter, schoolFilter]);

  function selectSpell(spell: SpellEntry, index: number) {
    setSelectedSpell(spell);
    setFocusedIndex(index);
    setMobilePanel('detail');
  }

  function handleAdd(spell: SpellEntry) {
    onAddSpell?.(spell, alwaysPrepared);
    setAddedNames((prev) => new Set([...prev, spell.name]));
  }

  // Keyboard navigation in results list
  const handleListKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(focusedIndex + 1, results.length - 1);
      setFocusedIndex(next);
      selectSpell(results[next], next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(focusedIndex - 1, 0);
      setFocusedIndex(prev);
      selectSpell(results[prev], prev);
    } else if (e.key === 'Enter' && focusedIndex >= 0 && results[focusedIndex]) {
      e.preventDefault();
      if (onAddSpell) handleAdd(results[focusedIndex]);
    }
  }, [focusedIndex, results, onAddSpell, handleAdd]);

  // Scroll focused row into view
  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return;
    const row = listRef.current.querySelectorAll<HTMLElement>('.sc-row')[focusedIndex];
    row?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  const totalResults = results.length;

  return (
    <div className="sc-overlay" onClick={onClose}>
      <div className="sc-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="sc-header">
          {mobilePanel === 'detail' && selectedSpell ? (
            <button className="sc-back-btn" onClick={() => setMobilePanel('list')}>
              ← Back
            </button>
          ) : (
            <span className="sc-header__title">Spell Compendium</span>
          )}
          <span className="sc-header__count">
            {totalResults === SPELLS.length ? `${SPELLS.length} spells` : `${totalResults} / ${SPELLS.length}`}
          </span>
          <button className="sc-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className={`sc-body sc-body--${mobilePanel}`}>

          {/* ── Left panel: filters + list ── */}
          <div className="sc-list-panel">
            <div className="sc-filters">
              <input
                ref={searchRef}
                className="sc-search"
                type="text"
                placeholder="Search spells…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); }}
                onKeyDown={handleListKeyDown}
              />
              <div className="sc-level-pills">
                <button
                  className={`sc-pill${levelFilter === null ? ' sc-pill--active' : ''}`}
                  onClick={() => setLevelFilter(null)}
                >All</button>
                {LEVEL_PILL_LABELS.map((label, i) => {
                  const count = levelCounts[i];
                  return (
                    <button
                      key={i}
                      className={`sc-pill${levelFilter === i ? ' sc-pill--active' : ''}${count === 0 ? ' sc-pill--empty' : ''}`}
                      onClick={() => setLevelFilter(levelFilter === i ? null : i)}
                      disabled={count === 0}
                      title={`${count} spell${count !== 1 ? 's' : ''}`}
                    >
                      {label}
                      {count > 0 && <span className="sc-pill__count">{count}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="sc-filter-row">
                <select
                  className="sc-select"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                >
                  <option value="">All Classes</option>
                  {ALL_CLASSES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
                <select
                  className="sc-select"
                  value={schoolFilter}
                  onChange={(e) => setSchoolFilter(e.target.value)}
                >
                  <option value="">All Schools</option>
                  {ALL_SCHOOLS.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sc-results" ref={listRef} onKeyDown={handleListKeyDown}>
              {results.length === 0 ? (
                <div className="sc-results__empty">
                  <span className="sc-results__empty-icon">◈</span>
                  No spells match your filters.
                </div>
              ) : (
                results.map((spell, idx) => {
                  const isAdded = addedNames.has(spell.name);
                  const isSelected = selectedSpell?.slug === spell.slug;
                  return (
                    <button
                      key={spell.slug}
                      className={[
                        'sc-row',
                        isSelected ? 'sc-row--selected' : '',
                        isAdded ? 'sc-row--added' : '',
                        idx === focusedIndex ? 'sc-row--focused' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => selectSpell(spell, idx)}
                      tabIndex={0}
                    >
                      <span className="sc-row__name">{spell.name}</span>
                      <span className="sc-row__badges">
                        <span className={`sc-level-badge sc-school-color--${spell.school.toLowerCase()}`}>
                          {spell.level === 0 ? 'C' : spell.level}
                        </span>
                        {spell.ritual && <span className="sc-ritual-badge" title="Ritual">R</span>}
                        {isAdded && <span className="sc-added-badge" title="On your spell list">✓</span>}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Right panel: detail ── */}
          <div className="sc-detail-panel" ref={detailRef}>
            {!selectedSpell ? (
              <div className="sc-empty">
                <span className="sc-empty__glyph">✦</span>
                <span className="sc-empty__title">No spell selected</span>
                <span className="sc-empty__hint">
                  Search or filter on the left, then click any spell to see its full description.
                  {onAddSpell && ` Use "${characterName ? `Add to ${characterName}` : 'Add to spell list'}" to add it.`}
                </span>
                {onAddSpell && (
                  <span className="sc-empty__tip">Tip: Enter adds the focused spell · Arrow keys navigate</span>
                )}
              </div>
            ) : (
              <div className="sc-detail">
                <div className="sc-detail__nameblock">
                  <div className="sc-detail__name">{selectedSpell.name}</div>
                  <div className="sc-detail__meta">
                    <span className="sc-detail__level">
                      {selectedSpell.level === 0
                        ? 'Cantrip'
                        : `${levelLabel(selectedSpell.level)}-level spell`}
                    </span>
                    <span className={`sc-school-badge sc-school-badge--${selectedSpell.school.toLowerCase()}`}>
                      {selectedSpell.school}
                    </span>
                    {selectedSpell.ritual && <span className="sc-ritual-tag">Ritual</span>}
                    {selectedSpell.concentration && <span className="sc-conc-tag">Concentration</span>}
                  </div>
                </div>

                <div className="sc-detail__stats">
                  {[
                    { label: 'Casting Time', value: selectedSpell.castingTime },
                    { label: 'Range',        value: selectedSpell.range },
                    { label: 'Duration',     value: selectedSpell.duration },
                    { label: 'Components',   value: null },
                  ].map(({ label, value }) => (
                    <div key={label} className="sc-stat">
                      <span className="sc-stat__label">{label}</span>
                      {label === 'Components' ? (
                        <span className="sc-stat__value">
                          <ComponentsBadge {...selectedSpell.components} />
                          {selectedSpell.components.m && selectedSpell.components.materials && (
                            <span className="sc-materials"> — {selectedSpell.components.materials}</span>
                          )}
                        </span>
                      ) : (
                        <span className="sc-stat__value">{value || '—'}</span>
                      )}
                    </div>
                  ))}
                </div>

                {selectedSpell.classes.length > 0 && (
                  <div className="sc-detail__classes">
                    {selectedSpell.classes.map((c) => (
                      <button
                        key={c}
                        className={`sc-class-tag${classFilter === c ? ' sc-class-tag--active' : ''}`}
                        title={`Filter by ${c}`}
                        onClick={() => setClassFilter(classFilter === c ? '' : c)}
                      >
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </button>
                    ))}
                  </div>
                )}

                <div
                  className="sc-detail__description"
                  dangerouslySetInnerHTML={{ __html: selectedSpell.description.replace(/<br\s*\/?>/gi, '<br/>') }}
                />

                {selectedSpell.higherLevels && (
                  <div className="sc-detail__higher">
                    <span className="sc-detail__higher-label">At Higher Levels. </span>
                    <span dangerouslySetInnerHTML={{ __html: selectedSpell.higherLevels }} />
                  </div>
                )}

                {onAddSpell && (
                  <div className="sc-detail__add">
                    <label className="sc-always-prepared-toggle">
                      <input
                        type="checkbox"
                        className="sc-always-prepared-checkbox"
                        checked={alwaysPrepared}
                        onChange={(e) => setAlwaysPrepared(e.target.checked)}
                      />
                      <span className="sc-always-prepared-mark">◈</span>
                      <span className="sc-always-prepared-label">
                        Always Prepared
                        <span className="sc-always-prepared-hint"> — domain, subclass, or oath spell</span>
                      </span>
                    </label>
                    {addedNames.has(selectedSpell.name) ? (
                      <div className="sc-add-row">
                        <span className="sc-already-added">✓ Added to {characterName ?? 'spell list'}</span>
                        <button
                          className="sc-add-btn sc-add-btn--again"
                          onClick={() => handleAdd(selectedSpell)}
                          title="Add again (e.g. to track at a different level)"
                        >
                          Add Again
                        </button>
                      </div>
                    ) : (
                      <button
                        className="sc-add-btn"
                        onClick={() => handleAdd(selectedSpell)}
                      >
                        + Add to {characterName ?? 'spell list'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
