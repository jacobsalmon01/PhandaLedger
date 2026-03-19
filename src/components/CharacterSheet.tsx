import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { profBonus } from '../types/character';
import { NumericInput } from './NumericInput';

export function CharacterSheet() {
  const { selected, updateSelected } = useStore();
  const [customAmount, setCustomAmount] = useState('');
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

  function setField(field: string, value: string | number) {
    updateSelected((c) => {
      const parts = field.split('.');
      if (parts.length === 1) {
        (c as Record<string, unknown>)[parts[0]] = value;
      } else if (parts.length === 2) {
        const obj = c[parts[0] as keyof typeof c];
        if (obj && typeof obj === 'object') {
          (obj as Record<string, unknown>)[parts[1]] = value;
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
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);

    // Reset so the same file can be re-selected
    e.target.value = '';
  }

  function removePortrait() {
    setField('portrait', '');
  }

  return (
    <main className="main">
      <div className="main-inner" key={ch.id}>

        {/* ── Name + Portrait ── */}
        <div className="char-header">
          <div className="char-portrait-area" onClick={() => fileInputRef.current?.click()}>
            {ch.portrait ? (
              <img src={ch.portrait} alt={ch.name} className="char-portrait__img" />
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
              <button
                className="char-portrait__remove"
                title="Remove portrait"
                onClick={(e) => { e.stopPropagation(); removePortrait(); }}
              >
                &times;
              </button>
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

      </div>
    </main>
  );
}
