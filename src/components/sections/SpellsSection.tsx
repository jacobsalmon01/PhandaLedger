import { useState, useMemo } from 'react';
import type { Character, PreparedSpell, SpellcastingAbility } from '../../types/character';
import { spellAttackBonus, spellSaveDC, abilityMod, profBonus } from '../../types/character';
import { uuid } from '../../utils/uuid';
import { SpellCompendium, normalizeClass } from '../SpellCompendium';
import { SPELLS, type SpellEntry } from '../../data/spells';

interface Props {
  ch: Character;
  updateSelected: (updater: (ch: Character) => Character) => void;
}

const ORDINALS = ['Cantrip','1st','2nd','3rd','4th','5th','6th','7th','8th','9th'];

const CASTING_TIMES = [
  '1 action', 'Bonus action', 'Reaction', '1 minute', '10 minutes', '1 hour',
];

const DURATIONS = [
  'Instantaneous', '1 round', '1 minute', '10 minutes', '1 hour', '8 hours',
  '24 hours', 'Until dispelled',
  'Concentration, up to 1 round', 'Concentration, up to 1 minute',
  'Concentration, up to 10 minutes', 'Concentration, up to 1 hour',
];

function blankSpell(): Omit<PreparedSpell, 'id'> {
  return {
    name: '', level: 1, concentration: false,
    duration: '', durationRounds: 0, castingTime: '1 action',
    notes: '', description: '', prepared: true, alwaysPrepared: false, fromItem: false, itemChargesEmpty: false, active: false, roundsRemaining: 0,
  };
}

function hasSlot(ch: Character, level: number): boolean {
  if (level === 0) return true;
  const slot = ch.spellSlots[level - 1] ?? { max: 0, used: 0 };
  return slot.used < slot.max;
}

// ── Spell form ────────────────────────────────────────────────────────────────

interface FormProps {
  form: Omit<PreparedSpell, 'id'>;
  patch: <K extends keyof Omit<PreparedSpell, 'id'>>(k: K, v: Omit<PreparedSpell, 'id'>[K]) => void;
  onSave: () => void;
  onCancel: () => void;
}

