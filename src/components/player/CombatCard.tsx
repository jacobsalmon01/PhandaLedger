import type { Character, FightingStyle, Weapon } from '../../types/character';
import { abilityMod, profBonus } from '../../types/character';

interface Props {
  ch: Character;
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function calcAttack(ch: Character, w: Weapon, styles: FightingStyle[]) {
  const strMod = abilityMod(ch.abilities.str);
  const dexMod = abilityMod(ch.abilities.dex);
  const effectiveStatKey: keyof Character['abilities'] =
    w.finesse ? (strMod >= dexMod ? 'str' : 'dex') : w.stat;
  const statMod = abilityMod(ch.abilities[effectiveStatKey]);
  const prof = w.proficient ? profBonus(ch.level) : 0;
  const archeryBonus = styles.includes('archery') && w.ranged ? 2 : 0;
  const duelingBonus = styles.includes('dueling') && !w.ranged
    && ch.weapons.filter((wp) => !wp.ranged).length === 1 ? 2 : 0;
  const toHit = statMod + prof + w.attackBonus + archeryBonus;
  const dmgBonus = statMod + w.attackBonus + duelingBonus;
  return { toHit, dmgBonus, dice: w.damageDice };
}

function sneakDice(level: number): string {
  return `${Math.ceil(level / 2)}d6`;
}

export function CombatCard({ ch }: Props) {
  const isFighter = ch.class.toLowerCase().includes('fighter');
  const styles: FightingStyle[] = isFighter ? (ch.fightingStyles ?? []) : [];

  if (ch.weapons.length === 0) {
    return (
      <div className="pv-card pv-card--combat">
        <h2 className="pv-card__title">Combat</h2>
        <div className="pv-card__empty">No weapons equipped</div>
      </div>
    );
  }

  return (
    <div className="pv-card pv-card--combat">
      <h2 className="pv-card__title">Combat</h2>
      <div className="pv-combat__list">
        {ch.weapons.map((w) => {
          const { toHit, dmgBonus, dice } = calcAttack(ch, w, styles);
          return (
            <div key={w.id} className="pv-weapon">
              <div className="pv-weapon__name">
                {w.name || 'Unnamed'}
                {w.attackBonus > 0 && <span className="pv-weapon__magic">+{w.attackBonus}</span>}
              </div>
              <div className="pv-weapon__stats">
                <div className="pv-weapon__stat">
                  <span className="pv-weapon__stat-value">{signed(toHit)}</span>
                  <span className="pv-weapon__stat-label">Hit</span>
                </div>
                <div className="pv-weapon__stat-divider" />
                <div className="pv-weapon__stat">
                  <span className="pv-weapon__stat-value">{dice}{signed(dmgBonus)}</span>
                  <span className="pv-weapon__stat-label">{w.damageType}</span>
                </div>
                {ch.sneakAttack && (w.finesse || w.ranged) && (
                  <>
                    <div className="pv-weapon__stat-divider" />
                    <div className="pv-weapon__stat pv-weapon__stat--sneak">
                      <span className="pv-weapon__stat-value">{sneakDice(ch.level)}</span>
                      <span className="pv-weapon__stat-label">Sneak</span>
                    </div>
                  </>
                )}
              </div>
              <div className="pv-weapon__tags">
                {w.finesse && <span className="pv-weapon__tag">Finesse</span>}
                {w.twoHanded && <span className="pv-weapon__tag">Two-Handed</span>}
                {w.versatile && <span className="pv-weapon__tag">Versatile</span>}
                {w.ranged && <span className="pv-weapon__tag">Ranged</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
