import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { profBonus, abilityMod, calcAC } from '../types/character';
import type { AbilityScores, ArmorType } from '../types/character';
import type { PortraitCrop, SpellSlot, TrackedResource, RechargeOn } from '../types/character';
import { NumericInput } from './NumericInput';
import { PortraitCropModal } from './PortraitCropModal';

export function CharacterSheet() {
  const { selected, updateSelected } = useStore();
  const [customAmount, setCustomAmount] = useState('');
  const [showCropModal, setShowCropModal] = useState(false);
  const cropPortraitSrc = useRef<string>('');
  const currentHpRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!selected) {
    return (
      <main className="main">
        <div className="empty-state">
          <div className="empty-state__icon">📜</div>
          <div className="empty-state__title">No Adventurer Selected</div>
          <div className="empty-state__text">
            Add a new adventurer to the party roster, or select an existing one
            to view their record.
          </div>
        </div>
      </main>
    );
  }

  const ch = selected;
  const pct = ch.hp.max > 0 ? Math.max(0, Math.min(100, (ch.hp.current / ch.hp.max) * 100)) : 0;
  const barColor =
    pct > 60 ? 'var(--hp-healthy)' : pct > 25 ? 'var(--hp-wounded)' : 'var(--hp-critical)';

  function applyHP(amount: number) {
    updateSelected((c) => {
      if (amount < 0) {
        let dmg = Math.abs(amount);
        if (c.hp.temp > 0) {
          const absorbed = Math.min(c.hp.temp, dmg);
          c.hp.temp -= absorbed;
          dmg -= absorbed;
        }
        c.hp.current = Math.max(0, c.hp.current - dmg);
      } else {
        c.hp.current = Math.min(c.hp.current + amount, c.hp.max);
      }
      return c;
    });

    // Flash
    const el = currentHpRef.current;
    if (el) {
      const cls = amount < 0 ? 'hp-flash-dmg' : 'hp-flash-heal';
      el.classList.remove('hp-flash-dmg', 'hp-flash-heal');
      void el.offsetWidth;
      el.classList.add(cls);
      setTimeout(() => el.classList.remove(cls), 350);
    }
  }

  function handleCustomHP(sign: 1 | -1) {
    const val = parseInt(customAmount, 10);
    if (!val || val <= 0) return;
    applyHP(val * sign);
    setCustomAmount('');
  }

  function setField(field: string, value: unknown) {
    updateSelected((c) => {
      const parts = field.split('.');
      if (parts.length === 1) {
        (c as unknown as Record<string, unknown>)[parts[0]] = value;
      } else if (parts.length === 2) {
        const obj = c[parts[0] as keyof typeof c];
        if (obj && typeof obj === 'object') {
          (obj as unknown as Record<string, unknown>)[parts[1]] = value;
        }
      }
      c.hp.current = Math.max(0, c.hp.current);
      c.hp.temp = Math.max(0, c.hp.temp);
      return c;
    });
  }

  function handlePortraitUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Resize to keep localStorage reasonable
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 256;
        let w = img.width;
        let h = img.height;
        if (w > h) { h = (h / w) * maxSize; w = maxSize; }
        else       { w = (w / h) * maxSize; h = maxSize; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setField('portrait', dataUrl);
        setField('portraitCrop', { scale: 1, offsetX: 0, offsetY: 0 });
        cropPortraitSrc.current = dataUrl;
        setShowCropModal(true);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);

    // Reset so the same file can be re-selected
    e.target.value = '';
  }

  function removePortrait() {
    setField('portrait', '');
    setField('portraitCrop', { scale: 1, offsetX: 0, offsetY: 0 });
  }

  function openCropModal() {
    cropPortraitSrc.current = ch.portrait;
    setShowCropModal(true);
  }

  const ORDINALS = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th'];
  const spellSlots: SpellSlot[] = Array.from({ length: 9 }, (_, i) =>
    ch.spellSlots[i] ?? { max: 0, used: 0 }
  );

  function updateSpellSlot(level: number, updater: (s: SpellSlot) => SpellSlot) {
    updateSelected((c) => {
      const slots: SpellSlot[] = Array.from({ length: 9 }, (_, i) =>
        c.spellSlots[i] ?? { max: 0, used: 0 }
      );
      slots[level] = updater({ ...slots[level] });
      c.spellSlots = slots;
      return c;
    });
  }

  function addResource() {
    updateSelected((c) => {
      c.resources = [
        ...c.resources,
        { id: crypto.randomUUID(), name: '', max: 1, used: 0, recharge: 'long' as RechargeOn },
      ];
      return c;
    });
  }

  function updateResource(id: string, updater: (r: TrackedResource) => TrackedResource) {
    updateSelected((c) => {
      c.resources = c.resources.map((r) => (r.id === id ? updater({ ...r }) : r));
      return c;
    });
  }

  function removeResource(id: string) {
    updateSelected((c) => {
      c.resources = c.resources.filter((r) => r.id !== id);
      return c;
    });
  }

  const RECHARGE_CYCLE: RechargeOn[] = ['long', 'short', 'manual'];
  const RECHARGE_LABELS: Record<RechargeOn, string> = { short: 'SR', long: 'LR', manual: '—' };
  const RECHARGE_TITLES: Record<RechargeOn, string> = {
    short: 'Short rest',
    long: 'Long rest',
    manual: 'Manual',
  };

  function saveCrop(crop: PortraitCrop) {
    setField('portraitCrop', crop);
    setShowCropModal(false);
  }

  return (
    <main className="main">
      {showCropModal && cropPortraitSrc.current && (
        <PortraitCropModal
          src={cropPortraitSrc.current}
          initialCrop={ch.portraitCrop}
          onSave={saveCrop}
          onCancel={() => setShowCropModal(false)}
        />
      )}
      <div className="main-inner" key={ch.id}>

        {/* ── Name + Portrait ── */}
        <div className="char-header">
          <div className="char-portrait-area" onClick={() => fileInputRef.current?.click()}>
            {ch.portrait ? (
              <img
                src={ch.portrait}
                alt={ch.name}
                className="char-portrait__img"
                style={{
                  transform: `translate(${ch.portraitCrop.offsetX * 100}%, ${ch.portraitCrop.offsetY * 100}%) scale(${ch.portraitCrop.scale})`,
                  transformOrigin: 'center center',
                }}
              />
            ) : (
              <div className="char-portrait__empty">
                <span className="char-portrait__icon">+</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="char-portrait__file-input"
              onChange={handlePortraitUpload}
            />
            {ch.portrait && (
              <>
                <button
                  className="char-portrait__remove"
                  title="Remove portrait"
                  onClick={(e) => { e.stopPropagation(); removePortrait(); }}
                >
                  &times;
                </button>
                <button
                  className="char-portrait__crop-btn"
                  title="Adjust crop & zoom"
                  onClick={(e) => { e.stopPropagation(); openCropModal(); }}
                >
                  ⊹
                </button>
              </>
            )}
          </div>
          <input
            type="text"
            className="char-name-input"
            value={ch.name}
            placeholder="Enter adventurer name…"
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setField('name', e.target.value)}
          />
          <div className="ac-shield-badge" title={`AC ${calcAC(ch)} · ${ch.armorType} armor${ch.shield ? ` + shield` : ''}`}>
            <svg className="ac-shield-svg" viewBox="0 0 48 58" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M 1,1 L 47,1 L 47,33 C 47,50 24,57 24,57 C 24,57 1,50 1,33 Z"
                fill="var(--bg-deep)"
                stroke="var(--border-gold-dim)"
                strokeWidth="1.5"
              />
              {/* Inner bevel */}
              <path
                d="M 5,5 L 43,5 L 43,32 C 43,46 24,52 24,52 C 24,52 5,46 5,32 Z"
                fill="none"
                stroke="var(--border-inner)"
                strokeWidth="0.75"
                opacity="0.6"
              />
              <text x="24" y="17" textAnchor="middle" dominantBaseline="middle" className="ac-shield__label">AC</text>
              <text x="24" y="35" textAnchor="middle" dominantBaseline="middle" className="ac-shield__number">{calcAC(ch)}</text>
            </svg>
          </div>
        </div>

        {/* ── Identity ── */}
        <section className="section">
          <h2 className="section__heading">Identity</h2>
          <div className="identity-row">
            <div className="field field--grow">
              <label className="field__label">Class</label>
              <input className="field__input" value={ch.class} placeholder="Fighter" spellCheck={false}
                onChange={(e) => setField('class', e.target.value)} />
            </div>
            <div className="field field--grow">
              <label className="field__label">Subclass</label>
              <input className="field__input" value={ch.subclass} placeholder="Champion" spellCheck={false}
                onChange={(e) => setField('subclass', e.target.value)} />
            </div>
            <div className="field field--grow">
              <label className="field__label">Race</label>
              <input className="field__input" value={ch.race} placeholder="Human" spellCheck={false}
                onChange={(e) => setField('race', e.target.value)} />
            </div>
            <div className="field field--sm">
              <label className="field__label">Level</label>
              <NumericInput
                className="field__input field__input--number"
                value={ch.level}
                fallback={1}
                min={1}
                max={20}
                onCommit={(v) => setField('level', Math.max(1, Math.min(20, v)))}
              />
            </div>
            <div className="field field--sm">
              <label className="field__label">Prof.</label>
              <div className="field__computed">+{profBonus(ch.level)}</div>
            </div>
            <div className="field field--grow">
              <label className="field__label">Background</label>
              <input className="field__input" value={ch.background} placeholder="Sage" spellCheck={false}
                onChange={(e) => setField('background', e.target.value)} />
            </div>
          </div>
        </section>

        {/* ── Ability Scores + Saving Throws ── */}
        {(() => {
          const ABILITIES: [keyof AbilityScores, string][] = [
            ['str', 'Strength'], ['dex', 'Dexterity'], ['con', 'Constitution'],
            ['int', 'Intelligence'], ['wis', 'Wisdom'], ['cha', 'Charisma'],
          ];
          const pb = profBonus(ch.level);
          return (
            <section className="section">
              <h2 className="section__heading">Ability Scores</h2>
              <div className="ability-saves-layout">
                <div className="ability-scores">
                  {ABILITIES.map(([key, label]) => {
                    const score = ch.abilities[key];
                    const mod = abilityMod(score);
                    return (
                      <div key={key} className="ability-card">
                        <span className="ability-card__label">{label.slice(0, 3).toUpperCase()}</span>
                        <NumericInput
                          className="ability-card__score"
                          value={score}
                          fallback={10}
                          min={1}
                          max={30}
                          onCommit={(v) => setField(`abilities.${key}`, Math.max(1, Math.min(30, v)))}
                        />
                        <span className="ability-card__mod">{mod >= 0 ? `+${mod}` : `${mod}`}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="saves-list-col">
                  <div className="saves-col-label">Saving Throws</div>
                  <div className="saves-list">
                    {ABILITIES.map(([key, label]) => {
                      const isProficient = ch.saveProficiencies.includes(key);
                      const bonus = abilityMod(ch.abilities[key]) + (isProficient ? pb : 0);
                      const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;
                      return (
                        <button
                          key={key}
                          className={`save-row${isProficient ? ' save-row--proficient' : ''}`}
                          onClick={() => updateSelected((c) => {
                            c.saveProficiencies = isProficient
                              ? c.saveProficiencies.filter((p) => p !== key)
                              : [...c.saveProficiencies, key];
                            return c;
                          })}
                          title={`${label} save${isProficient ? ` (proficient, +${pb} prof bonus)` : ' — click to add proficiency'}`}
                        >
                          <span className="save-row__indicator" />
                          <span className="save-row__name">{label.slice(0, 3)}</span>
                          <span className="save-row__bonus">{bonusStr}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* ── Defense ── */}
        <section className="section">
          <h2 className="section__heading">Defense</h2>
          <div className="defense-row">
            <div className="armor-type-btns">
              {(['none', 'light', 'medium', 'heavy'] as ArmorType[]).map((type) => (
                <button
                  key={type}
                  className={`armor-type-btn${ch.armorType === type ? ' armor-type-btn--active' : ''}`}
                  onClick={() => setField('armorType', type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            {ch.armorType !== 'none' && (
              <div className="defense-base-ac">
                <label className="field__label">Base AC</label>
                <NumericInput
                  className="field__input field__input--number defense-base-ac__input"
                  value={ch.armorBaseAC}
                  fallback={10}
                  min={1}
                  max={30}
                  onCommit={(v) => setField('armorBaseAC', Math.max(1, Math.min(30, v)))}
                />
              </div>
            )}
            <div className="shield-toggle">
              <button
                className={`shield-btn${ch.shield ? ' shield-btn--active' : ''}`}
                onClick={() => setField('shield', !ch.shield)}
                title="Toggle shield"
              >
                Shield
              </button>
              {ch.shield && (
                <NumericInput
                  className="field__input field__input--number shield-bonus-input"
                  value={ch.shieldBonus}
                  fallback={2}
                  min={1}
                  max={10}
                  onCommit={(v) => setField('shieldBonus', Math.max(1, Math.min(10, v)))}
                />
              )}
            </div>
            <div className="defense-formula">
              {ch.armorType === 'none' && (
                <span className="defense-formula__text">10 + {abilityMod(ch.abilities.dex)} dex</span>
              )}
              {ch.armorType === 'medium' && (
                <span className="defense-formula__text">{ch.armorBaseAC} + {Math.min(abilityMod(ch.abilities.dex), 2)} dex</span>
              )}
              {ch.armorType === 'light' && (
                <span className="defense-formula__text">{ch.armorBaseAC} + {abilityMod(ch.abilities.dex)} dex</span>
              )}
              {ch.shield && (
                <span className="defense-formula__text">+ {ch.shieldBonus} shield</span>
              )}
              <span className="defense-formula__total">= {calcAC(ch)} AC</span>
            </div>
          </div>
        </section>

        {/* ── Hit Points ── */}
        <section className="section">
          <h2 className="section__heading">Hit Points</h2>
          <div className="hp-block">
            <div className="hp-display">
              <span className="hp-display__label">Current</span>
              <NumericInput
                ref={currentHpRef}
                className="hp-display__value hp-display__value--current"
                value={ch.hp.current}
                fallback={0}
                style={{ color: barColor, borderColor: barColor + '40' }}
                onCommit={(v) => setField('hp.current', Math.max(0, v))}
              />
            </div>
            <div className="hp-separator">/</div>
            <div className="hp-display">
              <span className="hp-display__label">Maximum</span>
              <NumericInput
                className="hp-display__value"
                value={ch.hp.max}
                fallback={1}
                min={1}
                onCommit={(v) => setField('hp.max', Math.max(1, v))}
              />
            </div>
            <div className="hp-display">
              <span className="hp-display__label">Temp HP</span>
              <NumericInput
                className="hp-display__value hp-display__value--temp"
                value={ch.hp.temp}
                fallback={0}
                min={0}
                onCommit={(v) => setField('hp.temp', Math.max(0, v))}
              />
            </div>
            <div className="hp-bar-container">
              <div className="hp-bar">
                <div
                  className="hp-bar__fill"
                  style={{ width: `${pct}%`, background: barColor }}
                />
              </div>
              <div className="hp-bar__text">
                {ch.hp.current} / {ch.hp.max} HP
                {ch.hp.temp > 0 && ` (+${ch.hp.temp} temp)`}
              </div>
            </div>
          </div>

          {/* Quick buttons */}
          <div className="hp-quick-btns">
            <span className="hp-quick-btns__label">Quick</span>
            {[-1, -5, -10].map((n) => (
              <button key={n} className="hp-quick-btn hp-quick-btn--dmg" onClick={() => applyHP(n)}>
                {n}
              </button>
            ))}
            {[1, 5, 10].map((n) => (
              <button key={n} className="hp-quick-btn hp-quick-btn--heal" onClick={() => applyHP(n)}>
                +{n}
              </button>
            ))}

            <div className="hp-custom">
              <input
                type="number"
                className="hp-custom__input"
                placeholder="N"
                min={0}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCustomHP(-1);
                }}
              />
              <button className="hp-custom__btn hp-custom__btn--heal" onClick={() => handleCustomHP(1)}>
                Heal
              </button>
              <button className="hp-custom__btn hp-custom__btn--dmg" onClick={() => handleCustomHP(-1)}>
                Dmg
              </button>
            </div>
          </div>
        </section>

        {/* ── Spell Slots + Resources (side by side) ── */}
        <div className="slots-resources-row">

        <section className="section">
          <h2 className="section__heading">Spell Slots</h2>
          <div className="spell-slots">
            {spellSlots.map((slot, i) => {
              const available = slot.max - slot.used;
              return (
                <div key={i} className={`spell-level-row${slot.max === 0 ? ' spell-level-row--inactive' : ''}`}>
                  <span className="spell-level-label">{ORDINALS[i]}</span>
                  <div className="spell-pips">
                    {Array.from({ length: slot.max }, (_, pipIdx) => {
                      const isFilled = pipIdx < available;
                      return (
                        <button
                          key={pipIdx}
                          className={`spell-pip${isFilled ? ' spell-pip--available' : ' spell-pip--used'}`}
                          title={isFilled ? 'Expend slot' : 'Restore slot'}
                          onClick={() =>
                            updateSpellSlot(i, (s) =>
                              isFilled
                                ? { ...s, used: Math.min(s.used + 1, s.max) }
                                : { ...s, used: Math.max(s.used - 1, 0) }
                            )
                          }
                        />
                      );
                    })}
                    {slot.max === 0 && <span className="spell-pips__none">—</span>}
                  </div>
                  <div className="spell-slot-adj-row">
                    <button
                      className="spell-slot-adj"
                      onClick={() =>
                        updateSpellSlot(i, (s) => ({
                          ...s,
                          max: Math.max(0, s.max - 1),
                          used: Math.min(s.used, Math.max(0, s.max - 1)),
                        }))
                      }
                      disabled={slot.max === 0}
                    >−</button>
                    <span className="spell-slot-count">{slot.max}</span>
                    <button
                      className="spell-slot-adj"
                      onClick={() => updateSpellSlot(i, (s) => ({ ...s, max: Math.min(9, s.max + 1) }))}
                      disabled={slot.max >= 9}
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="section">
          <h2 className="section__heading">Resources</h2>

          {ch.resources.length === 0 && (
            <div className="res-empty">
              Track abilities like Channel Divinity, Action Surge, Bardic Inspiration, etc.
            </div>
          )}

          <div className="res-list">
            {ch.resources.map((res) => {
              const available = res.max - res.used;
              return (
                <div key={res.id} className="res-row">
                  <input
                    className="res-row__name"
                    value={res.name}
                    placeholder="Ability name…"
                    spellCheck={false}
                    onChange={(e) => updateResource(res.id, (r) => ({ ...r, name: e.target.value }))}
                  />
                  <div className="res-row__pips">
                    {Array.from({ length: res.max }, (_, pipIdx) => {
                      const isFilled = pipIdx < available;
                      return (
                        <button
                          key={pipIdx}
                          className={`res-pip${isFilled ? ' res-pip--available' : ' res-pip--used'}`}
                          title={isFilled ? 'Expend' : 'Restore'}
                          onClick={() =>
                            updateResource(res.id, (r) =>
                              isFilled
                                ? { ...r, used: Math.min(r.used + 1, r.max) }
                                : { ...r, used: Math.max(r.used - 1, 0) }
                            )
                          }
                        />
                      );
                    })}
                  </div>
                  <div className="res-row__controls">
                    <div className="spell-slot-adj-row">
                      <button
                        className="spell-slot-adj"
                        onClick={() =>
                          updateResource(res.id, (r) => ({
                            ...r,
                            max: Math.max(1, r.max - 1),
                            used: Math.min(r.used, Math.max(1, r.max - 1)),
                          }))
                        }
                        disabled={res.max <= 1}
                      >−</button>
                      <span className="spell-slot-count">{res.max}</span>
                      <button
                        className="spell-slot-adj"
                        onClick={() => updateResource(res.id, (r) => ({ ...r, max: r.max + 1 }))}
                        disabled={res.max >= 20}
                      >+</button>
                    </div>
                    <button
                      className="res-recharge-tag"
                      title={`Recharges on: ${RECHARGE_TITLES[res.recharge]}. Click to change.`}
                      onClick={() =>
                        updateResource(res.id, (r) => ({
                          ...r,
                          recharge: RECHARGE_CYCLE[(RECHARGE_CYCLE.indexOf(r.recharge) + 1) % RECHARGE_CYCLE.length],
                        }))
                      }
                      data-recharge={res.recharge}
                    >
                      {RECHARGE_LABELS[res.recharge]}
                    </button>
                    <button
                      className="res-remove-btn"
                      title="Remove"
                      onClick={() => removeResource(res.id)}
                    >&times;</button>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="res-add-btn" onClick={addResource}>
            + Add Resource
          </button>
        </section>

        </div>{/* end slots-resources-row */}

      </div>
    </main>
  );
}
