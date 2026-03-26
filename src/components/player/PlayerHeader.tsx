import type { Character } from '../../types/character';
import { calcEffectiveAC, abilityMod, profBonus } from '../../types/character';

interface Props {
  ch: Character;
}

function passivePerception(ch: Character): number {
  const wisMod = abilityMod(ch.abilities.wis);
  const prof = ch.skillProficiencies.includes('perception') ? profBonus(ch.level) : 0;
  return 10 + wisMod + prof;
}

export function PlayerHeader({ ch }: Props) {
  const ac = calcEffectiveAC(ch);
  const pp = passivePerception(ch);
  const tagParts = [
    ch.level ? `Lv ${ch.level}` : null,
    ch.race || null,
    ch.class || null,
    ch.subclass || null,
  ].filter(Boolean);

  return (
    <>
      <div className="pv-header">
        <div className="pv-portrait-frame">
          {ch.portrait ? (
            <img
              src={ch.portrait}
              alt=""
              style={
                ch.portraitCrop
                  ? {
                      transform: `scale(${ch.portraitCrop.scale}) translate(${ch.portraitCrop.offsetX * 50}%, ${ch.portraitCrop.offsetY * 50}%)`,
                    }
                  : undefined
              }
            />
          ) : (
            <div className="pv-portrait-frame__placeholder">
              {(ch.name || '?')[0].toUpperCase()}
            </div>
          )}
        </div>

        <div className="pv-identity">
          <h1 className="pv-name">{ch.name || 'Unnamed Adventurer'}</h1>
          {tagParts.length > 0 && (
            <div className="pv-tagline">{tagParts.join(' \u00B7 ')}</div>
          )}
          <div className="pv-badges">
            <span className="pv-badge pv-badge--ac">
              <span className="pv-badge__icon">&#9711;</span>
              AC {ac}
            </span>
            <span className="pv-badge">
              <span className="pv-badge__icon">&#9673;</span>
              PP {pp}
            </span>
            {ch.speed > 0 && (
              <span className="pv-badge">
                {ch.speed} ft
              </span>
            )}
            {ch.darkvision > 0 && (
              <span className="pv-badge">
                DV {ch.darkvision} ft
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
