import { useRef, useState, useEffect } from 'react';
import type { Character } from '../../types/character';
import { calcEffectiveAC, passivePerception } from '../../types/character';
import { getConditionDef, getExhaustionLevel, type ConditionEntry } from '../../types/conditions';

interface Props {
  ch: Character;
}

interface HpDelta {
  key: number;
  amount: number;
  type: 'damage' | 'heal';
}

export function HeroCard({ ch }: Props) {
  const ac = calcEffectiveAC(ch);
  const pp = passivePerception(ch);

  const hpPct = ch.hp.max > 0 ? Math.max(0, Math.min(1, ch.hp.current / ch.hp.max)) : 1;
  const hpColor = hpPct > 0.5 ? 'var(--hp-healthy)' : hpPct > 0.25 ? 'var(--hp-wounded)' : 'var(--hp-critical)';
  const hpTier = hpPct > 0.5 ? 'healthy' : hpPct > 0.25 ? 'wounded' : 'critical';

  // Ring arc constants
  const RING_R = 54;
  const RING_CIRC = 2 * Math.PI * RING_R; // ≈ 339.29
  const ringOffset = RING_CIRC * (1 - hpPct);

  // Active concentration spell
  const concentrating = ch.spells.find((s) => s.active && s.concentration);

  // ── HP change detection & animation ──
  const prevHpRef = useRef<{ current: number; temp: number; id: string } | null>(null);
  const [orbAnim, setOrbAnim] = useState<'damage' | 'heal' | null>(null);
  const [floatingNumbers, setFloatingNumbers] = useState<HpDelta[]>([]);
  const deltaKeyRef = useRef(0);

  useEffect(() => {
    const prev = prevHpRef.current;
    // Track total effective HP (current + temp)
    const totalNow = ch.hp.current + ch.hp.temp;
    if (prev && prev.id === ch.id) {
      const totalBefore = prev.current + prev.temp;
      const diff = totalNow - totalBefore;
      if (diff !== 0) {
        const type = diff < 0 ? 'damage' : 'heal';
        setOrbAnim(type);
        const key = ++deltaKeyRef.current;
        setFloatingNumbers((ns) => [...ns, { key, amount: Math.abs(diff), type }]);
        prevHpRef.current = { current: ch.hp.current, temp: ch.hp.temp, id: ch.id };
        // Clear orb anim class after animation completes
        const t = setTimeout(() => setOrbAnim(null), 800);
        // Remove floating number after it drifts away
        const t2 = setTimeout(() => {
          setFloatingNumbers((ns) => ns.filter((n) => n.key !== key));
        }, 1200);
        return () => { clearTimeout(t); clearTimeout(t2); };
      }
    }
    prevHpRef.current = { current: ch.hp.current, temp: ch.hp.temp, id: ch.id };
  }, [ch.hp.current, ch.hp.temp, ch.id]);

  const orbClasses = [
    'pv-hp-orb',
    orbAnim === 'damage' ? 'pv-hp-orb--damage' : '',
    orbAnim === 'heal' ? 'pv-hp-orb--heal' : '',
  ].filter(Boolean).join(' ');

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

      {/* ── HP Orb + Ring ── */}
      <div className="pv-hero__hp-orb" title={`${ch.hp.current} / ${ch.hp.max}${ch.hp.temp > 0 ? ` (+${ch.hp.temp} temp)` : ''}`}>
        {/* ── HP Ring ── */}
        <svg className={`pv-hp-ring pv-hp-ring--${hpTier}${orbAnim ? ` pv-hp-ring--${orbAnim}` : ''}`} viewBox="0 0 120 120">
          <defs>
            <radialGradient id="hpRivetGrad" cx="38%" cy="32%">
              <stop offset="0%" stopColor="#d4a84e" />
              <stop offset="60%" stopColor="#8a6d3b" />
              <stop offset="100%" stopColor="#4a3518" />
            </radialGradient>
          </defs>

          {/* Outer bevel highlight */}
          <circle cx="60" cy="60" r="56.5" fill="none"
            stroke="rgba(160,130,70,0.2)" strokeWidth="0.75" />

          {/* Track groove */}
          <circle className="pv-hp-ring__track" cx="60" cy="60" r="54"
            fill="none" strokeWidth="5" />

          {/* Inner bevel shadow */}
          <circle cx="60" cy="60" r="51.5" fill="none"
            stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />

          {/* Fill arc */}
          <circle
            className="pv-hp-ring__fill"
            cx="60" cy="60" r="54"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            style={{
              strokeDasharray: RING_CIRC,
              strokeDashoffset: ringOffset,
            }}
          />

          {/* Flash overlay on damage/heal */}
          {orbAnim && (
            <circle
              className={`pv-hp-ring__flash pv-hp-ring__flash--${orbAnim}`}
              cx="60" cy="60" r="54"
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              style={{
                strokeDasharray: RING_CIRC,
                strokeDashoffset: ringOffset,
              }}
            />
          )}

          {/* Cardinal rivets */}
          <circle cx="60" cy="6" r="2.8" fill="url(#hpRivetGrad)" stroke="#3a2810" strokeWidth="0.6" />
          <circle cx="114" cy="60" r="2.8" fill="url(#hpRivetGrad)" stroke="#3a2810" strokeWidth="0.6" />
          <circle cx="60" cy="114" r="2.8" fill="url(#hpRivetGrad)" stroke="#3a2810" strokeWidth="0.6" />
          <circle cx="6" cy="60" r="2.8" fill="url(#hpRivetGrad)" stroke="#3a2810" strokeWidth="0.6" />

          {/* Tick notches between rivets */}
          <line x1="60" y1="2" x2="60" y2="4.5" stroke="rgba(160,130,70,0.25)" strokeWidth="0.6" />
          <line x1="118" y1="60" x2="115.5" y2="60" stroke="rgba(160,130,70,0.25)" strokeWidth="0.6" />
          <line x1="60" y1="118" x2="60" y2="115.5" stroke="rgba(160,130,70,0.25)" strokeWidth="0.6" />
          <line x1="2" y1="60" x2="4.5" y2="60" stroke="rgba(160,130,70,0.25)" strokeWidth="0.6" />
        </svg>

        {/* ── Glass Orb ── */}
        <div className={orbClasses}>
          {/* Damage ripple ring */}
          {orbAnim === 'damage' && <div className="pv-hp-orb__ripple pv-hp-orb__ripple--dmg" />}
          {/* Heal shimmer ring */}
          {orbAnim === 'heal' && <div className="pv-hp-orb__ripple pv-hp-orb__ripple--heal" />}
          <div
            className="pv-hp-orb__fill"
            style={{
              height: `${hpPct * 100}%`,
              background: `linear-gradient(to top, ${hpColor} 0%, ${hpColor}dd 70%, ${hpColor}88 100%)`,
              boxShadow: `0 -4px 12px ${hpColor}40, inset 0 2px 6px ${hpColor}30`,
            }}
          />
          <div className="pv-hp-orb__text">
            <span className={`pv-hp-orb__current${orbAnim === 'damage' ? ' pv-hp-orb__current--shake' : ''}`}>{ch.hp.current}</span>
            <span className="pv-hp-orb__sep">/</span>
            <span className="pv-hp-orb__max">{ch.hp.max}</span>
          </div>
          {ch.hp.temp > 0 && (
            <span className="pv-hp-orb__temp">+{ch.hp.temp}</span>
          )}
          {/* Heal sparkle particles */}
          {orbAnim === 'heal' && (
            <div className="pv-hp-orb__sparkles">
              <span className="pv-hp-orb__spark" style={{ left: '20%', animationDelay: '0s' }} />
              <span className="pv-hp-orb__spark" style={{ left: '45%', animationDelay: '0.1s' }} />
              <span className="pv-hp-orb__spark" style={{ left: '70%', animationDelay: '0.05s' }} />
              <span className="pv-hp-orb__spark" style={{ left: '35%', animationDelay: '0.15s' }} />
              <span className="pv-hp-orb__spark" style={{ left: '60%', animationDelay: '0.08s' }} />
            </div>
          )}
        </div>

        {/* Floating damage/heal numbers */}
        {floatingNumbers.map((fn) => (
          <span
            key={fn.key}
            className={`pv-hp-float pv-hp-float--${fn.type}`}
          >
            {fn.type === 'damage' ? `\u2212${fn.amount}` : `+${fn.amount}`}
          </span>
        ))}
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