function SpellForm({ form, patch, onSave, onCancel }: FormProps) {
  return (
    <div className="spell-form">
      <div className="spell-form__row">
        <label className="spell-form__field spell-form__field--wide">
          <span className="spell-form__label">Name</span>
          <input
            className="spell-form__input"
            value={form.name}
            placeholder="Fireball…"
            autoFocus
            onChange={(e) => patch('name', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSave()}
          />
        </label>

        <label className="spell-form__field">
          <span className="spell-form__label">Level</span>
          <select
            className="spell-form__select"
            value={form.level}
            onChange={(e) => patch('level', parseInt(e.target.value, 10))}
          >
            {ORDINALS.map((label, i) => (
              <option key={i} value={i}>{label}</option>
            ))}
          </select>
        </label>

        <label className="spell-form__field">
          <span className="spell-form__label">Casting Time</span>
          <input
            className="spell-form__input spell-form__input--md"
            list="spell-casting-times"
            value={form.castingTime}
            placeholder="1 action"
            onChange={(e) => patch('castingTime', e.target.value)}
          />
          <datalist id="spell-casting-times">
            {CASTING_TIMES.map((t) => <option key={t} value={t} />)}
          </datalist>
        </label>

        <label className="spell-form__field spell-form__field--wide">
          <span className="spell-form__label">Duration</span>
          <input
            className="spell-form__input"
            list="spell-durations"
            value={form.duration}
            placeholder="1 minute"
            onChange={(e) => patch('duration', e.target.value)}
          />
          <datalist id="spell-durations">
            {DURATIONS.map((d) => <option key={d} value={d} />)}
          </datalist>
        </label>

        <label className="spell-form__field">
          <span className="spell-form__label">Rounds</span>
          <input
            type="number"
            className="spell-form__input spell-form__input--sm"
            value={form.durationRounds}
            min={0}
            placeholder="0"
            onChange={(e) =>
              patch('durationRounds', Math.max(0, parseInt(e.target.value, 10) || 0))
            }
          />
        </label>
      </div>

      <div className="spell-form__row">
        <label className="spell-form__field spell-form__field--wide">
          <span className="spell-form__label">Notes</span>
          <input
            className="spell-form__input"
            value={form.notes}
            placeholder="DC 15 Wis save · 8d6 fire · 20ft radius…"
            onChange={(e) => patch('notes', e.target.value)}
          />
        </label>

        <label className="spell-form__toggle">
          <input
            type="checkbox"
            checked={form.concentration}
            onChange={(e) => patch('concentration', e.target.checked)}
          />
          Concentration
        </label>
        <label className="spell-form__toggle" title="Always prepared — granted by class or subclass, doesn't count against preparation limit">
          <input
            type="checkbox"
            checked={form.alwaysPrepared}
            onChange={(e) => patch('alwaysPrepared', e.target.checked)}
          />
          Always Prepared
        </label>
        <label className="spell-form__toggle" title="Provided by a magic item — doesn't count against preparation limit">
          <input
            type="checkbox"
            checked={form.fromItem}
            onChange={(e) => patch('fromItem', e.target.checked)}
          />
          From Item
        </label>
      </div>

      <div className="spell-form__row spell-form__row--actions">
        <button
          className="spell-form__save"
          onClick={onSave}
          disabled={!form.name.trim()}
        >
          Save
        </button>
        <button className="spell-form__cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── DM Spell Book ─────────────────────────────────────────────────────────────

const LEVEL_LABELS = ['Cantrips', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

type SpellStatus = 'prepared' | 'learned' | 'available';

interface BookEntry {
  spell: SpellEntry;
  status: SpellStatus;
  charSpellId?: string; // id of the PreparedSpell on character, if learned/prepared
}

function DmSpellBook({ ch, updateSelected }: Props) {
  const [search, setSearch] = useState('');
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [collapsedLevels, setCollapsedLevels] = useState<Set<number>>(() => new Set([0,1,2,3,4,5,6,7,8,9]));

  const normalizedClass = useMemo(() => normalizeClass(ch.class), [ch.class]);

  const classSpells = useMemo(() => {
    if (!normalizedClass) return [];
    return SPELLS.filter(s => s.classes.includes(normalizedClass));
  }, [normalizedClass]);

  // Map character's spells by lowercase name
  const charSpellMap = useMemo(() => {
    const m = new Map<string, PreparedSpell>();
    for (const s of ch.spells) {
      m.set(s.name.toLowerCase(), s);
    }
    return m;
  }, [ch.spells]);

  // Build grouped entries
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
      group.push({ spell, status, charSpellId: charSpell?.id });
      groups.set(spell.level, group);
    }

    // Sort: prepared → learned → available, then alpha
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

  function toggleLevel(level: number) {
    setCollapsedLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  function addSpell(entry: SpellEntry) {
    const spell: PreparedSpell = {
      id: uuid(),
      name: entry.name,
      level: entry.level,
      concentration: entry.concentration,
      duration: entry.duration,
      durationRounds: 0,
      castingTime: entry.castingTime,
      notes: '',
      description: entry.description,
      prepared: false,
      alwaysPrepared: false,
      fromItem: false,
      itemChargesEmpty: false,
      active: false,
      roundsRemaining: 0,
    };
    updateSelected((c) => ({ ...c, spells: [...c.spells, spell] }));
  }

  function togglePrepared(id: string) {
    updateSelected((c) => ({
      ...c,
      spells: c.spells.map((s) =>
        s.id === id ? { ...s, prepared: !s.prepared, active: s.prepared ? false : s.active, roundsRemaining: s.prepared ? 0 : s.roundsRemaining } : s
      ),
    }));
  }

  function removeSpell(id: string) {
    updateSelected((c) => ({ ...c, spells: c.spells.filter((s) => s.id !== id) }));
  }

  return (
    <div className="dm-spellbook">
      <div className="dm-spellbook__header">
        <span className="dm-spellbook__title">Spell Book</span>
        <span className="dm-spellbook__subtitle">{normalizedClass}</span>
      </div>
      <input
        type="text"
        className="dm-spellbook__search"
        placeholder="Search spells\u2026"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="dm-spellbook__legend">
        <span className="dm-spellbook__legend-item"><span className="dm-spellbook__indicator dm-spellbook__indicator--prepared">{'\u25cf'}</span> Prepared</span>
        <span className="dm-spellbook__legend-item"><span className="dm-spellbook__indicator dm-spellbook__indicator--learned">{'\u25d0'}</span> Learned</span>
        <span className="dm-spellbook__legend-item"><span className="dm-spellbook__indicator dm-spellbook__indicator--available">{'\u25cb'}</span> Available</span>
      </div>

      {Array.from(grouped.entries())
        .sort(([a], [b]) => a - b)
        .map(([level, entries]) => {
          const isCollapsed = !isSearching && collapsedLevels.has(level);
          const prepCount = entries.filter(e => e.status === 'prepared').length;
          const learnedCount = entries.filter(e => e.status === 'learned').length;

          return (
            <div key={level} className="dm-spellbook__group">
              <button
                className="dm-spellbook__group-toggle"
                onClick={() => toggleLevel(level)}
              >
                <span className={`dm-spellbook__chevron${isCollapsed ? '' : ' dm-spellbook__chevron--open'}`}>&#9656;</span>
                <span className="dm-spellbook__group-name">{LEVEL_LABELS[level]}</span>
                <span className="dm-spellbook__group-count">{entries.length}</span>
                {prepCount > 0 && <span className="dm-spellbook__group-badge dm-spellbook__group-badge--prep">{prepCount}</span>}
                {learnedCount > 0 && <span className="dm-spellbook__group-badge dm-spellbook__group-badge--learned">{learnedCount}</span>}
              </button>

              {!isCollapsed && entries.map(({ spell, status, charSpellId }) => (
                <div key={spell.slug} className={`dm-spellbook__row dm-spellbook__row--${status}`}>
                  <div className="dm-spellbook__row-main">
                    <button
                      className={`dm-spellbook__status-btn dm-spellbook__status-btn--${status}`}
                      title={
                        status === 'available' ? 'Add to spell list (learned, not prepared)'
                          : status === 'learned' ? 'Prepare this spell'
                          : 'Unprepare this spell'
                      }
                      onClick={() => {
                        if (status === 'available') addSpell(spell);
                        else if (charSpellId) togglePrepared(charSpellId);
                      }}
                    >
                      {statusIcon[status]}
                    </button>
                    <button
                      className="dm-spellbook__name-btn"
                      onClick={() => setExpandedSlug(expandedSlug === spell.slug ? null : spell.slug)}
                    >
                      {spell.name}
                    </button>
                    {spell.concentration && <span className="dm-spellbook__badge">C</span>}
                    {spell.ritual && <span className="dm-spellbook__badge">R</span>}
                    <span className="dm-spellbook__meta">{spell.castingTime}</span>

                    {/* Remove button for learned/prepared spells */}
                    {charSpellId && (
                      <button
                        className="dm-spellbook__remove-btn"
                        title="Remove from spell list"
                        onClick={() => removeSpell(charSpellId)}
                      >&times;</button>
                    )}
                  </div>

                  {expandedSlug === spell.slug && spell.description && (
                    <div
                      className="spell-desc-panel"
                      style={{ marginLeft: 24 }}
                    >
                      <div
                        className="spell-desc-panel__body"
                        dangerouslySetInnerHTML={{ __html: spell.description }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export function SpellsSection({ ch, updateSelected }: Props) {
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<PreparedSpell, 'id'>>(blankSpell());
  const [showCompendium, setShowCompendium] = useState(false);
  const [expandedDescId, setExpandedDescId] = useState<string | null>(null);

  function addFromCompendium(entry: SpellEntry, alwaysPrepared: boolean) {
    const spell: PreparedSpell = {
      id: uuid(),
      name: entry.name,
      level: entry.level,
      concentration: entry.concentration,
      duration: entry.duration,
      durationRounds: 0,
      castingTime: entry.castingTime,
      notes: '',
      description: entry.description,
      prepared: true,
      alwaysPrepared,
      fromItem: false,
      itemChargesEmpty: false,
      active: false,
      roundsRemaining: 0,
    };
    updateSelected((c) => ({ ...c, spells: [...c.spells, spell] }));
  }

  function patch<K extends keyof Omit<PreparedSpell, 'id'>>(
    k: K, v: Omit<PreparedSpell, 'id'>[K]
  ) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function openAdd() { setForm(blankSpell()); setEditId('new'); }
  function openEdit(s: PreparedSpell) { setForm({ ...s }); setEditId(s.id); }
  function cancel() { setEditId(null); }

  function saveNew() {
    if (!form.name.trim()) return;
    updateSelected((c) => ({
      ...c, spells: [...c.spells, { ...form, id: uuid() }],
    }));
    setEditId(null);
  }

  function saveEdit(id: string) {
    if (!form.name.trim()) return;
    updateSelected((c) => ({
      ...c, spells: c.spells.map((s) => s.id === id ? { ...form, id } : s),
    }));
    setEditId(null);
  }

  function remove(id: string) {
    if (editId === id) setEditId(null);
    updateSelected((c) => ({ ...c, spells: c.spells.filter((s) => s.id !== id) }));
  }

  function togglePrepared(id: string) {
    updateSelected((c) => ({
      ...c,
      spells: c.spells.map((s) =>
        s.id === id ? { ...s, prepared: !s.prepared, active: s.prepared ? false : s.active, roundsRemaining: s.prepared ? 0 : s.roundsRemaining } : s
      ),
    }));
  }

  function prepareAll() {
    updateSelected((c) => ({
      ...c, spells: c.spells.map((s) => ({ ...s, prepared: true })),
    }));
  }

  function unprepareAll() {
    updateSelected((c) => ({
      ...c, spells: c.spells.map((s) =>
        s.alwaysPrepared || s.fromItem ? s : { ...s, prepared: false, active: false, roundsRemaining: 0 }
      ),
    }));
  }

  function cast(spell: PreparedSpell) {
    if (spell.itemChargesEmpty) return;
    if (!spell.prepared && !spell.fromItem && spell.level > 0) return;
    updateSelected((c) => {
      // Build fresh slot array
      const slots = Array.from({ length: 9 }, (_, i) =>
        ({ ...(c.spellSlots[i] ?? { max: 0, used: 0 }) })
      );

      // Drop any currently active concentration spell (concentration is exclusive)
      let spells = c.spells.map((s) =>
        s.concentration && s.active && s.id !== spell.id
          ? { ...s, active: false, roundsRemaining: 0 }
          : { ...s }
      );

      // Activate this spell
      spells = spells.map((s) =>
        s.id === spell.id
          ? { ...s, active: true, roundsRemaining: s.durationRounds }
          : s
      );

      // Deduct slot for leveled spells (item spells don't use slots)
      if (spell.level > 0 && !spell.fromItem) {
        const idx = spell.level - 1;
        if (slots[idx].used < slots[idx].max) {
          slots[idx].used += 1;
        }
      }

      return { ...c, spells, spellSlots: slots };
    });
  }

  function endSpell(id: string) {
    updateSelected((c) => ({
      ...c,
      spells: c.spells.map((s) =>
        s.id === id ? { ...s, active: false, roundsRemaining: 0 } : s
      ),
    }));
  }

  function tickRound(id: string) {
    updateSelected((c) => ({
      ...c,
      spells: c.spells.map((s) =>
        s.id === id
          ? { ...s, roundsRemaining: Math.max(0, s.roundsRemaining - 1) }
          : s
      ),
    }));
  }

  // Group ONLY prepared/active spells by level for the main section
  const grouped = new Map<number, PreparedSpell[]>();
  for (const s of ch.spells) {
    const isPrepOrAlways = s.level === 0 || s.alwaysPrepared || s.fromItem || s.prepared;
    if (!isPrepOrAlways) continue;
    if (!grouped.has(s.level)) grouped.set(s.level, []);
    grouped.get(s.level)!.push(s);
  }
  for (const [lvl, arr] of grouped) {
    grouped.set(lvl, [...arr].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.name.localeCompare(b.name);
    }));
  }
  const levels = [...grouped.keys()].sort((a, b) => a - b);

  const spellAbility = ch.spellcastingAbility ?? 'int';
  const spellMod = abilityMod(ch.abilities[spellAbility]);
  const pb = profBonus(ch.level);
  const attackBonus = spellAttackBonus(ch);
  const saveDC = spellSaveDC(ch);

  // Prepared spell limit — only for classes with daily preparation
  const prepInfo = (() => {
    const cls = ch.class.toLowerCase();
    const s = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
    const intMod = abilityMod(ch.abilities.int);
    const wisMod = abilityMod(ch.abilities.wis);
    const chaMod = abilityMod(ch.abilities.cha);
    let max: number, formula: string;
    if (cls.includes('wizard')) {
      max = Math.max(1, intMod + ch.level);
      formula = `INT ${s(intMod)} + Lv ${ch.level}`;
    } else if (cls.includes('cleric')) {
      max = Math.max(1, wisMod + ch.level);
      formula = `WIS ${s(wisMod)} + Lv ${ch.level}`;
    } else if (cls.includes('paladin')) {
      const half = Math.floor(ch.level / 2);
      max = Math.max(1, chaMod + half);
      formula = `CHA ${s(chaMod)} + ½Lv ${half}`;
    } else {
      return null;
    }
    const prepared = ch.spells.filter((sp) => sp.level > 0 && sp.prepared && !sp.alwaysPrepared && !sp.fromItem).length;
    return { prepared, max, formula };
  })();

  const ABILITY_OPTIONS: { key: SpellcastingAbility; label: string }[] = [
    { key: 'int', label: 'INT' },
    { key: 'wis', label: 'WIS' },
    { key: 'cha', label: 'CHA' },
  ];

  return (
    <section className="section">
      <h2 className="section__heading section__heading--flex">
        <span>Spells</span>
        {editId !== 'new' && (
          <div className="spells-header-actions">
            {ch.spells.length > 0 && (
              <>
                <button className="spells-prepare-btn" onClick={unprepareAll} title="Mark all spells as unprepared">Unprepare All</button>
                <button className="spells-prepare-btn spells-prepare-btn--prepare" onClick={prepareAll} title="Mark all spells as prepared">Prepare All</button>
              </>
            )}
            <button className="spells-add-btn" onClick={openAdd}>+ Custom</button>
          </div>
        )}
      </h2>

      {/* ── Spellcasting stats banner ── */}
      <div className="spell-stats">
        <div className="spell-stats__ability-group">
          <span className="spell-stats__group-label">Casting Ability</span>
          <div className="spell-ability-selector">
            {ABILITY_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                className={`spell-ability-btn${spellAbility === key ? ' spell-ability-btn--active' : ''}`}
                onClick={() => updateSelected((c) => ({ ...c, spellcastingAbility: key }))}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="spell-stats__ability-detail">
            {ch.abilities[spellAbility]} ({spellMod >= 0 ? '+' : ''}{spellMod}) · Prof +{pb}
          </span>
        </div>

        <div className="spell-stats__divider" />

        <div className="spell-stat">
          <span className="spell-stat__value">{attackBonus >= 0 ? `+${attackBonus}` : `${attackBonus}`}</span>
          <span className="spell-stat__label">Spell Attack</span>
        </div>

        <div className="spell-stats__divider" />

        <div className="spell-stat">
          <span className="spell-stat__value">{saveDC}</span>
          <span className="spell-stat__label">Save DC</span>
        </div>

        {prepInfo && (
          <>
            <div className="spell-stats__divider" />
            <div className={`spell-stat spell-stat--prep${prepInfo.prepared > prepInfo.max ? ' spell-stat--prep-over' : prepInfo.prepared === prepInfo.max ? ' spell-stat--prep-full' : ''}`}>
              <span className="spell-stat__value spell-prep__fraction">
                <span className="spell-prep__count">{prepInfo.prepared}</span>
                <span className="spell-prep__sep">/</span>
                <span className="spell-prep__max">{prepInfo.max}</span>
              </span>
              <span className="spell-stat__label">Prepared</span>
              <span className="spell-prep__formula">{prepInfo.formula}</span>
            </div>
          </>
        )}
      </div>

      {levels.length === 0 && editId !== 'new' && (
        <div className="spells-empty">
          No spells prepared. Use the Spell Book below to add and prepare spells.
        </div>
      )}

      {editId === 'new' && (
        <div className="spell-form-wrap">
          <SpellForm form={form} patch={patch} onSave={saveNew} onCancel={cancel} />
        </div>
      )}

      {/* ── Prepared / Active Spells ── */}
      <div className="spells-list">
        {levels.map((level) => {
          const spells = grouped.get(level)!;
          const slotData = level > 0
            ? (ch.spellSlots[level - 1] ?? { max: 0, used: 0 })
            : null;
          const slotsLeft = slotData ? slotData.max - slotData.used : null;

          return (
            <div key={level} className="spell-group">
              {/* ── Level divider ── */}
              <div className="spell-group__header">
                <span className="spell-group__rule" />
                <span className="spell-group__label">
                  {level === 0 ? 'Cantrips' : `${ORDINALS[level]} Level`}
                </span>
                {slotData && slotData.max > 0 && (
                  <span className={`spell-group__slots${slotsLeft === 0 ? ' spell-group__slots--empty' : ''}`}>
                    {slotsLeft}/{slotData.max}
                  </span>
                )}
                <span className="spell-group__rule" />
              </div>

              {spells.map((spell) => {
                const isEditing = editId === spell.id;
                const isPrepared = spell.level === 0 || spell.alwaysPrepared || spell.fromItem || spell.prepared;
                const canCast = isPrepared && !spell.itemChargesEmpty && (spell.fromItem || hasSlot(ch, level));
                const expired = spell.active && spell.durationRounds > 0 && spell.roundsRemaining === 0;
                const isConc = spell.active && spell.concentration;

                return (
                  <div
                    key={spell.id}
                    className={[
                      'spell-row',
                      spell.alwaysPrepared ? 'spell-row--always-prepared' : '',
                      spell.fromItem ? 'spell-row--from-item' : '',
                      spell.itemChargesEmpty ? 'spell-row--charges-empty' : '',
                      spell.active && !isConc ? 'spell-row--active' : '',
                      isConc ? 'spell-row--concentrating' : '',
                      expired ? 'spell-row--expired' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {!isEditing ? (
                      <>
                        {/* ── Top line: prepared · cast · name · badges · rounds · actions ── */}
                        <div className="spell-row__top">
                          {spell.level === 0 && <span className="spell-cantrip-dot">◆</span>}
                          {spell.level > 0 && spell.alwaysPrepared && !spell.fromItem && (
                            <span className="spell-always-dot" title="Always prepared — granted by class or subclass">◈</span>
                          )}
                          {spell.fromItem && (
                            <button
                              className={`spell-item-btn${spell.itemChargesEmpty ? ' spell-item-btn--empty' : ''}`}
                              title={spell.itemChargesEmpty ? 'Item out of charges — click to restore' : 'From item — click to mark out of charges'}
                              onClick={() => updateSelected((c) => ({
                                ...c,
                                spells: c.spells.map((s) =>
                                  s.id === spell.id ? { ...s, itemChargesEmpty: !s.itemChargesEmpty, active: !s.itemChargesEmpty ? false : s.active, roundsRemaining: !s.itemChargesEmpty ? 0 : s.roundsRemaining } : s
                                ),
                              }))}
                            >
                              {spell.itemChargesEmpty ? '⊘' : '⊕'}
                            </button>
                          )}
                          {spell.level > 0 && !spell.alwaysPrepared && !spell.fromItem && (
                            <button
                              className={`spell-prepared-btn${isPrepared ? ' spell-prepared-btn--on' : ''}`}
                              title={isPrepared ? 'Prepared — click to unprepare' : 'Unprepared — click to prepare'}
                              onClick={() => togglePrepared(spell.id)}
                            >
                              {isPrepared ? '●' : '○'}
                            </button>
                          )}

                          <button
                            className={`spell-cast-btn${spell.active ? ' spell-cast-btn--active' : ''}${!canCast && !spell.active ? ' spell-cast-btn--locked' : ''}`}
                            title={
                              spell.itemChargesEmpty
                                ? 'Item out of charges'
                                : !isPrepared
                                  ? 'Not prepared'
                                  : spell.active
                                    ? 'Recast (expends another slot)'
                                    : canCast
                                      ? spell.fromItem
                                        ? `Cast from item${level === 0 ? '' : ' (no slot used)'}`
                                        : level === 0 ? 'Cast cantrip' : `Cast — uses 1 ${ORDINALS[level]} slot`
                                      : 'No slots remaining'
                            }
                            disabled={!spell.active && !canCast}
                            onClick={() => cast(spell)}
                          >
                            {spell.active ? '◆' : '▶'}
                          </button>

                          <span className="spell-row__name">{spell.name || 'Unnamed'}</span>
                          {spell.description && (
                            <button
                              className={`spell-desc-btn${expandedDescId === spell.id ? ' spell-desc-btn--open' : ''}`}
                              title={expandedDescId === spell.id ? 'Hide description' : 'Show description'}
                              aria-expanded={expandedDescId === spell.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedDescId(expandedDescId === spell.id ? null : spell.id);
                              }}
                            >ⓘ</button>
                          )}

                          {spell.concentration && (
                            <span className={`spell-conc-badge${spell.active ? ' spell-conc-badge--active' : ''}`}>
                              {spell.active ? '◎ Concentrating' : '◎ Conc'}
                            </span>
                          )}

                          {spell.active && spell.durationRounds > 0 && (
                            <span className={`spell-rounds${expired ? ' spell-rounds--expired' : ''}`}>
                              <span className="spell-rounds__num">{spell.roundsRemaining}</span>
                              <span className="spell-rounds__unit">rnd</span>
                              <button
                                className="spell-rounds__tick"
                                title="Tick down one round"
                                onClick={() => tickRound(spell.id)}
                                disabled={expired}
                              >−</button>
                            </span>
                          )}

                          <div className="spell-row__actions">
                            {spell.active && (
                              <button
                                className="spell-end-btn"
                                onClick={() => endSpell(spell.id)}
                                title="End spell"
                              >
                                End
                              </button>
                            )}
                            <button
                              className="spell-action-btn"
                              title="Edit"
                              onClick={() => openEdit(spell)}
                            >✎</button>
                            <button
                              className="spell-action-btn spell-action-btn--remove"
                              title="Remove"
                              onClick={() => remove(spell.id)}
                            >×</button>
                          </div>
                        </div>

                        {/* ── Bottom line: meta + notes ── */}
                        {(spell.castingTime || spell.duration || spell.notes) && (
                          <div className="spell-row__bottom">
                            {spell.castingTime && (
                              <span className="spell-meta__piece">{spell.castingTime}</span>
                            )}
                            {spell.duration && (
                              <>
                                <span className="spell-meta__dot">·</span>
                                <span className="spell-meta__piece">{spell.duration}</span>
                              </>
                            )}
                            {spell.notes && (
                              <>
                                {(spell.castingTime || spell.duration) && (
                                  <span className="spell-meta__dot">—</span>
                                )}
                                <span className="spell-meta__notes">{spell.notes}</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* ── Inline description panel ── */}
                        {spell.description && expandedDescId === spell.id && (
                          <div className="spell-desc-panel">
                            <div
                              className="spell-desc-panel__body"
                              dangerouslySetInnerHTML={{ __html: spell.description.replace(/<br\s*\/?>/gi, '<br/>') }}
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <SpellForm
                        form={form}
                        patch={patch}
                        onSave={() => saveEdit(spell.id)}
                        onCancel={cancel}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── DM Spell Book ── */}
      <DmSpellBook ch={ch} updateSelected={updateSelected} />

      {showCompendium && (
        <SpellCompendium
          onClose={() => setShowCompendium(false)}
          onAddSpell={addFromCompendium}
          characterName={ch.name || 'spell list'}
          existingSpellNames={new Set(ch.spells.map((s) => s.name))}
          defaultClass={ch.class}
        />
      )}
    </section>
  );
}
