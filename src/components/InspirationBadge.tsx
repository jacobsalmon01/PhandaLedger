/**
 * InspirationBadge — the "spark of heroism" token.
 *
 * A faceted gold star-gem that sits dim/unlit when empty and ignites with a
 * glow-pulse + twinkling sparkles once granted. Lives alongside the engraved
 * stat badges (AC shield, PP eye, SPD hex).
 *
 *   editable  → DM view: tap the star to grant (+1), tap ✦ to spend (−1)
 *   read-only → player view: lit token they can admire but not change
 */

interface Props {
  value: number;
  editable?: boolean;
  onChange?: (next: number) => void;
}

export const MAX_INSPIRATION = 9;

// Five-pointed star, outer R≈21 / inner r≈8.4, centred in a 48×48 box.
const STAR_PATH =
  'M24 3 L28.9 17.2 L44 17.5 L32 26.6 L36.3 41 L24 32.4 L11.7 41 L16 26.6 L4 17.5 L19.1 17.2 Z';

// Decorative twinkles that fade in when the token is lit.
const SPARKS = [
  { left: '6%',  top: '14%', delay: '0s',    size: 5 },
  { left: '84%', top: '22%', delay: '0.5s',  size: 4 },
  { left: '78%', top: '74%', delay: '1.05s', size: 5 },
  { left: '12%', top: '70%', delay: '0.75s', size: 4 },
];

export function InspirationBadge({ value, editable = false, onChange }: Props) {
  const lit = value > 0;

  const grant = () => onChange?.(Math.min(MAX_INSPIRATION, value + 1));
  const spend = () => onChange?.(Math.max(0, value - 1));

  const title = editable
    ? lit
      ? `Inspiration: ${value} — tap the star to grant another, ✦ to spend one`
      : 'Inspiration — tap the star to grant'
    : `Inspiration: ${value}`;

  return (
    <div
      className={`insp-badge${lit ? ' insp-badge--lit' : ''}${editable ? ' insp-badge--editable' : ''}`}
      title={title}
    >
      <div className="insp-badge__core">
        {/* Sparkles only render once lit */}
        {lit && (
          <div className="insp-badge__sparks" aria-hidden>
            {SPARKS.map((s, i) => (
              <span
                key={i}
                className="insp-badge__spark"
                style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay }}
              />
            ))}
          </div>
        )}

        <Star
          interactive={editable}
          lit={lit}
          atMax={value >= MAX_INSPIRATION}
          onGrant={grant}
        />

        {/* Count pip — only when stacked beyond a single token */}
        {value > 1 && <span className="insp-badge__count">{value}</span>}

        {/* Spend control — DM only, only when there's something to spend */}
        {editable && lit && (
          <button
            type="button"
            className="insp-badge__spend"
            title="Spend one inspiration"
            aria-label="Spend one inspiration"
            onClick={spend}
          >
            ✦
          </button>
        )}
      </div>
      <span className="insp-badge__label">Insp</span>
    </div>
  );
}

function Star({
  interactive,
  lit,
  atMax,
  onGrant,
}: {
  interactive: boolean;
  lit: boolean;
  atMax: boolean;
  onGrant: () => void;
}) {
  const svg = (
    <svg className="insp-badge__svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="inspFill" cx="42%" cy="34%" r="75%">
          <stop offset="0%" stopColor="#fff4cf" />
          <stop offset="38%" stopColor="#f0c862" />
          <stop offset="72%" stopColor="#c8932f" />
          <stop offset="100%" stopColor="#7a5418" />
        </radialGradient>
      </defs>

      {/* Gem body */}
      <path
        className="insp-badge__gem"
        d={STAR_PATH}
        fill={lit ? 'url(#inspFill)' : 'var(--bg-deep)'}
        stroke={lit ? '#f3dd92' : 'var(--border-gold-dim)'}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* Faceting — cuts from centre to each outer point for a gem look */}
      <g className="insp-badge__facets" stroke={lit ? 'rgba(120,84,24,0.55)' : 'var(--border-inner)'} strokeWidth="0.7">
        <line x1="24" y1="24" x2="24" y2="3" />
        <line x1="24" y1="24" x2="44" y2="17.5" />
        <line x1="24" y1="24" x2="36.3" y2="41" />
        <line x1="24" y1="24" x2="11.7" y2="41" />
        <line x1="24" y1="24" x2="4" y2="17.5" />
      </g>

      {/* Specular glint */}
      {lit && <circle className="insp-badge__glint" cx="19" cy="14" r="2.6" fill="rgba(255,250,235,0.9)" />}
    </svg>
  );

  if (!interactive) return <div className="insp-badge__star">{svg}</div>;

  return (
    <button
      type="button"
      className="insp-badge__star insp-badge__star--btn"
      title={atMax ? 'Maximum inspiration reached' : 'Grant inspiration'}
      aria-label="Grant inspiration"
      disabled={atMax}
      onClick={onGrant}
    >
      {svg}
    </button>
  );
}
