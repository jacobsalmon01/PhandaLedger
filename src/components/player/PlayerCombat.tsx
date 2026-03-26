import type { Character, Weapon, FightingStyle } from '../../types/character';
import { abilityMod, profBonus, spellAttackBonus, spellSaveDC } from '../../types/character';

interface Props {
  ch: Character;
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

function sneakDice(level: number): string {
  return `${Math.ceil(level / 2)}d6`;
}

function duelingApplies(styles: FightingStyle[], w: Weapon): boolean {
  return styles.includes('dueling') && !w.twoHanded && !w.ranged;
}

export function PlayerCombat({ ch }: Props) {
  const hasSpells = ch.spells.length > 0 || ch.spellSlots.some((s) => s.max > 0);

  return (
    <>
      {/* Spell Attack / Save DC */}
      {hasSpells && (
        <div className="pv-spell-meta">
          <div className="pv-spell-badge">
            <span className="pv-spell-badge__label">Spell Attack</span>
            <span className="pv-spell-badge__value">{signed(spellAttackBonus(ch))}</span>
          </div>
          <div className="pv-spell-badge">
            <span className="pv-spell-badge__label">Save DC</span>
            <span className="pv-spell-badge__value">{spellSaveDC(ch)}</span>
          </div>
        </div>
      )}

      <div className="pv-section-title">
        <span className="pv-section-title__icon">&#9876;</span>
        Weapons
      </div>

      {ch.weapons.length === 0 ? (
        <div className="pv-none">No weapons equipped</div>
      ) : (
        <div className="pv-weapons">
          {ch.weapons.map((w) => {
            const atk = calcAttack(ch, w, ch.fightingStyles);
            const duelingDmg = duelingApplies(ch.fightingStyles, w) ? 2 : 0;
            const totalDmgMod = atk.statMod + w.attackBonus + duelingDmg;
            const dmgModStr = totalDmgMod !== 0 ? signed(totalDmgMod) : '';
            const tags: string[] = [];
            if (w.finesse) tags.push('finesse');
            if (w.ranged) tags.push('ranged');
            if (w.versatile) tags.push('versatile');
            if (w.twoHanded) tags.push('two-handed');

            return (
              <div key={w.id} className="pv-weapon">
                <div className="pv-weapon__top">
                  <span className="pv-weapon__name">{w.name || 'Unnamed'}</span>
                  <span className="pv-weapon__hit">{signed(atk.total)}</span>
                </div>
                <div className="pv-weapon__bottom">
                  <span className="pv-weapon__damage">
                    {w.damageDice}{dmgModStr} {w.damageType}
                    {w.versatile && w.versatileDice && (
                      <> ({w.versatileDice}{dmgModStr})</>
                    )}
                  </span>
                  {tags.length > 0 && (
                    <span className="pv-weapon__tags">
                      {tags.map((t) => (
                        <span key={t} className="pv-weapon__tag">{t}</span>
                      ))}
                    </span>
                  )}
                </div>
                {ch.sneakAttack && (w.finesse || w.ranged) && (
                  <div className="pv-weapon__sneak">
                    Sneak Attack: +{sneakDice(ch.level)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
