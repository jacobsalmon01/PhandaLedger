import type { Character } from '../../types/character';
import { abilityMod, profBonus, calcEffectiveAC } from '../../types/character';
import { getConditionDef, getExhaustionLevel, type ConditionEntry } from '../../types/conditions';

interface Props {
  ch: Character;
}

export function HeroCard({ ch }: Props) {
  const ac = calcEffectiveAC(ch);
  const percMod = abilityMod(ch.abilities.wis) + (ch.skillProficiencies.includes('perception') ? profBonus(ch.level) : 0);
  const pp = 10 + percMod;

  const hpPct = ch.hp.max > 0 ? Math.max(0, Math.min(1, ch.hp.current / ch.hp.max)) : 1;
  const hpColor = hpPct > 0.5 ? 'var(--hp-healthy)' : hpPct > 0.25 ? 'var(--hp-wounded)' : 'var(--hp-critical)';

  // Active concentration spell
  const concentrating = ch.spells.find((s) => s.active && s.concentration);

  return (
    <div className="pv-hero">
      {/* ── Portrait ── */}
      <div className="pv-hero__portrait-frame">
        <div className="pv-hero__portrait">
          {ch.portrait ? (
            <img
              src={ch.portrait}
              alt={ch.name}
              style={{
                transform: `translate(${ch.portraitCrop.offsetX * 100}%, ${ch.portraitCrop.offsetY * 100}%) scale(${ch.portraitCrop.scale})`,
                transformOrigin: 'center center',
              }}
            />
          ) : (
            <span className="pv-hero__portrait-empty">
              {(ch.name?.[0] || '?').toUpperCase()}
            </span>
          )}
        </div>
        <div className="pv-hero__portrait-vignette" />
      </div>

      {/* ── Identity ── */}
      <div className="pv-hero__identity">
        <h1 className="pv-hero__name">{ch.name || 'Unnamed Adventurer'}</h1>
        {(ch.race || ch.class || ch.level > 0) && (
          <div className="pv-hero__tagline">
            {[
              ch.level > 0 ? `Level ${ch.level}` : null,
              ch.race || null,
              [ch.class, ch.subclass].filter(Boolean).join(' \u2014 ') || null,
            ].filter(Boolean).join(' \u00b7 ')}
          </div>
        )}
      </div>

      {/* ── HP Orb ── */}
      <div className="pv-hero__hp-orb" title={`${ch.hp.current} / ${ch.hp.max}${ch.hp.temp > 0 ? ` (+${ch.hp.temp} temp)` : ''}`}>
        <div className="pv-hp-orb">
          <div
            className="pv-hp-orb__fill"
            style={{
              height: `${hpPct * 100}%`,
              background: `linear-gradient(to top, ${hpColor} 0%, ${hpColor}dd 70%, ${hpColor}88 100%)`,
              boxShadow: `0 -4px 12px ${hpColor}40, inset 0 2px 6px ${hpColor}30`,
            }}
          />
          <div className="pv-hp-orb__text">
            <span className="pv-hp-orb__current">{ch.hp.current}</span>
            <span className="pv-hp-orb__sep">/</span>
            <span className="pv-hp-orb__max">{ch.hp.max}</span>
          </div>
          {ch.hp.temp > 0 && (
            <span className="pv-hp-orb__temp">+{ch.hp.temp}</span>
          )}
        </div>
      </div>

      {/* ── Stat Badges ── */}
      <div className="pv-hero__badges">
        <div className="pv-badge pv-badge--ac" title={`AC ${ac}`}>
          <svg viewBox="0 0 48 58" fill="none">
            <path d="M 1,1 L 47,1 L 47,33 C 47,50 24,57 24,57 C 24,57 1,50 1,33 Z"
              fill="var(--bg-deep)" stroke="var(--border-gold-dim)" strokeWidth="1.5" />
            <path d="M 5,5 L 43,5 L 43,32 C 43,46 24,52 24,52 C 24,52 5,46 5,32 Z"
              fill="none" stroke="var(--border-inner)" strokeWidth="0.75" opacity="0.6" />
            <text x="24" y="17" textAnchor="middle" dominantBaseline="middle" className="pv-badge__label">AC</text>
            <text x="24" y="35" textAnchor="middle" dominantBaseline="middle" className="pv-badge__value">{ac}</text>
          </svg>
        </div>

        <div className="pv-badge pv-badge--spd" title={`Speed ${ch.speed} ft`}>
          <svg viewBox="0 0 72 48" fill="none">
            <path d="M 10,1 L 62,1 L 71,24 L 62,47 L 10,47 L 1,24 Z"
              fill="var(--bg-deep)" stroke="var(--border-gold-dim)" strokeWidth="1.5" />
            <path d="M 14,5 L 58,5 L 66,24 L 58,43 L 14,43 L 6,24 Z"
              fill="none" stroke="var(--border-inner)" strokeWidth="0.75" opacity="0.55" />
            <text x="36" y="14" textAnchor="middle" dominantBaseline="middle" className="pv-badge__label">SPD</text>
            <text x="36" y="32" textAnchor="middle" dominantBaseline="middle" className="pv-badge__value">{ch.speed}</text>
          </svg>
        </div>

        <div className="pv-badge pv-badge--pp" title={`Passive Perception ${pp}`}>
          <svg viewBox="0 0 60 38" fill="none">
            <path d="M 3,19 C 3,19 15,4 30,4 C 45,4 57,19 57,19 C 57,19 45,34 30,34 C 15,34 3,19 3,19 Z"
              fill="var(--bg-deep)" stroke="var(--border-gold-dim)" strokeWidth="1.2" />
            <circle cx="30" cy="19" r="9" fill="none" stroke="var(--border-inner)" strokeWidth="0.75" opacity="0.5" />
            <text x="30" y="12" textAnchor="middle" dominantBaseline="middle" className="pv-badge__label">PP</text>
            <text x="30" y="24" textAnchor="middle" dominantBaseline="middle" className="pv-badge__value">{pp}</text>
          </svg>
        </div>

        {(ch.darkvision ?? 0) > 0 && (
          <div className="pv-badge pv-badge--dv" title={`Darkvision ${ch.darkvision} ft`}>
            <svg viewBox="0 0 56 48" fill="none">
              <path d="M 8,1 L 48,1 L 55,24 L 48,47 L 8,47 L 1,24 Z"
                fill="var(--bg-deep)" stroke="var(--border-gold-dim)" strokeWidth="1.5" />
              <path d="M 11,5 L 45,5 L 51,24 L 45,43 L 11,43 L 5,24 Z"
                fill="none" stroke="var(--border-inner)" strokeWidth="0.75" opacity="0.55" />
              <text x="28" y="14" textAnchor="middle" dominantBaseline="middle" className="pv-badge__label">DV</text>
              <text x="28" y="32" textAnchor="middle" dominantBaseline="middle" className="pv-badge__value">{ch.darkvision}</text>
            </svg>
          </div>
        )}
      </div>

      {/* ── Conditions ── */}
      {ch.conditions.length > 0 && (
        <div className="pv-hero__conditions">
          {ch.conditions.map((entry: ConditionEntry) => {
            const def = getConditionDef(entry);
            if (!def) return null;
            const isExh = entry.name.startsWith('Exhaustion ');
            const exhLevel = isExh ? getExhaustionLevel(ch.conditions) : null;
            const label = isExh ? `Exhaustion ${exhLevel}` : def.name;
            return (
              <span key={entry.name} className={`pv-condition pv-condition--${def.tier}`}>
                <span className="pv-condition__icon">{def.icon}</span>
                <span className="pv-condition__name">{label}</span>
                {entry.rounds !== undefined && (
                  <span className="pv-condition__rounds">{entry.rounds}r</span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Concentration indicator ── */}
      {concentrating && (
        <div className="pv-hero__concentration">
          <span className="pv-concentration__icon">\u25c6</span>
          <span className="pv-concentration__name">{concentrating.name}</span>
          {concentrating.roundsRemaining > 0 && (
            <span className="pv-concentration__rounds">{concentrating.roundsRemaining}r</span>
          )}
        </div>
      )}
    </div>
  );
}
