import { useState } from 'react';
import type { Character, FightingStyle, Weapon } from '../../types/character';
import { abilityMod, profBonus } from '../../types/character';
import { uuid } from '../../utils/uuid';

interface Props {
  ch: Character;
  updateSelected: (updater: (ch: Character) => Character) => void;
}

const STAT_OPTIONS: { key: keyof Character['abilities']; label: string }[] = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'int', label: 'INT' },
  { key: 'wis', label: 'WIS' },
  { key: 'cha', label: 'CHA' },
];

const DAMAGE_TYPES = [
  'Slashing', 'Piercing', 'Bludgeoning',
  'Fire', 'Cold', 'Lightning', 'Thunder',
  'Acid', 'Poison', 'Necrotic', 'Radiant', 'Force', 'Psychic',
];


function blankWeapon(): Omit<Weapon, 'id'> {
  return {
    name: '',
    attackBonus: 0,
    damageDice: '1d6',
    versatile: false,
    versatileDice: '',
    twoHanded: false,
    damageType: 'Slashing',
    stat: 'str',
    finesse: false,
    ranged: false,
    proficient: true,
  };
}

function sneakDice(level: number): string {
  return `${Math.ceil(level / 2)}d6`;
}

function calcAttack(ch: Character, w: Weapon, styles: FightingStyle[]) {
  const strMod = abilityMod(ch.abilities.str);
  const dexMod = abilityMod(ch.abilities.dex);
  const effectiveStatKey: keyof Character['abilities'] =
    w.finesse ? (strMod >= dexMod ? 'str' : 'dex') : w.stat;
  const statMod = abilityMod(ch.abilities[effectiveStatKey]);
  const prof = w.proficient ? profBonus(ch.level) : 0;
  const archeryBonus = styles.includes('archery') && w.ranged ? 2 : 0;
  return {
    statLabel: effectiveStatKey.toUpperCase(),
    statMod,
    prof,
    archeryBonus,
    total: statMod + prof + w.attackBonus + archeryBonus,
  };
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

// ── Weapon form ──────────────────────────────────────────────────────────────

interface FormProps {
  form: Omit<Weapon, 'id'>;
  patch: <K extends keyof Omit<Weapon, 'id'>>(key: K, value: Omit<Weapon, 'id'>[K]) => void;
  onSave: () => void;
  onCancel: () => void;
}

function WeaponForm({ form, patch, onSave, onCancel }: FormProps) {
  return (
    <div className="weapon-form">
      <div className="weapon-form__row">
        <label className="weapon-form__field weapon-form__field--wide">
          <span className="weapon-form__label">Name</span>
          <input
            className="weapon-form__input"
            value={form.name}
            placeholder="Longsword…"
            autoFocus
            onChange={(e) => patch('name', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSave()}
          />
        </label>

        <label className="weapon-form__field">
          <span className="weapon-form__label">Dice</span>
          <input
            className="weapon-form__input weapon-form__input--sm"
            value={form.damageDice}
            placeholder="1d8"
            onChange={(e) => patch('damageDice', e.target.value)}
          />
        </label>

        {form.versatile && (
          <label className="weapon-form__field">
            <span className="weapon-form__label">2H Dice</span>
            <input
              className="weapon-form__input weapon-form__input--sm"
              value={form.versatileDice}
              placeholder="1d10"
              onChange={(e) => patch('versatileDice', e.target.value)}
            />
          </label>
        )}

        <label className="weapon-form__field">
          <span className="weapon-form__label">Type</span>
          <input
            className="weapon-form__input weapon-form__input--type"
            list="wep-damage-types"
            value={form.damageType}
            placeholder="Slashing"
            onChange={(e) => patch('damageType', e.target.value)}
          />
          <datalist id="wep-damage-types">
            {DAMAGE_TYPES.map((t) => <option key={t} value={t} />)}
          </datalist>
        </label>

        <label className="weapon-form__field">
          <span className="weapon-form__label">Ability</span>
          <select
            className="weapon-form__select"
            value={form.stat}
            onChange={(e) => patch('stat', e.target.value as keyof Character['abilities'])}
          >
            {STAT_OPTIONS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </label>

        <label className="weapon-form__field">
          <span className="weapon-form__label">Magic Bonus</span>
          <input
            type="number"
            className="weapon-form__input weapon-form__input--sm"
            value={form.attackBonus}
            onChange={(e) => patch('attackBonus', parseInt(e.target.value, 10) || 0)}
          />
        </label>
      </div>

      <div className="weapon-form__row weapon-form__row--toggles">
        <label className="weapon-form__toggle">
          <input
            type="checkbox"
            checked={form.proficient}
            onChange={(e) => patch('proficient', e.target.checked)}
          />
          Proficient
        </label>
        <label className="weapon-form__toggle">
          <input
            type="checkbox"
            checked={form.finesse}
            onChange={(e) => patch('finesse', e.target.checked)}
          />
          Finesse
        </label>
        <label className="weapon-form__toggle">
          <input
            type="checkbox"
            checked={form.versatile}
            onChange={(e) => patch('versatile', e.target.checked)}
          />
          Versatile
        </label>
        {!form.versatile && (
          <label className="weapon-form__toggle">
            <input
              type="checkbox"
              checked={form.twoHanded}
              onChange={(e) => patch('twoHanded', e.target.checked)}
            />
            Two-Handed
          </label>
        )}
        <label className="weapon-form__toggle">
          <input
            type="checkbox"
            checked={form.ranged}
            onChange={(e) => patch('ranged', e.target.checked)}
          />
          Ranged
        </label>
      </div>

      <div className="weapon-form__row weapon-form__row--actions">
        <button
          className="weapon-form__save"
          onClick={onSave}
          disabled={!form.name.trim()}
        >
          Save
        </button>
        <button className="weapon-form__cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main section ─────────────────────────────────────────────────────────────

export function WeaponsSection({ ch, updateSelected }: Props) {
  const [grips, setGrips] = useState<Record<string, 'one' | 'two'>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Weapon, 'id'>>(blankWeapon());

  const isFighter = ch.class.toLowerCase().includes('fighter');
  const styles: FightingStyle[] = isFighter ? (ch.fightingStyles ?? []) : [];

  function getGrip(w: Weapon): 'one' | 'two' {
    return grips[w.id] ?? 'one';
  }

  function setGrip(wId: string, g: 'one' | 'two') {
    setGrips((prev) => ({ ...prev, [wId]: g }));
  }

  function patch<K extends keyof Omit<Weapon, 'id'>>(key: K, value: Omit<Weapon, 'id'>[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openAdd() {
    setForm(blankWeapon());
    setEditId('new');
  }

  function openEdit(w: Weapon) {
    setForm({ ...w });
    setEditId(w.id);
  }

  function cancel() {
    setEditId(null);
  }

  function saveNew() {
    if (!form.name.trim()) return;
    updateSelected((c) => ({
      ...c,
      weapons: [...c.weapons, { ...form, id: uuid() }],
    }));
    setEditId(null);
  }

  function saveEdit(id: string) {
    if (!form.name.trim()) return;
    updateSelected((c) => ({
      ...c,
      weapons: c.weapons.map((w) => w.id === id ? { ...form, id } : w),
    }));
    setEditId(null);
  }

  function remove(id: string) {
    if (editId === id) setEditId(null);
    updateSelected((c) => ({ ...c, weapons: c.weapons.filter((w) => w.id !== id) }));
  }

  return (
    <section className="section">
      <h2 className="section__heading section__heading--flex">
        <span>Attacks &amp; Weapons</span>
        <button
          className={`sneak-toggle${ch.sneakAttack ? ' sneak-toggle--active' : ''}`}
          onClick={() => updateSelected((c) => ({ ...c, sneakAttack: !c.sneakAttack }))}
          title="Toggle Sneak Attack — applies to finesse and ranged weapons"
        >
          Sneak Attack
        </button>
      </h2>

      <div className="weapons-list">
        {ch.weapons.length === 0 && editId !== 'new' && (
          <div className="weapons-empty">No weapons added yet.</div>
        )}

        {ch.weapons.map((w) => {
          const { statLabel, statMod, prof, archeryBonus, total } = calcAttack(ch, w, styles);
          const grip = getGrip(w);
          const dice = grip === 'two' && w.versatile && w.versatileDice
            ? w.versatileDice
            : w.damageDice;

          // Dueling: +2 damage, one melee weapon in the list
          const meleeCount = ch.weapons.filter((wp) => !wp.ranged).length;
          const duelingBonus = styles.includes('dueling') && !w.ranged && meleeCount === 1 ? 2 : 0;

          // GWF: applies to inherently two-handed weapons, or versatile in two-hand grip
          const gwfApplies = styles.includes('great-weapon') && !w.ranged
            && (w.twoHanded || (w.versatile && grip === 'two'));

          // TWF: show offhand damage bonus for melee weapons
          const twfOffhandMod = styles.includes('two-weapon') && !w.ranged ? statMod : null;

          const dmgBonus = statMod + w.attackBonus + duelingBonus;
          const dmgStr = `${dice}${signed(dmgBonus)}`;
          const isEditing = editId === w.id;

          // Build attack formula string
          const atkFormula = [
            'd20',
            `${statLabel} ${signed(statMod)}`,
            prof > 0 ? `PROF ${signed(prof)}` : null,
            w.attackBonus !== 0 ? signed(w.attackBonus) : null,
            archeryBonus > 0 ? 'ARCHERY +2' : null,
          ].filter(Boolean).join(' · ');

          const dmgFormula = [
            dice,
            `${statLabel} ${signed(statMod)}`,
            w.attackBonus !== 0 ? signed(w.attackBonus) : null,
            duelingBonus > 0 ? 'DUELING +2' : null,
          ].filter(Boolean).join(' · ');

          return (
            <div
              key={w.id}
              className={`weapon-card${isEditing ? ' weapon-card--editing' : ''}`}
            >
              {/* ── Name row ── */}
              <div className="weapon-card__name-row">
                <span className="weapon-card__name">{w.name || 'Unnamed'}</span>
                <div className="weapon-card__tags">
                  {w.finesse && <span className="weapon-tag">finesse</span>}
                  {w.twoHanded && <span className="weapon-tag">2h</span>}
                  {gwfApplies && <span className="weapon-tag weapon-tag--gwf" title="Great Weapon Fighting: reroll 1s and 2s on damage">GWF</span>}
                  {!w.proficient && <span className="weapon-tag weapon-tag--warn">no prof</span>}
                </div>
                <div className="weapon-card__actions">
                  <button
                    className="weapon-action-btn"
                    title={isEditing ? 'Cancel' : 'Edit'}
                    onClick={() => isEditing ? cancel() : openEdit(w)}
                  >
                    {isEditing ? '✕' : '✎'}
                  </button>
                  <button
                    className="weapon-action-btn weapon-action-btn--remove"
                    title="Remove"
                    onClick={() => remove(w.id)}
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* ── Stats block ── */}
              {!isEditing && (
                <div className="weapon-card__stats">
                  <div className="weapon-stat weapon-stat--atk">
                    <span className="weapon-stat__number">{signed(total)}</span>
                    <span className="weapon-stat__label">To Hit</span>
                  </div>

                  <div className="weapon-stat__divider" />

                  <div className="weapon-stat weapon-stat--dmg">
                    <span className="weapon-stat__number">{dmgStr}</span>
                    <span className="weapon-stat__label">{w.damageType}</span>
                  </div>

                  {twfOffhandMod !== null && (
                    <>
                      <div className="weapon-stat__divider weapon-stat__divider--twf" />
                      <div className="weapon-stat weapon-stat--twf" title="Two-Weapon Fighting: add this to your offhand attack's damage">
                        <span className="weapon-stat__number">{signed(twfOffhandMod)}</span>
                        <span className="weapon-stat__label">Offhand</span>
                      </div>
                    </>
                  )}

                  {ch.sneakAttack && (w.finesse || w.ranged) && (
                    <>
                      <div className="weapon-stat__divider weapon-stat__divider--sneak" />
                      <div className="weapon-stat weapon-stat--sneak">
                        <span className="weapon-stat__number">{sneakDice(ch.level)}</span>
                        <span className="weapon-stat__label">Sneak</span>
                      </div>
                    </>
                  )}

                  {w.versatile && (
                    <div className="weapon-card__grip">
                      <button
                        className={`grip-btn${grip === 'one' ? ' grip-btn--active' : ''}`}
                        onClick={() => setGrip(w.id, 'one')}
                      >
                        1H
                      </button>
                      <button
                        className={`grip-btn${grip === 'two' ? ' grip-btn--active' : ''}`}
                        onClick={() => setGrip(w.id, 'two')}
                      >
                        2H
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Formula ── */}
              {!isEditing && (
                <div className="weapon-card__formula">
                  <span className="weapon-formula__piece">{atkFormula}</span>
                  <span className="weapon-formula__sep">/</span>
                  <span className="weapon-formula__piece">
                    {dmgFormula}
                    {grip === 'two' && w.versatile && (
                      <em className="weapon-formula__tag"> two-handed</em>
                    )}
                  </span>
                  {ch.sneakAttack && (w.finesse || w.ranged) && (
                    <>
                      <span className="weapon-formula__sep">+</span>
                      <span className="weapon-formula__piece weapon-formula__piece--sneak">
                        {sneakDice(ch.level)} sneak
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* ── Edit form ── */}
              {isEditing && (
                <WeaponForm
                  form={form}
                  patch={patch}
                  onSave={() => saveEdit(w.id)}
                  onCancel={cancel}
                />
              )}
            </div>
          );
        })}

        {editId === 'new' && (
          <div className="weapon-card weapon-card--editing weapon-card--new">
            <div className="weapon-card__name-row">
              <span className="weapon-card__name weapon-card__name--placeholder">New Weapon</span>
            </div>
            <WeaponForm form={form} patch={patch} onSave={saveNew} onCancel={cancel} />
          </div>
        )}
      </div>

      {editId !== 'new' && (
        <button className="weapons-add-btn" onClick={openAdd}>
          + Add Weapon
        </button>
      )}
    </section>
  );
}
