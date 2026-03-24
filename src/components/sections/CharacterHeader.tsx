import { useRef, useState } from 'react';
import type { Character, PortraitCrop } from '../../types/character';
import { abilityMod, profBonus, calcEffectiveAC } from '../../types/character';
import { PortraitCropModal } from '../PortraitCropModal';
import { NumericInput } from '../NumericInput';
import { ConditionPicker } from '../ConditionPicker';
import { getConditionDef, getExhaustionLevel, type ConditionEntry } from '../../types/conditions';

interface Props {
  ch: Character;
  updateSelected: (updater: (ch: Character) => Character) => void;
}

export function CharacterHeader({ ch, updateSelected }: Props) {
  const [showCropModal, setShowCropModal] = useState(false);
  const [showCondPicker, setShowCondPicker] = useState(false);
  const cropPortraitSrc = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleConditionsChange(next: ConditionEntry[]) {
    updateSelected((c) => ({ ...c, conditions: next }));
  }

  function removeCondition(name: string) {
    updateSelected((c) => ({ ...c, conditions: c.conditions.filter((x) => x.name !== name) }));
  }

  function tickCondition(name: string) {
    updateSelected((c) => ({
      ...c,
      conditions: c.conditions
        .map((e) => e.name === name ? { ...e, rounds: Math.max(0, (e.rounds ?? 1) - 1) } : e)
        .filter((e) => e.name !== name || (e.rounds ?? 1) > 0),
    }));
  }

  function handlePortraitUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

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
        updateSelected((c) => ({ ...c, portrait: dataUrl, portraitCrop: { scale: 1, offsetX: 0, offsetY: 0 } }));
        cropPortraitSrc.current = dataUrl;
        setShowCropModal(true);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function removePortrait() {
    updateSelected((c) => ({ ...c, portrait: '', portraitCrop: { scale: 1, offsetX: 0, offsetY: 0 } }));
  }

  function openCropModal() {
    cropPortraitSrc.current = ch.portrait;
    setShowCropModal(true);
  }

  function saveCrop(crop: PortraitCrop) {
    updateSelected((c) => ({ ...c, portraitCrop: crop }));
    setShowCropModal(false);
  }

  return (
    <>
      {showCropModal && cropPortraitSrc.current && (
        <PortraitCropModal
          src={cropPortraitSrc.current}
          initialCrop={ch.portraitCrop}
          onSave={saveCrop}
          onCancel={() => setShowCropModal(false)}
        />
      )}
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
        <div className="char-header__main">
          <input
            type="text"
            className="char-name-input"
            value={ch.name}
            placeholder="Enter adventurer name…"
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => updateSelected((c) => ({ ...c, name: e.target.value }))}
          />

          {/* ── Identity tagline ── */}
          {(ch.race || ch.class || ch.level > 0) && (
            <div className="char-header__tagline">
              {[
                ch.level > 0 ? `Level ${ch.level}` : null,
                ch.race || null,
                [ch.class, ch.subclass].filter(Boolean).join(' — ') || null,
              ].filter(Boolean).join(' · ')}
            </div>
          )}

          {/* ── Conditions row ── */}
          <div className="char-conditions">
            {ch.conditions.map((entry) => {
              const def = getConditionDef(entry);
              if (!def) return null;
              const isExh = entry.name.startsWith('Exhaustion ');
              const exhLevel = isExh ? getExhaustionLevel(ch.conditions) : null;
              const label = isExh ? `Exhaustion ${exhLevel}` : def.name;
              return (
                <span key={entry.name} className={`cond-badge cond-badge--${def.tier}`}>
                  <button
                    className="cond-badge__label"
                    title={`${entry.name} — ${def.desc}\nClick to remove`}
                    onClick={() => removeCondition(entry.name)}
                  >
                    {label}
                  </button>
                  {entry.rounds !== undefined && (
                    <>
                      <span className="cond-badge__sep">·</span>
                      <span className="cond-badge__rounds">{entry.rounds}</span>
                      <button
                        className="cond-badge__tick"
                        title="Tick down one round"
                        onClick={() => tickCondition(entry.name)}
                      >−</button>
                    </>
                  )}
                </span>
              );
            })}
            <div className="cond-add-wrap">
              <button
                className="cond-add-btn"
                title="Add / remove conditions"
                onClick={() => setShowCondPicker((v) => !v)}
              >
                {ch.conditions.length === 0 ? '+ Condition' : '✎'}
              </button>
              {showCondPicker && (
                <ConditionPicker
                  conditions={ch.conditions}
                  onChange={handleConditionsChange}
                  onClose={() => setShowCondPicker(false)}
                />
              )}
            </div>
          </div>
        </div>

        <div className="char-header-badges">
          <div className="gold-coin-badge" title="Gold Pieces held">
            <span className="gold-coin__label">GP</span>
            <NumericInput
              className="gold-coin__value"
              value={ch.gold.gp}
              fallback={0}
              min={0}
              onCommit={(v) => updateSelected((c) => ({ ...c, gold: { ...c.gold, gp: Math.max(0, v) } }))}
            />
          </div>
          <div className="ac-shield-badge" title={`AC ${calcEffectiveAC(ch)} · ${ch.armorType} armor${ch.shield ? ` + shield` : ''}`}>
            <svg className="ac-shield-svg" viewBox="0 0 48 58" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M 1,1 L 47,1 L 47,33 C 47,50 24,57 24,57 C 24,57 1,50 1,33 Z"
                fill="var(--bg-deep)"
                stroke="var(--border-gold-dim)"
                strokeWidth="1.5"
              />
              <path
                d="M 5,5 L 43,5 L 43,32 C 43,46 24,52 24,52 C 24,52 5,46 5,32 Z"
                fill="none"
                stroke="var(--border-inner)"
                strokeWidth="0.75"
                opacity="0.6"
              />
              <text x="24" y="17" textAnchor="middle" dominantBaseline="middle" className="ac-shield__label">AC</text>
              <text x="24" y="35" textAnchor="middle" dominantBaseline="middle" className="ac-shield__number">{calcEffectiveAC(ch)}</text>
            </svg>
          </div>
          {(() => {
            const percMod = abilityMod(ch.abilities.wis) + (ch.skillProficiencies.includes('perception') ? profBonus(ch.level) : 0);
            const pp = 10 + percMod;
            return (
              <div className="pp-badge" title={`Passive Perception ${pp} (10 ${percMod >= 0 ? '+' : ''}${percMod})`}>
                <svg className="pp-badge__svg" viewBox="0 0 60 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Eye shape — outer */}
                  <path
                    d="M 3,19 C 3,19 15,4 30,4 C 45,4 57,19 57,19 C 57,19 45,34 30,34 C 15,34 3,19 3,19 Z"
                    fill="var(--bg-deep)"
                    stroke="var(--border-gold-dim)"
                    strokeWidth="1.2"
                  />
                  {/* Iris circle */}
                  <circle cx="30" cy="19" r="9" fill="none" stroke="var(--border-inner)" strokeWidth="0.75" opacity="0.5" />
                  {/* Label */}
                  <text x="30" y="12" textAnchor="middle" dominantBaseline="middle" className="pp-badge__label">PP</text>
                  {/* Value */}
                  <text x="30" y="24" textAnchor="middle" dominantBaseline="middle" className="pp-badge__number">{pp}</text>
                </svg>
              </div>
            );
          })()}

          {/* ── Speed Badge (horizontal hexagon) ── */}
          <div className="spd-badge" title={`Movement Speed: ${ch.speed} ft`}>
            <svg className="spd-badge__svg" viewBox="0 0 72 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M 10,1 L 62,1 L 71,24 L 62,47 L 10,47 L 1,24 Z"
                fill="var(--bg-deep)"
                stroke="var(--border-gold-dim)"
                strokeWidth="1.5"
              />
              <path
                d="M 14,5 L 58,5 L 66,24 L 58,43 L 14,43 L 6,24 Z"
                fill="none"
                stroke="var(--border-inner)"
                strokeWidth="0.75"
                opacity="0.55"
              />
              <text x="36" y="14" textAnchor="middle" dominantBaseline="middle" className="spd-badge__label">SPD</text>
            </svg>
            <NumericInput
              className="spd-badge__value"
              value={ch.speed}
              fallback={30}
              min={0}
              onCommit={(v) => updateSelected((c) => ({ ...c, speed: Math.max(0, v) }))}
            />
          </div>

          {/* ── Hit Dice Badge ── */}
          <div className="hd-badge" title={`Hit Dice: ${ch.level}${ch.hitDice.type} (${ch.class || 'unknown class'})`}>
            <svg className="hd-badge__svg" viewBox="0 0 58 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Outer octagon */}
              <path
                d="M 16,2 L 42,2 L 56,16 L 56,48 L 42,62 L 16,62 L 2,48 L 2,16 Z"
                fill="var(--bg-deep)"
                stroke="var(--border-gold-dim)"
                strokeWidth="1.5"
              />
              {/* Inner octagon frame */}
              <path
                d="M 19,6 L 39,6 L 52,19 L 52,45 L 39,58 L 19,58 L 6,45 L 6,19 Z"
                fill="none"
                stroke="var(--border-inner)"
                strokeWidth="0.75"
                opacity="0.55"
              />
              {/* "HD" label */}
              <text x="29" y="20" textAnchor="middle" dominantBaseline="middle" className="hd-badge__label">HD</text>
              {/* Die type value */}
              <text x="29" y="42" textAnchor="middle" dominantBaseline="middle" className="hd-badge__value">{ch.level}{ch.hitDice.type}</text>
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}
