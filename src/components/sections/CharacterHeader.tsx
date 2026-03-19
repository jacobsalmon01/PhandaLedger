import { useRef, useState } from 'react';
import type { Character, PortraitCrop } from '../../types/character';
import { calcEffectiveAC } from '../../types/character';
import { PortraitCropModal } from '../PortraitCropModal';
import { NumericInput } from '../NumericInput';

interface Props {
  ch: Character;
  updateSelected: (updater: (ch: Character) => Character) => void;
}

export function CharacterHeader({ ch, updateSelected }: Props) {
  const [showCropModal, setShowCropModal] = useState(false);
  const cropPortraitSrc = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <input
          type="text"
          className="char-name-input"
          value={ch.name}
          placeholder="Enter adventurer name…"
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => updateSelected((c) => ({ ...c, name: e.target.value }))}
        />
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
        </div>
      </div>
    </>
  );
}
