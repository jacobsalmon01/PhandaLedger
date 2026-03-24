import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBattleMapStore } from '../store/useBattleMapStore';
import { useStore } from '../store/useStore';
import { isPlayerMode } from '../store/wsClient';
import type { MapToken, MapTemplate, MapLightSource, AmbientLightLevel } from '../types/battlemap';
import type { Character } from '../types/character';


// ── Token color palette ──────────────────────────────────────────────────────

// NPC/custom token colors — includes Crimson (red) to mark enemies
const TOKEN_COLORS = [
  { name: 'Cerulean', hex: '#4a6fa5' },
  { name: 'Crimson',  hex: '#9b3a3a' },
  { name: 'Emerald',  hex: '#4a7a3a' },
  { name: 'Amethyst', hex: '#6b4a8a' },
  { name: 'Amber',    hex: '#b8703a' },
  { name: 'Teal',     hex: '#3a7a7a' },
  { name: 'Gold',     hex: '#c8a44e' },
  { name: 'Silver',   hex: '#8a8a8a' },
];

// Party character token colors — Crimson excluded so red is reserved for NPCs
const PC_TOKEN_COLORS = TOKEN_COLORS.filter((c) => c.name !== 'Crimson');

// ── Token size options ────────────────────────────────────────────────────────

const TOKEN_SIZES = [
  { size: 0.5, label: 'Tiny' },
  { size: 1,   label: 'Med'  },
  { size: 2,   label: 'Large' },
  { size: 3,   label: 'Huge' },
  { size: 4,   label: 'Garg' },
];

// ── AoE constants ─────────────────────────────────────────────────────────────

const AOE_COLORS = [
  { name: 'Flame',   hex: '#e8532e' },
  { name: 'Frost',   hex: '#4aa0ff' },
  { name: 'Void',    hex: '#c84aff' },
  { name: 'Venom',   hex: '#4add6e' },
  { name: 'Radiant', hex: '#ffd040' },
  { name: 'Storm',   hex: '#40ddff' },
];

const AOE_SIZES: Record<MapTemplate['type'], number[]> = {
  circle: [5, 10, 15, 20, 30],
  cone:   [15, 30, 45, 60],
  line:   [30, 60, 100],
  cube:   [5, 10, 15, 20],
};

const AOE_DEFAULTS: Record<MapTemplate['type'], number> = {
  circle: 20,
  cone:   30,
  line:   60,
  cube:   15,
};

// ── Shape icon (tiny preview SVGs for AoE menu) ───────────────────────────────

function ShapeIcon({ type }: { type: MapTemplate['type'] }) {
  const s = 22;
  const cx = s / 2, cy = s / 2, r = s * 0.4;
  switch (type) {
    case 'circle':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
          <circle cx={cx} cy={cy} r={r} fill="currentColor" fillOpacity={0.3}
            stroke="currentColor" strokeWidth={1.5} />
        </svg>
      );
    case 'cone': {
      const tx = cx, ty = cy + r * 0.3;
      const x1 = cx - r * 0.95, y1 = cy - r * 0.7;
      const x2 = cx + r * 0.95, y2 = cy - r * 0.7;
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
          <path d={`M ${tx} ${ty} L ${x1} ${y1} Q ${cx} ${cy - r} ${x2} ${y2} Z`}
            fill="currentColor" fillOpacity={0.3} stroke="currentColor" strokeWidth={1.5} />
        </svg>
      );
    }
    case 'line': {
      const hw = s * 0.14;
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
          <rect x={s * 0.1} y={cy - hw} width={s * 0.8} height={hw * 2}
            fill="currentColor" fillOpacity={0.3} stroke="currentColor" strokeWidth={1.5} rx={2} />
        </svg>
      );
    }
    case 'cube': {
      const hw = r * 0.78;
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
          <rect x={cx - hw} y={cy - hw} width={hw * 2} height={hw * 2}
            fill="currentColor" fillOpacity={0.3} stroke="currentColor" strokeWidth={1.5} />
        </svg>
      );
    }
  }
}

// ── Add Token dropdown ────────────────────────────────────────────────────────

function AddTokenMenu({
  characters,
  tokens,
  onAddPartyToken,
  onAddCustomToken,
  style,
}: {
  characters: Character[];
  tokens: MapToken[];
  onAddPartyToken: (ch: Character) => void;
  onAddCustomToken: (opts: { label: string; color: string; size: number }) => void;
  style?: React.CSSProperties;
}) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(TOKEN_COLORS[1].hex);
  const [size, setSize] = useState(1);

  const placedCharIds = new Set(
    tokens.filter((t) => t.characterId).map((t) => t.characterId!),
  );

  return (
    <div className="bm-add-menu" style={style} onClick={(e) => e.stopPropagation()}>
      {characters.length > 0 && (
        <div className="bm-add-menu__section">
          <div className="bm-add-menu__heading">Party</div>
          <div className="bm-add-menu__party-list">
            {characters.map((ch, i) => {
              const placed = placedCharIds.has(ch.id);
              return (
                <button
                  key={ch.id}
                  className={`bm-add-menu__party-item${placed ? ' bm-add-menu__party-item--placed' : ''}`}
                  onClick={() => { if (!placed) onAddPartyToken(ch); }}
                  disabled={placed}
                >
                  <span
                    className="bm-add-menu__party-initial"
                    style={{ background: PC_TOKEN_COLORS[i % PC_TOKEN_COLORS.length].hex }}
                  >
                    {(ch.name || '?')[0].toUpperCase()}
                  </span>
                  <span className="bm-add-menu__party-name">
                    {ch.name || 'Unnamed'}
                  </span>
                  {placed && <span className="bm-add-menu__party-check">{'\u2713'}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="bm-add-menu__section">
        <div className="bm-add-menu__heading">Custom</div>
        <div className="bm-add-menu__custom">
          <input
            className="bm-add-menu__input"
            placeholder="Label..."
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={4}
          />
          <div className="bm-add-menu__colors">
            {TOKEN_COLORS.map((c) => (
              <button
                key={c.hex}
                className={`bm-add-menu__swatch${color === c.hex ? ' bm-add-menu__swatch--active' : ''}`}
                style={{ backgroundColor: c.hex }}
                onClick={() => setColor(c.hex)}
                title={c.name}
              />
            ))}
          </div>
          <div className="bm-add-menu__size-row">
            <span className="bm-add-menu__size-label">Size</span>
            <div className="bm-add-menu__size-btns">
              {TOKEN_SIZES.map(({ size: s, label }) => (
                <button
                  key={s}
                  className={`bm-add-menu__size-btn${size === s ? ' bm-add-menu__size-btn--active' : ''}`}
                  onClick={() => setSize(s)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <button
        className="bm-add-menu__place-btn"
        onClick={() => {
          onAddCustomToken({ label: label || '?', color, size });
          setLabel('');
        }}
      >
        Place Token
      </button>
    </div>
  );
}

// ── Add AoE menu ──────────────────────────────────────────────────────────────

function AddAoeMenu({
  onAdd,
  style,
}: {
  onAdd: (opts: { type: MapTemplate['type']; size: number; color: string }) => void;
  style?: React.CSSProperties;
}) {
  const [type, setType] = useState<MapTemplate['type']>('circle');
  const [size, setSize] = useState(AOE_DEFAULTS.circle);
  const [sizeInput, setSizeInput] = useState(String(AOE_DEFAULTS.circle));
  const [color, setColor] = useState(AOE_COLORS[0].hex);

  function handleTypeChange(t: MapTemplate['type']) {
    setType(t);
    const def = AOE_DEFAULTS[t];
    setSize(def);
    setSizeInput(String(def));
  }

  function handlePresetSize(ft: number) {
    setSize(ft);
    setSizeInput(String(ft));
  }

  function commitSizeInput() {
    const parsed = parseFloat(sizeInput);
    if (!isNaN(parsed) && parsed > 0) {
      setSize(parsed);
      setSizeInput(String(parsed));
    } else {
      setSizeInput(String(size));
    }
  }

  return (
    <div className="bm-add-menu" style={style} onClick={(e) => e.stopPropagation()}>
      <div className="bm-add-menu__section">
        <div className="bm-add-menu__heading">Shape</div>
        <div className="bm-add-menu__shape-icons">
          {(['circle', 'cone', 'line', 'cube'] as MapTemplate['type'][]).map((t) => (
            <button
              key={t}
              className={`bm-add-menu__shape-icon${type === t ? ' bm-add-menu__shape-icon--active' : ''}`}
              onClick={() => handleTypeChange(t)}
              title={t.charAt(0).toUpperCase() + t.slice(1)}
            >
              <ShapeIcon type={t} />
              <span>{t}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bm-add-menu__section">
        <div className="bm-add-menu__heading">Size</div>
        <div className="bm-add-menu__ft-row">
          {AOE_SIZES[type].map((ft) => (
            <button
              key={ft}
              className={`bm-add-menu__ft-btn${size === ft ? ' bm-add-menu__ft-btn--active' : ''}`}
              onClick={() => handlePresetSize(ft)}
            >
              {ft}
            </button>
          ))}
          <input
            className="bm-add-menu__ft-input"
            type="number"
            min="1"
            step="0.5"
            value={sizeInput}
            onChange={(e) => setSizeInput(e.target.value)}
            onBlur={commitSizeInput}
            onKeyDown={(e) => { if (e.key === 'Enter') { commitSizeInput(); (e.target as HTMLInputElement).blur(); } }}
          />
          <span className="bm-add-menu__ft-unit">ft</span>
        </div>
      </div>

      <div className="bm-add-menu__section">
        <div className="bm-add-menu__heading">Color</div>
        <div className="bm-add-menu__colors">
          {AOE_COLORS.map((c) => (
            <button
              key={c.hex}
              className={`bm-add-menu__swatch${color === c.hex ? ' bm-add-menu__swatch--active' : ''}`}
              style={{ backgroundColor: c.hex }}
              onClick={() => setColor(c.hex)}
              title={c.name}
            />
          ))}
        </div>
      </div>

      <button
        className="bm-add-menu__place-btn"
        onClick={() => onAdd({ type, size, color })}
      >
        Place Template
      </button>
    </div>
  );
}

// ── Template SVG shape ────────────────────────────────────────────────────────

function TemplateShape({
  template,
  gridCellSize,
  gridOffsetX,
  gridOffsetY,
  isSelected,
  isDragging,
  dragCell,
  displayRotation,
  onPointerDown,
  onRotateHandlePointerDown,
}: {
  template: MapTemplate;
  gridCellSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
  isSelected: boolean;
  isDragging: boolean;
  dragCell: { col: number; row: number } | null;
  displayRotation: number;
  onPointerDown: (e: React.PointerEvent, t: MapTemplate) => void;
  onRotateHandlePointerDown: (e: React.PointerEvent, t: MapTemplate) => void;
}) {
  const col = isDragging && dragCell ? dragCell.col : template.col;
  const row = isDragging && dragCell ? dragCell.row : template.row;
  const ox = gridOffsetX + (col + 0.5) * gridCellSize;
  const oy = gridOffsetY + (row + 0.5) * gridCellSize;
  const rot = displayRotation * (Math.PI / 180);
  const r = (template.size / 5) * gridCellSize;
  const { color } = template;
  const fillOpacity = isSelected ? 0.38 : 0.22;
  const strokeW = isSelected ? 2.5 : 1.5;
  const handleR = Math.max(6, gridCellSize * 0.09);

  let shapeEl: React.ReactElement;
  let handleX = ox, handleY = oy;
  let showHandle = false;

  switch (template.type) {
    case 'circle': {
      shapeEl = (
        <circle cx={ox} cy={oy} r={r}
          fill={color} fillOpacity={fillOpacity}
          stroke={color} strokeWidth={strokeW} strokeOpacity={0.9}
          className="bm-template__shape"
        />
      );
      break;
    }
    case 'cone': {
      const x1 = ox + r * Math.cos(rot - Math.PI / 4);
      const y1 = oy + r * Math.sin(rot - Math.PI / 4);
      const x2 = ox + r * Math.cos(rot + Math.PI / 4);
      const y2 = oy + r * Math.sin(rot + Math.PI / 4);
      shapeEl = (
        <path
          d={`M ${ox} ${oy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
          fill={color} fillOpacity={fillOpacity}
          stroke={color} strokeWidth={strokeW} strokeOpacity={0.9}
          className="bm-template__shape"
        />
      );
      handleX = ox + r * Math.cos(rot);
      handleY = oy + r * Math.sin(rot);
      showHandle = true;
      break;
    }
    case 'line': {
      const hw = gridCellSize / 2;
      const perp = rot + Math.PI / 2;
      const ex = ox + Math.cos(rot) * r;
      const ey = oy + Math.sin(rot) * r;
      shapeEl = (
        <path
          d={`M ${ox + Math.cos(perp) * hw} ${oy + Math.sin(perp) * hw}` +
             ` L ${ox - Math.cos(perp) * hw} ${oy - Math.sin(perp) * hw}` +
             ` L ${ex - Math.cos(perp) * hw} ${ey - Math.sin(perp) * hw}` +
             ` L ${ex + Math.cos(perp) * hw} ${ey + Math.sin(perp) * hw} Z`}
          fill={color} fillOpacity={fillOpacity}
          stroke={color} strokeWidth={strokeW} strokeOpacity={0.9}
          className="bm-template__shape"
        />
      );
      handleX = ex;
      handleY = ey;
      showHandle = true;
      break;
    }
    case 'cube': {
      const hw = r / 2;
      const rc = (cx: number, cy: number): [number, number] => [
        ox + cx * Math.cos(rot) - cy * Math.sin(rot),
        oy + cx * Math.sin(rot) + cy * Math.cos(rot),
      ];
      const [c0, c1, c2, c3] = [rc(-hw, -hw), rc(hw, -hw), rc(hw, hw), rc(-hw, hw)];
      shapeEl = (
        <path
          d={`M ${c0[0]} ${c0[1]} L ${c1[0]} ${c1[1]} L ${c2[0]} ${c2[1]} L ${c3[0]} ${c3[1]} Z`}
          fill={color} fillOpacity={fillOpacity}
          stroke={color} strokeWidth={strokeW} strokeOpacity={0.9}
          className="bm-template__shape"
        />
      );
      handleX = c1[0];
      handleY = c1[1];
      showHandle = true;
      break;
    }
  }

  return (
    <g
      className={`bm-template${isSelected ? ' bm-template--selected' : ''}`}
      onPointerDown={(e) => onPointerDown(e, template)}
      style={{
        cursor: 'move',
        filter: isSelected
          ? `drop-shadow(0 0 ${Math.max(4, gridCellSize * 0.08)}px ${color}99)`
          : undefined,
      }}
    >
      {shapeEl!}
      {showHandle && !isPlayerMode && (
        <circle
          cx={handleX} cy={handleY} r={handleR}
          fill="#fff" fillOpacity={0.92}
          stroke={color} strokeWidth={2}
          className="bm-template__handle"
          onPointerDown={(e) => onRotateHandlePointerDown(e, template)}
          style={{ cursor: 'grab' }}
        />
      )}
    </g>
  );
}

// ── Light source presets ─────────────────────────────────────────────────────

const LIGHT_PRESETS = [
  { label: 'Torch',    bright: 20, dim: 20 },
  { label: 'Lantern',  bright: 30, dim: 30 },
  { label: 'Candle',   bright: 5,  dim: 5  },
  { label: 'Daylight', bright: 60, dim: 60 },
];

// ── Lighting panel (unified dropdown) ────────────────────────────────────────

function LightingPanel({
  tokens,
  lightingEnabled,
  ambientLightDefault,
  lightBrushType,
  lightBrushSize,
  lightMaskMode,
  onSetLightingEnabled,
  onSetAmbientLightDefault,
  onSetBrushType,
  onSetBrushSize,
  onSetMaskMode,
  onAddLightSource,
  style,
}: {
  tokens: MapToken[];
  lightingEnabled: boolean;
  ambientLightDefault: AmbientLightLevel;
  lightBrushType: 'bright' | 'dim' | 'dark' | 'erase';
  lightBrushSize: number;
  lightMaskMode: boolean;
  onSetLightingEnabled: (v: boolean) => void;
  onSetAmbientLightDefault: (v: AmbientLightLevel) => void;
  onSetBrushType: (v: 'bright' | 'dim' | 'dark' | 'erase') => void;
  onSetBrushSize: (v: number) => void;
  onSetMaskMode: (v: boolean) => void;
  onAddLightSource: (opts: { label: string; brightRadius: number; dimRadius: number; attachedTokenId?: string }) => void;
  style?: React.CSSProperties;
}) {
  const [srcLabel, setSrcLabel] = useState('Torch');
  const [srcBright, setSrcBright] = useState(20);
  const [srcDim, setSrcDim] = useState(20);
  const [attachTo, setAttachTo] = useState('');

  const AMBIENT_LEVELS: { value: AmbientLightLevel; label: string; icon: string }[] = [
    { value: 'bright', label: 'Bright', icon: '\u2600' },
    { value: 'dim',    label: 'Dim',    icon: '\u263D' },
    { value: 'dark',   label: 'Dark',   icon: '\u2B24' },
  ];

  const BRUSH_TYPES: { value: typeof lightBrushType; label: string; desc: string }[] = [
    { value: 'bright', label: 'Bright', desc: 'Full light' },
    { value: 'dim',    label: 'Dim',    desc: 'Half light' },
    { value: 'dark',   label: 'Dark',   desc: 'Darkness' },
    { value: 'erase',  label: 'Erase',  desc: 'Reset to default' },
  ];

  return (
    <div className="bm-add-menu bm-light-panel" style={style} onClick={(e) => e.stopPropagation()}>
      {/* ── Enable ── */}
      <div className="bm-add-menu__section">
        <label className="bm-light-panel__enable">
          <input type="checkbox" checked={lightingEnabled} onChange={(e) => onSetLightingEnabled(e.target.checked)} />
          <span className="bm-light-panel__enable-label">Enable Lighting</span>
        </label>
      </div>

      {/* ── Ambient Default ── */}
      <div className="bm-add-menu__section">
        <div className="bm-add-menu__heading">Map Default</div>
        <div className="bm-light-panel__ambient-row">
          {AMBIENT_LEVELS.map((lvl) => (
            <button
              key={lvl.value}
              className={`bm-light-panel__ambient-btn${ambientLightDefault === lvl.value ? ' bm-light-panel__ambient-btn--active' : ''}`}
              onClick={() => onSetAmbientLightDefault(lvl.value)}
            >
              <span className="bm-light-panel__ambient-icon">{lvl.icon}</span>
              <span>{lvl.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Paint Brush ── */}
      <div className="bm-add-menu__section">
        <div className="bm-add-menu__heading">Paint Brush</div>
        <div className="bm-light-panel__brush-grid">
          {BRUSH_TYPES.map((b) => (
            <button
              key={b.value}
              className={`bm-light-panel__brush-btn${lightBrushType === b.value && !lightMaskMode ? ' bm-light-panel__brush-btn--active' : ''}`}
              onClick={() => { onSetBrushType(b.value); onSetMaskMode(false); }}
            >
              <span className="bm-light-panel__brush-name">{b.label}</span>
              <span className="bm-light-panel__brush-desc">{b.desc}</span>
            </button>
          ))}
        </div>
        <div className="bm-light-panel__brush-options">
          <button
            className={`bm-light-panel__mask-btn${lightMaskMode ? ' bm-light-panel__mask-btn--active' : ''}`}
            onClick={() => onSetMaskMode(!lightMaskMode)}
            title="Paint walls that block light sources. Shift+click to remove."
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M2 5h10M5 2v10" stroke="currentColor" strokeWidth="1" opacity="0.5"/></svg>
            <span>Wall Mask</span>
          </button>
          <div className="bm-light-panel__size">
            <span>Size</span>
            <input
              type="number"
              min={1}
              max={50}
              step={1}
              value={lightBrushSize}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 1 && v <= 50) onSetBrushSize(v);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className="bm-add-menu__ft-input"
            />
          </div>
        </div>
      </div>

      {/* ── Place Light Source ── */}
      <div className="bm-add-menu__section">
        <div className="bm-add-menu__heading">Place Light Source</div>
        <div className="bm-light-panel__presets">
          {LIGHT_PRESETS.map((p) => (
            <button
              key={p.label}
              className={`bm-light-panel__preset${srcLabel === p.label && srcBright === p.bright && srcDim === p.dim ? ' bm-light-panel__preset--active' : ''}`}
              onClick={() => { setSrcLabel(p.label); setSrcBright(p.bright); setSrcDim(p.dim); }}
            >
              <span className="bm-light-panel__preset-icon">{'\uD83D\uDD25'}</span>
              <span className="bm-light-panel__preset-name">{p.label}</span>
              <span className="bm-light-panel__preset-radii">{p.bright}/{p.dim} ft</span>
            </button>
          ))}
        </div>
        <div className="bm-light-panel__custom">
          <input
            className="bm-add-menu__input"
            placeholder="Label..."
            value={srcLabel}
            onChange={(e) => setSrcLabel(e.target.value)}
            maxLength={12}
          />
          <div className="bm-light-panel__radii">
            <label>
              <span>Bright</span>
              <input type="number" min={0} max={120} step={5} value={srcBright} onChange={(e) => setSrcBright(parseInt(e.target.value, 10) || 0)} className="bm-add-menu__ft-input" />
              <span className="bm-light-panel__unit">ft</span>
            </label>
            <label>
              <span>Dim</span>
              <input type="number" min={0} max={120} step={5} value={srcDim} onChange={(e) => setSrcDim(parseInt(e.target.value, 10) || 0)} className="bm-add-menu__ft-input" />
              <span className="bm-light-panel__unit">ft</span>
            </label>
          </div>
          {tokens.length > 0 && (
            <div className="bm-light-panel__attach">
              <label>Attach to token</label>
              <select value={attachTo} onChange={(e) => setAttachTo(e.target.value)} className="bm-add-menu__select">
                <option value="">None</option>
                {tokens.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      <button
        className="bm-add-menu__place-btn bm-add-menu__place-btn--amber"
        onClick={() => {
          onAddLightSource({
            label: srcLabel || 'Light',
            brightRadius: srcBright,
            dimRadius: srcDim,
            attachedTokenId: attachTo || undefined,
          });
        }}
      >
        Place Light Source
      </button>
    </div>
  );
}

// ── BattleMap component ───────────────────────────────────────────────────────

export function BattleMap() {
  const {
    mapImage, tokens, templates,
    gridCellSize, gridOffsetX, gridOffsetY, gridVisible, gridColor,
    fogEnabled, fogRevealed, pendingMove,
    lightingEnabled, ambientLightDefault, ambientLightCells, lightSources, lightMaskCells,
    setMapImage, addToken, moveToken, removeToken,
    addTemplate, updateTemplate, removeTemplate,
    updateGridConfig, clearMap,
    setFogEnabled, revealFog, coverFog, setPendingMove,
    setLightingEnabled, setAmbientLightDefault,
    paintAmbientLight, clearAmbientLight,
    addLightSource, moveLightSource, removeLightSource,
    maskLight, unmaskLight,
  } = useBattleMapStore();
  const { characters } = useStore();

  // ── View state ──
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  // ── Interaction state ──
  const [dragTokenId, setDragTokenId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [measureStart, setMeasureStart] = useState<{ col: number; row: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ col: number; row: number } | null>(null);

  // ── Template interaction state ──
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [dragTemplateId, setDragTemplateId] = useState<string | null>(null);
  const [dragTemplateCell, setDragTemplateCell] = useState<{ col: number; row: number } | null>(null);
  const [rotationPreview, setRotationPreview] = useState<{ id: string; angle: number } | null>(null);
  const [showAoeMenu, setShowAoeMenu] = useState(false);

  // ── Fog of war state ──
  const [fogMode, setFogMode] = useState(false);
  const [fogBrushSize, setFogBrushSize] = useState(1);
  const [fogBrushPreview, setFogBrushPreview] = useState<string[]>([]);

  // ── Lighting state ──
  const [lightMode, setLightMode] = useState(false);
  const [lightBrushSize, setLightBrushSize] = useState(1);
  const [lightBrushType, setLightBrushType] = useState<'bright' | 'dim' | 'dark' | 'erase'>('bright');
  const [lightBrushPreview, setLightBrushPreview] = useState<string[]>([]);
  const [lightMaskMode, setLightMaskMode] = useState(false);
  const [showLightPanel, setShowLightPanel] = useState(false);
  const [lightPanelAnchor, setLightPanelAnchor] = useState<{ top: number; left: number } | null>(null);
  const [selectedLightSourceId, setSelectedLightSourceId] = useState<string | null>(null);
  const [dragLightSourceId, setDragLightSourceId] = useState<string | null>(null);
  const [dragLightPos, setDragLightPos] = useState({ x: 0, y: 0 });
  const lightCanvasRef = useRef<HTMLCanvasElement>(null);
  const lightPreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const lightPanelWrapRef = useRef<HTMLDivElement>(null);

  // ── Battle mode (movement-limited dragging for PC tokens) ──
  const [battleMode, setBattleMode] = useState(false);
  const [activePcMove, setActivePcMove] = useState<{
    tokenId: string;
    originCol: number;
    originRow: number;
    speedFt: number;
    characterName: string;
  } | null>(null);
  const moveCanvasRef = useRef<HTMLCanvasElement>(null);

  // ── Confirm clear ──
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // ── Grid config panel ──
  const [showGridPanel, setShowGridPanel] = useState(false);
  const gridPanelRef = useRef<HTMLDivElement>(null);
  const [gridPanelAnchor, setGridPanelAnchor] = useState<{ top: number; left: number } | null>(null);

  // ── Refs ──
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMenuWrapRef = useRef<HTMLDivElement>(null);
  const [tokenMenuAnchor, setTokenMenuAnchor] = useState<{ top: number; left: number } | null>(null);
  const aoeMenuWrapRef = useRef<HTMLDivElement>(null);
  const [aoeMenuAnchor, setAoeMenuAnchor] = useState<{ top: number; left: number } | null>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement>(null);
  const fogPreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const measureCanvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef(1);
  const panXRef = useRef(0);
  const panYRef = useRef(0);
  const measureEndRef = useRef<{ col: number; row: number } | null>(null);
  const dragTemplateCellRef = useRef<{ col: number; row: number } | null>(null);
  const activeTouchesRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ dist: number; zoom: number; midX: number; midY: number } | null>(null);

  // ── Interaction ref ──
  const interactionRef = useRef<{
    type: 'none' | 'drag' | 'pan' | 'measure' | 'pinch' | 'template-drag' | 'template-rotate' | 'fog' | 'ghost-drag' | 'light-paint' | 'light-mask' | 'light-drag';
    tokenId: string | null;
    templateId: string | null;
    fogStrokeAction: 'reveal' | 'cover';
    fogStrokeCells: Set<string>;
    lightStrokeCells: Set<string>;
    lightSourceId: string | null;
    startPointerX: number;
    startPointerY: number;
    startTokenX: number;
    startTokenY: number;
    startPanX: number;
    startPanY: number;
    currentDragX: number;
    currentDragY: number;
    templateWorldX: number;
    templateWorldY: number;
    templateOriginX: number;
    templateOriginY: number;
  }>({
    type: 'none', tokenId: null, templateId: null,
    fogStrokeAction: 'reveal' as const, fogStrokeCells: new Set<string>(),
    lightStrokeCells: new Set<string>(), lightSourceId: null as string | null,
    startPointerX: 0, startPointerY: 0,
    startTokenX: 0, startTokenY: 0,
    startPanX: 0, startPanY: 0,
    currentDragX: 0, currentDragY: 0,
    templateWorldX: 0, templateWorldY: 0,
    templateOriginX: 0, templateOriginY: 0,
  });

  // Keep refs in sync with state
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panXRef.current = panX; }, [panX]);
  useEffect(() => { panYRef.current = panY; }, [panY]);

  // ── Helpers ──

  function tokenWorldPos(token: MapToken) {
    return {
      x: gridOffsetX + token.col * gridCellSize,
      y: gridOffsetY + token.row * gridCellSize,
    };
  }

  function getCellsInBrush(col: number, row: number, size: number): string[] {
    const cells: string[] = [];
    const r = (size - 1) / 2;
    for (let dc = -Math.ceil(r); dc <= Math.ceil(r); dc++) {
      for (let dr = -Math.ceil(r); dr <= Math.ceil(r); dr++) {
        if (Math.sqrt(dc * dc + dr * dr) <= r + 0.5) {
          cells.push(`${col + dc},${row + dr}`);
        }
      }
    }
    return cells;
  }

  function getLightPos(ls: MapLightSource) {
    if (ls.attachedTokenId) {
      const t = tokens.find((tk) => tk.id === ls.attachedTokenId);
      if (t) return { col: t.col, row: t.row };
    }
    return { col: ls.col, row: ls.row };
  }

  function templateOriginWorld(t: MapTemplate) {
    return {
      x: gridOffsetX + (t.col + 0.5) * gridCellSize,
      y: gridOffsetY + (t.row + 0.5) * gridCellSize,
    };
  }

  function snapToGrid(worldX: number, worldY: number, step = 1) {
    const invStep = 1 / step;
    return {
      col: Math.round((worldX - gridOffsetX) / gridCellSize * invStep) / invStep,
      row: Math.round((worldY - gridOffsetY) / gridCellSize * invStep) / invStep,
    };
  }

  function screenToCell(clientX: number, clientY: number) {
    const rect = viewportRef.current!.getBoundingClientRect();
    const worldX = (clientX - rect.left - panXRef.current) / zoomRef.current;
    const worldY = (clientY - rect.top - panYRef.current) / zoomRef.current;
    return {
      col: Math.floor((worldX - gridOffsetX) / gridCellSize),
      row: Math.floor((worldY - gridOffsetY) / gridCellSize),
    };
  }

  function screenToWorld(clientX: number, clientY: number) {
    const rect = viewportRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panXRef.current) / zoomRef.current,
      y: (clientY - rect.top - panYRef.current) / zoomRef.current,
    };
  }

  function viewportCenter() {
    if (!viewportRef.current) return { col: 0, row: 0 };
    const rect = viewportRef.current.getBoundingClientRect();
    const worldX = (rect.width / 2 - panXRef.current) / zoomRef.current;
    const worldY = (rect.height / 2 - panYRef.current) / zoomRef.current;
    return snapToGrid(worldX, worldY);
  }

  // ── Fit to view ──

  function fitToViewWithSize(w: number, h: number) {
    if (!viewportRef.current || !w || !h) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const pad = 20;
    const scaleX = (rect.width - pad * 2) / w;
    const scaleY = (rect.height - pad * 2) / h;
    const newZoom = Math.min(scaleX, scaleY);
    const newPanX = (rect.width - w * newZoom) / 2;
    const newPanY = (rect.height - h * newZoom) / 2;
    setZoom(newZoom); zoomRef.current = newZoom;
    setPanX(newPanX); panXRef.current = newPanX;
    setPanY(newPanY); panYRef.current = newPanY;
  }

  function fitToView() { fitToViewWithSize(imgSize.w, imgSize.h); }

  function zoomBy(factor: number) {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    const currentZoom = zoomRef.current;
    const newZoom = Math.max(0.02, Math.min(20, currentZoom * factor));
    const wx = (cx - panXRef.current) / currentZoom;
    const wy = (cy - panYRef.current) / currentZoom;
    const newPanX = cx - wx * newZoom;
    const newPanY = cy - wy * newZoom;
    zoomRef.current = newZoom; panXRef.current = newPanX; panYRef.current = newPanY;
    setZoom(newZoom); setPanX(newPanX); setPanY(newPanY);
  }

  // ── Image upload ──

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
        setMapImage(dataUrl);
        requestAnimationFrame(() => fitToViewWithSize(img.naturalWidth, img.naturalHeight));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const w = img.naturalWidth, h = img.naturalHeight;
    if (imgSize.w !== w || imgSize.h !== h) setImgSize({ w, h });
    fitToViewWithSize(w, h);
  }

  // ── Grid canvas rendering ──

  useEffect(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas || !imgSize.w || !imgSize.h) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== imgSize.w) canvas.width = imgSize.w;
    if (canvas.height !== imgSize.h) canvas.height = imgSize.h;
    ctx.clearRect(0, 0, imgSize.w, imgSize.h);
    if (!gridVisible) return;

    const offX = ((gridOffsetX % gridCellSize) + gridCellSize) % gridCellSize;
    const offY = ((gridOffsetY % gridCellSize) + gridCellSize) % gridCellSize;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = offX; x <= imgSize.w + gridCellSize; x += gridCellSize) {
      ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, imgSize.h);
    }
    for (let y = offY; y <= imgSize.h + gridCellSize; y += gridCellSize) {
      ctx.moveTo(0, y + 0.5); ctx.lineTo(imgSize.w, y + 0.5);
    }
    ctx.stroke();

    ctx.strokeStyle = gridColor + 'cc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = offX; x <= imgSize.w + gridCellSize; x += gridCellSize) {
      ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, imgSize.h);
    }
    for (let y = offY; y <= imgSize.h + gridCellSize; y += gridCellSize) {
      ctx.moveTo(0, y + 0.5); ctx.lineTo(imgSize.w, y + 0.5);
    }
    ctx.stroke();
  }, [imgSize, gridCellSize, gridOffsetX, gridOffsetY, gridVisible, gridColor]);

  // ── Fog of war canvas rendering ──

  useEffect(() => {
    const canvas = fogCanvasRef.current;
    if (!canvas || !imgSize.w || !imgSize.h) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== imgSize.w) canvas.width = imgSize.w;
    if (canvas.height !== imgSize.h) canvas.height = imgSize.h;
    ctx.clearRect(0, 0, imgSize.w, imgSize.h);

    if (!fogEnabled) return;

    // Fill entire canvas with fog
    ctx.fillStyle = isPlayerMode ? 'rgba(0, 0, 0, 1.0)' : 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, imgSize.w, imgSize.h);

    // Punch holes for revealed cells
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    for (const key of fogRevealed) {
      const sep = key.indexOf(',');
      const col = parseInt(key.substring(0, sep), 10);
      const row = parseInt(key.substring(sep + 1), 10);
      ctx.fillRect(
        gridOffsetX + col * gridCellSize,
        gridOffsetY + row * gridCellSize,
        gridCellSize,
        gridCellSize,
      );
    }
    ctx.globalCompositeOperation = 'source-over';
  }, [fogEnabled, fogRevealed, imgSize, gridCellSize, gridOffsetX, gridOffsetY]);

  // ── Fog brush preview canvas ──

  useEffect(() => {
    const canvas = fogPreviewCanvasRef.current;
    if (!canvas || !imgSize.w || !imgSize.h || isPlayerMode) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== imgSize.w) canvas.width = imgSize.w;
    if (canvas.height !== imgSize.h) canvas.height = imgSize.h;
    ctx.clearRect(0, 0, imgSize.w, imgSize.h);

    if (!fogMode || fogBrushPreview.length === 0) return;

    ctx.fillStyle = 'rgba(100, 200, 255, 0.25)';
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
    ctx.lineWidth = 1;
    for (const key of fogBrushPreview) {
      const sep = key.indexOf(',');
      const col = parseInt(key.substring(0, sep), 10);
      const row = parseInt(key.substring(sep + 1), 10);
      const x = gridOffsetX + col * gridCellSize;
      const y = gridOffsetY + row * gridCellSize;
      ctx.fillRect(x, y, gridCellSize, gridCellSize);
      ctx.strokeRect(x + 0.5, y + 0.5, gridCellSize - 1, gridCellSize - 1);
    }
  }, [fogMode, fogBrushPreview, imgSize, gridCellSize, gridOffsetX, gridOffsetY]);

  // ── Light canvas rendering ──

  useEffect(() => {
    const canvas = lightCanvasRef.current;
    if (!canvas || !imgSize.w || !imgSize.h) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== imgSize.w) canvas.width = imgSize.w;
    if (canvas.height !== imgSize.h) canvas.height = imgSize.h;
    ctx.clearRect(0, 0, imgSize.w, imgSize.h);

    if (!lightingEnabled) return;

    // Build ambient override map
    const ambientMap = new Map<string, AmbientLightLevel>();
    for (const entry of ambientLightCells) {
      const colonIdx = entry.lastIndexOf(':');
      if (colonIdx > 0) {
        ambientMap.set(entry.substring(0, colonIdx), entry.substring(colonIdx + 1) as AmbientLightLevel);
      }
    }

    // Build mask set
    const maskSet = new Set(lightMaskCells);

    // Build light source contributions
    const lightMap = new Map<string, 'bright' | 'dim'>();
    for (const ls of lightSources) {
      const pos = getLightPos(ls);
      const brightCells = Math.ceil(ls.brightRadius / 5);
      const dimCells = Math.ceil((ls.brightRadius + ls.dimRadius) / 5);
      for (let dc = -dimCells; dc <= dimCells; dc++) {
        for (let dr = -dimCells; dr <= dimCells; dr++) {
          const dist = Math.sqrt(dc * dc + dr * dr);
          const cellKey = `${pos.col + dc},${pos.row + dr}`;
          if (maskSet.has(cellKey)) continue;
          if (dist <= brightCells + 0.5) {
            lightMap.set(cellKey, 'bright');
          } else if (dist <= dimCells + 0.5) {
            const existing = lightMap.get(cellKey);
            if (existing !== 'bright') lightMap.set(cellKey, 'dim');
          }
        }
      }
    }

    // Determine map bounds
    const cols = Math.ceil(imgSize.w / gridCellSize) + 1;
    const rows = Math.ceil(imgSize.h / gridCellSize) + 1;
    const startCol = Math.floor(-gridOffsetX / gridCellSize);
    const startRow = Math.floor(-gridOffsetY / gridCellSize);

    const LEVEL_ORDER = { bright: 2, dim: 1, dark: 0 };

    const dimColor = isPlayerMode ? 'rgba(0, 0, 40, 0.35)' : 'rgba(0, 0, 40, 0.18)';
    const darkColor = isPlayerMode ? 'rgba(0, 0, 20, 0.6)' : 'rgba(0, 0, 20, 0.3)';

    for (let c = startCol; c < startCol + cols; c++) {
      for (let r = startRow; r < startRow + rows; r++) {
        const key = `${c},${r}`;
        const ambient: AmbientLightLevel = ambientMap.get(key) || ambientLightDefault;
        const lightContrib = lightMap.get(key);

        // Final level = brightest of ambient and light source
        let finalLevel: AmbientLightLevel = ambient;
        if (lightContrib && LEVEL_ORDER[lightContrib] > LEVEL_ORDER[finalLevel]) {
          finalLevel = lightContrib === 'bright' ? 'bright' : 'dim';
        }

        if (finalLevel === 'bright') continue;

        ctx.fillStyle = finalLevel === 'dim' ? dimColor : darkColor;
        ctx.fillRect(
          gridOffsetX + c * gridCellSize,
          gridOffsetY + r * gridCellSize,
          gridCellSize,
          gridCellSize,
        );
      }
    }
    // DM-only: draw hatching on masked cells so the DM can see where walls are
    if (!isPlayerMode && lightMode && maskSet.size > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.35)';
      ctx.lineWidth = 1;
      for (const key of maskSet) {
        const sep = key.indexOf(',');
        const mc = parseInt(key.substring(0, sep), 10);
        const mr = parseInt(key.substring(sep + 1), 10);
        const x = gridOffsetX + mc * gridCellSize;
        const y = gridOffsetY + mr * gridCellSize;
        // Diagonal hatching
        ctx.beginPath();
        const step = Math.max(6, gridCellSize / 5);
        for (let d = -gridCellSize; d < gridCellSize * 2; d += step) {
          ctx.moveTo(x + d, y);
          ctx.lineTo(x + d + gridCellSize, y + gridCellSize);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [lightingEnabled, lightMode, ambientLightDefault, ambientLightCells, lightSources, lightMaskCells, tokens, imgSize, gridCellSize, gridOffsetX, gridOffsetY]);

  // ── Light brush preview canvas ──

  useEffect(() => {
    const canvas = lightPreviewCanvasRef.current;
    if (!canvas || !imgSize.w || !imgSize.h || isPlayerMode) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== imgSize.w) canvas.width = imgSize.w;
    if (canvas.height !== imgSize.h) canvas.height = imgSize.h;
    ctx.clearRect(0, 0, imgSize.w, imgSize.h);

    if (!lightMode || lightBrushPreview.length === 0) return;

    const isMask = lightMaskMode;
    ctx.fillStyle = isMask ? 'rgba(255, 80, 80, 0.25)' : 'rgba(255, 200, 80, 0.25)';
    ctx.strokeStyle = isMask ? 'rgba(255, 80, 80, 0.6)' : 'rgba(255, 200, 80, 0.6)';
    ctx.lineWidth = 1;
    for (const key of lightBrushPreview) {
      const sep = key.indexOf(',');
      const col = parseInt(key.substring(0, sep), 10);
      const row = parseInt(key.substring(sep + 1), 10);
      const x = gridOffsetX + col * gridCellSize;
      const y = gridOffsetY + row * gridCellSize;
      ctx.fillRect(x, y, gridCellSize, gridCellSize);
      ctx.strokeRect(x + 0.5, y + 0.5, gridCellSize - 1, gridCellSize - 1);
    }
  }, [lightMode, lightMaskMode, lightBrushPreview, imgSize, gridCellSize, gridOffsetX, gridOffsetY]);

  // ── Measure canvas rendering ──

  useEffect(() => {
    const canvas = measureCanvasRef.current;
    if (!canvas || !imgSize.w || !imgSize.h) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== imgSize.w) canvas.width = imgSize.w;
    if (canvas.height !== imgSize.h) canvas.height = imgSize.h;
    ctx.clearRect(0, 0, imgSize.w, imgSize.h);

    if (!measureStart || !measureEnd) return;

    const sx = gridOffsetX + (measureStart.col + 0.5) * gridCellSize;
    const sy = gridOffsetY + (measureStart.row + 0.5) * gridCellSize;
    const ex = gridOffsetX + (measureEnd.col + 0.5) * gridCellSize;
    const ey = gridOffsetY + (measureEnd.row + 0.5) * gridCellSize;

    const dx = measureEnd.col - measureStart.col;
    const dy = measureEnd.row - measureStart.row;
    const distFt = Math.round(Math.sqrt(dx * dx + dy * dy) * 5);
    const squares = Math.max(Math.abs(dx), Math.abs(dy));
    const label = `${distFt} ft  (${squares} sq)`;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 4;
    ctx.setLineDash([Math.max(6, gridCellSize * 0.1), Math.max(3, gridCellSize * 0.05)]);
    ctx.strokeStyle = 'rgba(255, 80, 80, 0.95)';
    ctx.lineWidth = Math.max(2, gridCellSize * 0.04);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 80, 80, 0.95)';
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(4, gridCellSize * 0.08), 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 80, 80, 0.95)';
    ctx.lineWidth = Math.max(2, gridCellSize * 0.04);
    ctx.beginPath();
    ctx.arc(ex, ey, Math.max(5, gridCellSize * 0.1), 0, Math.PI * 2);
    ctx.stroke();

    const fontSize = Math.max(13, gridCellSize * 0.22);
    ctx.font = `bold ${fontSize}px Cinzel, Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2 - fontSize * 0.8;
    const metrics = ctx.measureText(label);
    const pad = fontSize * 0.35;

    ctx.fillStyle = 'rgba(14, 12, 10, 0.82)';
    const rx = mx - metrics.width / 2 - pad;
    const ry = my - fontSize * 0.6 - pad * 0.5;
    const rw = metrics.width + pad * 2;
    const rh = fontSize * 1.2 + pad;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, rh / 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 80, 80, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.fillText(label, mx, my);
    ctx.restore();
  }, [measureStart, measureEnd, imgSize, gridCellSize, gridOffsetX, gridOffsetY]);

  // ── Move mode canvas rendering (movement range + path line) ──

  useEffect(() => {
    const canvas = moveCanvasRef.current;
    if (!canvas || !imgSize.w || !imgSize.h) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== imgSize.w) canvas.width = imgSize.w;
    if (canvas.height !== imgSize.h) canvas.height = imgSize.h;
    ctx.clearRect(0, 0, imgSize.w, imgSize.h);

    // Use local moveMode for DM, or pendingMove for players
    const pm = pendingMove;
    if (!pm) return;

    const originX = gridOffsetX + (pm.originCol + 0.5) * gridCellSize;
    const originY = gridOffsetY + (pm.originRow + 0.5) * gridCellSize;
    const destX = gridOffsetX + (pm.destCol + 0.5) * gridCellSize;
    const destY = gridOffsetY + (pm.destRow + 0.5) * gridCellSize;
    const radiusPx = (pm.speedFt / 5) * gridCellSize;

    // Draw movement range circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(originX, originY, radiusPx, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(80, 180, 255, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(80, 180, 255, 0.45)';
    ctx.lineWidth = Math.max(2, gridCellSize * 0.04);
    ctx.setLineDash([Math.max(6, gridCellSize * 0.1), Math.max(3, gridCellSize * 0.05)]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw path line from origin to dest
    if (pm.destCol !== pm.originCol || pm.destRow !== pm.originRow) {
      const dx = pm.destCol - pm.originCol;
      const dy = pm.destRow - pm.originRow;
      const ratio = Math.sqrt(dx * dx + dy * dy) * 5 / pm.speedFt;

      // Color based on movement usage
      const pathColor = ratio > 1 ? 'rgba(220, 80, 80, 0.8)'
        : ratio > 0.75 ? 'rgba(220, 180, 60, 0.8)'
        : 'rgba(80, 220, 120, 0.8)';

      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(destX, destY);
      ctx.strokeStyle = pathColor;
      ctx.lineWidth = Math.max(3, gridCellSize * 0.06);
      ctx.setLineDash([Math.max(8, gridCellSize * 0.12), Math.max(4, gridCellSize * 0.06)]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Origin dot
      ctx.fillStyle = pathColor;
      ctx.beginPath();
      ctx.arc(originX, originY, Math.max(5, gridCellSize * 0.1), 0, Math.PI * 2);
      ctx.fill();

      // Destination dot
      ctx.strokeStyle = pathColor;
      ctx.lineWidth = Math.max(2, gridCellSize * 0.04);
      ctx.beginPath();
      ctx.arc(destX, destY, Math.max(6, gridCellSize * 0.12), 0, Math.PI * 2);
      ctx.stroke();

    }

    ctx.restore();
  }, [pendingMove, imgSize, gridCellSize, gridOffsetX, gridOffsetY]);

  // ── Zoom (non-passive wheel) ──

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const currentZoom = zoomRef.current;
      const factor = e.ctrlKey
        ? 1 - e.deltaY * 0.01
        : e.deltaY > 0 ? 0.92 : 1 / 0.92;
      const newZoom = Math.max(0.02, Math.min(20, currentZoom * factor));
      const rect = el!.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      const wx = (cx - panXRef.current) / currentZoom;
      const wy = (cy - panYRef.current) / currentZoom;
      zoomRef.current = newZoom;
      panXRef.current = cx - wx * newZoom;
      panYRef.current = cy - wy * newZoom;
      setZoom(newZoom); setPanX(panXRef.current); setPanY(panYRef.current);
    }

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ── Token drag ──

  function handleTokenPointerDown(e: React.PointerEvent, token: MapToken) {
    e.stopPropagation();
    e.preventDefault();
    if (isPlayerMode) return;

    // Cancel active move if clicking a different token
    if (activePcMove && token.id !== activePcMove.tokenId) {
      handleCancelMove();
    }

    // In battle mode, PC token drag auto-enters movement mode
    if (battleMode && token.characterId && !activePcMove) {
      const ch = characters.find((c) => c.id === token.characterId);
      if (ch) {
        const speedFt = ch.speed || 30;
        setActivePcMove({
          tokenId: token.id,
          originCol: token.col,
          originRow: token.row,
          speedFt,
          characterName: ch.name,
        });
        setPendingMove({
          tokenId: token.id,
          originCol: token.col,
          originRow: token.row,
          destCol: token.col,
          destRow: token.row,
          speedFt,
        });
      }
    }

    const pos = tokenWorldPos(token);
    interactionRef.current = {
      ...interactionRef.current,
      type: 'drag',
      tokenId: token.id,
      templateId: null,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startTokenX: pos.x,
      startTokenY: pos.y,
      currentDragX: pos.x,
      currentDragY: pos.y,
    };

    setDragTokenId(token.id);
    setDragPos(pos);
    setSelectedTokenId(token.id);
    setSelectedTemplateId(null);
    setShowAddMenu(false);
    setShowAoeMenu(false);

    viewportRef.current?.setPointerCapture(e.pointerId);
  }

  // ── Ghost token drag (adjust prospective position) ──

  function handleGhostPointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (isPlayerMode || !pendingMove || !activePcMove) return;

    const ghostWorldX = gridOffsetX + pendingMove.destCol * gridCellSize;
    const ghostWorldY = gridOffsetY + pendingMove.destRow * gridCellSize;

    interactionRef.current = {
      ...interactionRef.current,
      type: 'ghost-drag',
      tokenId: pendingMove.tokenId,
      templateId: null,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startTokenX: ghostWorldX,
      startTokenY: ghostWorldY,
      currentDragX: ghostWorldX,
      currentDragY: ghostWorldY,
    };

    setDragTokenId('__ghost__');
    setDragPos({ x: ghostWorldX, y: ghostWorldY });

    viewportRef.current?.setPointerCapture(e.pointerId);
  }

  // ── Template drag ──

  function handleTemplatePointerDown(e: React.PointerEvent, template: MapTemplate) {
    e.stopPropagation();
    e.preventDefault();
    if (isPlayerMode) return;

    const origin = templateOriginWorld(template);
    interactionRef.current = {
      ...interactionRef.current,
      type: 'template-drag',
      tokenId: null,
      templateId: template.id,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      templateWorldX: origin.x,
      templateWorldY: origin.y,
    };

    setDragTemplateId(template.id);
    setSelectedTemplateId(template.id);
    setSelectedTokenId(null);
    setShowAddMenu(false);
    setShowAoeMenu(false);

    viewportRef.current?.setPointerCapture(e.pointerId);
  }

  // ── Template rotation handle ──

  function handleRotateHandlePointerDown(e: React.PointerEvent, template: MapTemplate) {
    e.stopPropagation();
    e.preventDefault();
    if (isPlayerMode) return;

    const origin = templateOriginWorld(template);
    interactionRef.current = {
      ...interactionRef.current,
      type: 'template-rotate',
      tokenId: null,
      templateId: template.id,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      templateOriginX: origin.x,
      templateOriginY: origin.y,
    };

    viewportRef.current?.setPointerCapture(e.pointerId);
  }

  // ── Viewport pan / measure ──

  function handleViewportPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;

    activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    viewportRef.current?.setPointerCapture(e.pointerId);

    if (activeTouchesRef.current.size >= 2) {
      if (interactionRef.current.type === 'pan') setIsPanning(false);
      const pts = Array.from(activeTouchesRef.current.values());
      pinchStartRef.current = {
        dist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y),
        zoom: zoomRef.current,
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
      };
      interactionRef.current.type = 'pinch';
      return;
    }

    if (lightMode && !isPlayerMode) {
      const cell = screenToCell(e.clientX, e.clientY);
      const brushCells = getCellsInBrush(cell.col, cell.row, lightBrushSize);
      const iType = lightMaskMode ? 'light-mask' as const : 'light-paint' as const;
      interactionRef.current = {
        ...interactionRef.current,
        type: iType,
        tokenId: null,
        templateId: null,
        lightStrokeCells: new Set(brushCells),
      };
      if (lightMaskMode) {
        if (e.shiftKey) unmaskLight(brushCells);
        else maskLight(brushCells);
      } else {
        if (lightBrushType === 'erase') clearAmbientLight(brushCells);
        else paintAmbientLight(brushCells, lightBrushType);
      }
      return;
    }

    if (fogMode && !isPlayerMode) {
      const cell = screenToCell(e.clientX, e.clientY);
      const action = e.shiftKey ? 'cover' : 'reveal';
      const brushCells = getCellsInBrush(cell.col, cell.row, fogBrushSize);
      interactionRef.current = {
        ...interactionRef.current,
        type: 'fog',
        tokenId: null,
        templateId: null,
        fogStrokeAction: action,
        fogStrokeCells: new Set(brushCells),
      };
      if (action === 'reveal') revealFog(brushCells);
      else coverFog(brushCells);
      return;
    }

    if (measureMode) {
      const cell = screenToCell(e.clientX, e.clientY);
      setMeasureStart(cell);
      setMeasureEnd(cell);
      measureEndRef.current = cell;
      interactionRef.current = { ...interactionRef.current, type: 'measure' };
      return;
    }

    interactionRef.current = {
      ...interactionRef.current,
      type: 'pan',
      tokenId: null,
      templateId: null,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startPanX: panXRef.current,
      startPanY: panYRef.current,
    };

    setIsPanning(true);
    setSelectedTokenId(null);
    setSelectedTemplateId(null);
    setShowAddMenu(false);
    setShowAoeMenu(false);
    setShowGridPanel(false);
    if (activePcMove) handleCancelMove();
  }

  // ── Pointer move ──

  function handlePointerMove(e: React.PointerEvent) {
    const ix = interactionRef.current;

    if (activeTouchesRef.current.has(e.pointerId)) {
      activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (ix.type === 'pinch' && activeTouchesRef.current.size >= 2 && pinchStartRef.current) {
      const pts = Array.from(activeTouchesRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const prev = pinchStartRef.current;

      const newZoom = Math.max(0.02, Math.min(20, prev.zoom * (dist / prev.dist)));
      const rect = viewportRef.current!.getBoundingClientRect();
      const wx = (prev.midX - rect.left - panXRef.current) / zoomRef.current;
      const wy = (prev.midY - rect.top - panYRef.current) / zoomRef.current;
      const newPanX = (midX - rect.left) - wx * newZoom;
      const newPanY = (midY - rect.top) - wy * newZoom;

      zoomRef.current = newZoom; panXRef.current = newPanX; panYRef.current = newPanY;
      setZoom(newZoom); setPanX(newPanX); setPanY(newPanY);

      prev.dist = dist; prev.zoom = newZoom; prev.midX = midX; prev.midY = midY;

    } else if (ix.type === 'measure') {
      const cell = screenToCell(e.clientX, e.clientY);
      const prev = measureEndRef.current;
      if (!prev || prev.col !== cell.col || prev.row !== cell.row) {
        measureEndRef.current = cell;
        setMeasureEnd(cell);
      }

    } else if (ix.type === 'ghost-drag' && activePcMove && pendingMove) {
      const dx = (e.clientX - ix.startPointerX) / zoomRef.current;
      const dy = (e.clientY - ix.startPointerY) / zoomRef.current;
      ix.currentDragX = ix.startTokenX + dx;
      ix.currentDragY = ix.startTokenY + dy;
      setDragPos({ x: ix.currentDragX, y: ix.currentDragY });

      // Snap to grid and clamp to movement range
      const { col, row } = snapToGrid(ix.currentDragX, ix.currentDragY);
      const cdx = col - activePcMove.originCol;
      const cdy = row - activePcMove.originRow;
      const distFt = Math.sqrt(cdx * cdx + cdy * cdy) * 5;
      const maxCells = activePcMove.speedFt / 5;
      let destCol = col, destRow = row;
      if (distFt > activePcMove.speedFt && (cdx !== 0 || cdy !== 0)) {
        const dist = Math.sqrt(cdx * cdx + cdy * cdy);
        const scale = maxCells / dist;
        destCol = Math.round(activePcMove.originCol + cdx * scale);
        destRow = Math.round(activePcMove.originRow + cdy * scale);
      }
      setPendingMove({
        ...pendingMove,
        destCol,
        destRow,
      });

    } else if (ix.type === 'drag') {
      const dx = (e.clientX - ix.startPointerX) / zoomRef.current;
      const dy = (e.clientY - ix.startPointerY) / zoomRef.current;
      ix.currentDragX = ix.startTokenX + dx;
      ix.currentDragY = ix.startTokenY + dy;
      setDragPos({ x: ix.currentDragX, y: ix.currentDragY });

      // Live update pendingMove during battle mode drag
      if (activePcMove && ix.tokenId === activePcMove.tokenId && pendingMove) {
        const { col, row } = snapToGrid(ix.currentDragX, ix.currentDragY);
        const cdx = col - activePcMove.originCol;
        const cdy = row - activePcMove.originRow;
        const distFt = Math.sqrt(cdx * cdx + cdy * cdy) * 5;
        const maxCells = activePcMove.speedFt / 5;
        let destCol = col, destRow = row;
        if (distFt > activePcMove.speedFt && (cdx !== 0 || cdy !== 0)) {
          const dist = Math.sqrt(cdx * cdx + cdy * cdy);
          const scale = maxCells / dist;
          destCol = Math.round(activePcMove.originCol + cdx * scale);
          destRow = Math.round(activePcMove.originRow + cdy * scale);
        }
        setPendingMove({ ...pendingMove, destCol, destRow });
      }

    } else if (ix.type === 'template-drag') {
      const dx = (e.clientX - ix.startPointerX) / zoomRef.current;
      const dy = (e.clientY - ix.startPointerY) / zoomRef.current;
      const { col, row } = snapToGrid(ix.templateWorldX + dx, ix.templateWorldY + dy);
      const prev = dragTemplateCellRef.current;
      if (!prev || prev.col !== col || prev.row !== row) {
        dragTemplateCellRef.current = { col, row };
        setDragTemplateCell({ col, row });
      }

    } else if (ix.type === 'template-rotate') {
      const world = screenToWorld(e.clientX, e.clientY);
      const angle = Math.atan2(
        world.y - ix.templateOriginY,
        world.x - ix.templateOriginX,
      ) * (180 / Math.PI);
      setRotationPreview({ id: ix.templateId!, angle });

    } else if (ix.type === 'fog') {
      const cell = screenToCell(e.clientX, e.clientY);
      const brushCells = getCellsInBrush(cell.col, cell.row, fogBrushSize);
      const newCells = brushCells.filter((c) => !ix.fogStrokeCells.has(c));
      if (newCells.length > 0) {
        for (const c of newCells) ix.fogStrokeCells.add(c);
        if (ix.fogStrokeAction === 'reveal') revealFog(newCells);
        else coverFog(newCells);
      }

    } else if (ix.type === 'light-paint' || ix.type === 'light-mask') {
      const cell = screenToCell(e.clientX, e.clientY);
      const brushCells = getCellsInBrush(cell.col, cell.row, lightBrushSize);
      const newCells = brushCells.filter((c) => !ix.lightStrokeCells.has(c));
      if (newCells.length > 0) {
        for (const c of newCells) ix.lightStrokeCells.add(c);
        if (ix.type === 'light-mask') {
          if (e.shiftKey) unmaskLight(newCells);
          else maskLight(newCells);
        } else {
          if (lightBrushType === 'erase') clearAmbientLight(newCells);
          else paintAmbientLight(newCells, lightBrushType);
        }
      }

    } else if (ix.type === 'light-drag') {
      const dx = (e.clientX - ix.startPointerX) / zoomRef.current;
      const dy = (e.clientY - ix.startPointerY) / zoomRef.current;
      ix.currentDragX = ix.startTokenX + dx;
      ix.currentDragY = ix.startTokenY + dy;
      setDragLightPos({ x: ix.currentDragX, y: ix.currentDragY });

    } else if (ix.type === 'pan') {
      const newPanX = ix.startPanX + (e.clientX - ix.startPointerX);
      const newPanY = ix.startPanY + (e.clientY - ix.startPointerY);
      panXRef.current = newPanX; panYRef.current = newPanY;
      setPanX(newPanX); setPanY(newPanY);
    }

    // Update fog brush preview on hover
    if (fogMode && !isPlayerMode) {
      const cell = screenToCell(e.clientX, e.clientY);
      setFogBrushPreview(getCellsInBrush(cell.col, cell.row, fogBrushSize));
    }

    // Update light brush preview on hover
    if (lightMode && !isPlayerMode) {
      const cell = screenToCell(e.clientX, e.clientY);
      setLightBrushPreview(getCellsInBrush(cell.col, cell.row, lightBrushSize));
    }
  }

  // ── Pointer up ──

  function handlePointerUp(e: React.PointerEvent) {
    const ix = interactionRef.current;
    activeTouchesRef.current.delete(e.pointerId);
    viewportRef.current?.releasePointerCapture(e.pointerId);

    if (ix.type === 'pinch') {
      if (activeTouchesRef.current.size < 2) {
        pinchStartRef.current = null;
        ix.type = 'none'; ix.tokenId = null; ix.templateId = null;
      }
      return;
    }

    if (ix.type === 'ghost-drag') {
      // Ghost drag finished — pendingMove.dest was already updated live during move
      setDragTokenId(null);
    } else if (ix.type === 'drag' && ix.tokenId) {
      const dragged = tokens.find((t) => t.id === ix.tokenId);
      const snapStep = dragged?.size === 0.5 ? 0.5 : 1;
      const { col, row } = snapToGrid(ix.currentDragX, ix.currentDragY, snapStep);

      if (activePcMove && ix.tokenId === activePcMove.tokenId) {
        // Battle mode: clamp to movement range and update pendingMove destination
        const dx = col - activePcMove.originCol;
        const dy = row - activePcMove.originRow;
        const distFt = Math.sqrt(dx * dx + dy * dy) * 5;
        const maxCells = activePcMove.speedFt / 5;
        let destCol = col, destRow = row;
        if (distFt > activePcMove.speedFt && (dx !== 0 || dy !== 0)) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          const scale = maxCells / dist;
          destCol = Math.round(activePcMove.originCol + dx * scale);
          destRow = Math.round(activePcMove.originRow + dy * scale);
        }
        setPendingMove({
          tokenId: ix.tokenId,
          originCol: activePcMove.originCol,
          originRow: activePcMove.originRow,
          destCol,
          destRow,
          speedFt: activePcMove.speedFt,
        });
        // Token stays at origin until confirmed
        setDragTokenId(null);
      } else {
        moveToken(ix.tokenId, col, row);
        setDragTokenId(null);
      }
    } else if (ix.type === 'template-drag' && ix.templateId) {
      const cell = dragTemplateCellRef.current;
      if (cell) updateTemplate(ix.templateId, { col: cell.col, row: cell.row });
      dragTemplateCellRef.current = null;
      setDragTemplateId(null);
      setDragTemplateCell(null);
    } else if (ix.type === 'template-rotate' && ix.templateId) {
      if (rotationPreview?.id === ix.templateId) {
        updateTemplate(ix.templateId, { rotation: rotationPreview.angle });
      }
      setRotationPreview(null);
    } else if (ix.type === 'fog') {
      ix.fogStrokeCells = new Set();
    } else if (ix.type === 'light-paint' || ix.type === 'light-mask') {
      ix.lightStrokeCells = new Set();
    } else if (ix.type === 'light-drag' && ix.lightSourceId) {
      const { col, row } = snapToGrid(ix.currentDragX, ix.currentDragY);
      moveLightSource(ix.lightSourceId, col, row);
      setDragLightSourceId(null);
    } else if (ix.type === 'pan') {
      setIsPanning(false);
    }

    ix.type = 'none'; ix.tokenId = null; ix.templateId = null; ix.lightSourceId = null;
  }

  function handlePointerCancel(e: React.PointerEvent) {
    activeTouchesRef.current.delete(e.pointerId);
    viewportRef.current?.releasePointerCapture(e.pointerId);
    const ix = interactionRef.current;
    if (ix.type === 'pinch' && activeTouchesRef.current.size < 2) pinchStartRef.current = null;
    if (ix.type === 'drag' || ix.type === 'ghost-drag') setDragTokenId(null);
    if (ix.type === 'fog') ix.fogStrokeCells = new Set();
    if (ix.type === 'light-paint' || ix.type === 'light-mask') ix.lightStrokeCells = new Set();
    if (ix.type === 'light-drag') setDragLightSourceId(null);
    if (ix.type === 'pan') setIsPanning(false);
    if (ix.type === 'template-drag') {
      dragTemplateCellRef.current = null;
      setDragTemplateId(null);
      setDragTemplateCell(null);
    }
    if (ix.type === 'template-rotate') setRotationPreview(null);
    ix.type = 'none'; ix.tokenId = null; ix.templateId = null;
  }

  // ── Token add handlers ──

  function handleAddPartyToken(ch: Character) {
    const center = viewportCenter();
    addToken({
      label: (ch.name || '?').slice(0, 2).toUpperCase(),
      color: PC_TOKEN_COLORS[characters.indexOf(ch) % PC_TOKEN_COLORS.length].hex,
      col: center.col, row: center.row, size: 1,
      characterId: ch.id,
    });
    setShowAddMenu(false);
  }

  function handleAddCustomToken(opts: { label: string; color: string; size: number }) {
    const center = viewportCenter();
    addToken({
      label: opts.label.slice(0, 4).toUpperCase() || '?',
      color: opts.color, col: center.col, row: center.row, size: opts.size,
    });
  }



  // ── Move mode handlers ──

  function handleConfirmMove() {
    if (!activePcMove || !pendingMove) return;
    moveToken(pendingMove.tokenId, pendingMove.destCol, pendingMove.destRow);
    setPendingMove(null);
    setActivePcMove(null);
  }

  function handleCancelMove() {
    if (!activePcMove) return;
    setPendingMove(null);
    setActivePcMove(null);
  }

  // ── Template add handler ──

  function handleAddTemplate(opts: { type: MapTemplate['type']; size: number; color: string }) {
    const center = viewportCenter();
    addTemplate({
      type: opts.type, col: center.col, row: center.row,
      size: opts.size, rotation: 0, color: opts.color,
    });
    setShowAoeMenu(false);
  }

  // ── Light source handlers ──

  function handleAddLightSource(opts: { label: string; brightRadius: number; dimRadius: number; attachedTokenId?: string }) {
    const center = viewportCenter();
    addLightSource({
      label: opts.label,
      col: center.col,
      row: center.row,
      brightRadius: opts.brightRadius,
      dimRadius: opts.dimRadius,
      attachedTokenId: opts.attachedTokenId,
    });
  }

  function handleLightSourcePointerDown(e: React.PointerEvent, ls: MapLightSource) {
    e.stopPropagation();
    e.preventDefault();
    if (isPlayerMode) return;

    const pos = getLightPos(ls);
    const worldX = gridOffsetX + pos.col * gridCellSize;
    const worldY = gridOffsetY + pos.row * gridCellSize;

    interactionRef.current = {
      ...interactionRef.current,
      type: 'light-drag',
      tokenId: null,
      templateId: null,
      lightSourceId: ls.id,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startTokenX: worldX,
      startTokenY: worldY,
      currentDragX: worldX,
      currentDragY: worldY,
    };

    setDragLightSourceId(ls.id);
    setDragLightPos({ x: worldX, y: worldY });
    setSelectedLightSourceId(ls.id);
    setSelectedTokenId(null);
    setSelectedTemplateId(null);
    setShowAddMenu(false);
    setShowAoeMenu(false);
    setShowLightPanel(false);

    viewportRef.current?.setPointerCapture(e.pointerId);
  }

  // ── Keyboard: Delete / Escape ──

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        if (activePcMove) { handleCancelMove(); return; }
        if (fogMode) { setFogMode(false); setFogBrushPreview([]); }
        if (lightMode) { setLightMode(false); setLightBrushPreview([]); }
        setMeasureMode(false);
        setMeasureStart(null);
        setMeasureEnd(null);
        setSelectedLightSourceId(null);
        return;
      }
      if (isPlayerMode) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedLightSourceId) { removeLightSource(selectedLightSourceId); setSelectedLightSourceId(null); }
        else if (selectedTokenId) { removeToken(selectedTokenId); setSelectedTokenId(null); }
        else if (selectedTemplateId) { removeTemplate(selectedTemplateId); setSelectedTemplateId(null); }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTokenId, selectedTemplateId, removeToken, removeTemplate, activePcMove]);

  // ── Clear map ──

  function handleClearMap() {
    setShowClearConfirm(false);
    clearMap();
    setImgSize({ w: 0, h: 0 });
    setSelectedTokenId(null); setDragTokenId(null);
    setSelectedTemplateId(null); setDragTemplateId(null);
    setDragTemplateCell(null); setRotationPreview(null);
    setFogMode(false); setFogBrushPreview([]);
    setLightMode(false); setLightBrushPreview([]); setSelectedLightSourceId(null);
    setActivePcMove(null); setPendingMove(null); setBattleMode(false);
    dragTemplateCellRef.current = null;
    setZoom(1); zoomRef.current = 1;
    setPanX(0); panXRef.current = 0;
    setPanY(0); panYRef.current = 0;
  }

  // ── Render: empty state ──

  if (!mapImage) {
    return (
      <main className="main bm">
        <div className="bm-empty">
          <div className="bm-empty__icon">{'\u2694'}</div>
          <div className="bm-empty__title">Battle Map</div>
          <div className="bm-empty__text">
            {isPlayerMode
              ? 'The DM has not loaded a battle map yet.'
              : 'Upload a map image to begin placing tokens and tracking combat positions.'}
          </div>
          {!isPlayerMode && (
            <>
              <button className="bm-empty__btn" onClick={() => fileInputRef.current?.click()}>
                Upload Map
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} hidden />
            </>
          )}
        </div>
      </main>
    );
  }

  // ── Render: map loaded ──

  return (
    <main className="main bm">

      {/* DM toolbar */}
      {!isPlayerMode && (
        <div className="bm-toolbar">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} hidden />

          {/* ── Left: map & placement ── */}
          <div className="bm-toolbar__group">
            <button className="bm-toolbar__icon-btn" onClick={() => fileInputRef.current?.click()} title="Upload map image">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M4 6l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>

            <span className="bm-toolbar__div" />

            <div ref={addMenuWrapRef}>
              <button
                className={`bm-toolbar__icon-btn bm-toolbar__icon-btn--gold${showAddMenu ? ' bm-toolbar__icon-btn--active' : ''}`}
                onClick={() => {
                  const next = !showAddMenu;
                  if (next && addMenuWrapRef.current) {
                    const rect = addMenuWrapRef.current.getBoundingClientRect();
                    setTokenMenuAnchor({ top: rect.bottom + 6, left: Math.max(8, rect.left) });
                  }
                  setShowAddMenu(next);
                  setShowAoeMenu(false);
                  setShowGridPanel(false);
                }}
                title="Place token"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M13 3v4M11 5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              </button>
              {showAddMenu && tokenMenuAnchor && createPortal(
                <AddTokenMenu
                  characters={characters}
                  tokens={tokens}
                  onAddPartyToken={handleAddPartyToken}
                  onAddCustomToken={handleAddCustomToken}
                  style={{ position: 'fixed', top: tokenMenuAnchor.top, left: tokenMenuAnchor.left, right: 'auto', marginTop: 0, zIndex: 1100 }}
                />,
                document.body
              )}
            </div>

            <div ref={aoeMenuWrapRef}>
              <button
                className={`bm-toolbar__icon-btn bm-toolbar__icon-btn--purple${showAoeMenu ? ' bm-toolbar__icon-btn--active' : ''}`}
                onClick={() => {
                  const next = !showAoeMenu;
                  if (next && aoeMenuWrapRef.current) {
                    const rect = aoeMenuWrapRef.current.getBoundingClientRect();
                    setAoeMenuAnchor({ top: rect.bottom + 6, left: Math.max(8, rect.left) });
                  }
                  setShowAoeMenu(next);
                  setShowAddMenu(false);
                  setShowGridPanel(false);
                }}
                title="Place area-of-effect template"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2"/><circle cx="8" cy="8" r="2" fill="currentColor" fillOpacity="0.4"/></svg>
              </button>
              {showAoeMenu && aoeMenuAnchor && createPortal(
                <AddAoeMenu
                  onAdd={handleAddTemplate}
                  style={{ position: 'fixed', top: aoeMenuAnchor.top, left: aoeMenuAnchor.left, right: 'auto', marginTop: 0, zIndex: 1100 }}
                />,
                document.body
              )}
            </div>

            <span className="bm-toolbar__div" />

            <button
              className={`bm-toolbar__icon-btn${measureMode ? ' bm-toolbar__icon-btn--active bm-toolbar__icon-btn--blue' : ''}`}
              onClick={() => {
                const next = !measureMode;
                setMeasureMode(next);
                setMeasureStart(null);
                setMeasureEnd(null);
                if (next) { setFogMode(false); setFogBrushPreview([]); setLightMode(false); setLightBrushPreview([]); }
              }}
              title="Measure distance (5 ft/square)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 14L14 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M10 2h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 14H2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            <button
              className={`bm-toolbar__icon-btn${fogMode ? ' bm-toolbar__icon-btn--active bm-toolbar__icon-btn--cyan' : ''}`}
              onClick={() => {
                const next = !fogMode;
                setFogMode(next);
                if (!next) setFogBrushPreview([]);
                if (next) { setMeasureMode(false); setMeasureStart(null); setMeasureEnd(null); setLightMode(false); setLightBrushPreview([]); }
              }}
              title="Fog of war — click to reveal, shift+click to cover"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 10c1-1.5 2.5-2 4-1s3 .5 4-1 2.5-2 4-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M2 6c1-1.5 2.5-2 4-1s3 .5 4-1 2.5-2 4-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/></svg>
            </button>

            {fogMode && (
              <div className="bm-toolbar__fog-inline">
                <label className="bm-toolbar__fog-toggle" title="Enable fog of war">
                  <input type="checkbox" checked={fogEnabled} onChange={(e) => setFogEnabled(e.target.checked)} />
                </label>
                <input
                  className="bm-toolbar__fog-brush-input"
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={fogBrushSize}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 1 && v <= 50) setFogBrushSize(v);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  title="Brush diameter (cells)"
                />
                <button
                  className="bm-toolbar__fog-btn"
                  onClick={() => {
                    if (!imgSize.w || !imgSize.h) return;
                    const cols = Math.ceil(imgSize.w / gridCellSize);
                    const rows = Math.ceil(imgSize.h / gridCellSize);
                    const all: string[] = [];
                    for (let c = 0; c < cols; c++)
                      for (let r = 0; r < rows; r++)
                        all.push(`${c},${r}`);
                    revealFog(all);
                  }}
                  title="Reveal all"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 6l1.5 1.5L8 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button
                  className="bm-toolbar__fog-btn"
                  onClick={() => {
                    if (!imgSize.w || !imgSize.h) return;
                    const cols = Math.ceil(imgSize.w / gridCellSize);
                    const rows = Math.ceil(imgSize.h / gridCellSize);
                    const all: string[] = [];
                    for (let c = 0; c < cols; c++)
                      for (let r = 0; r < rows; r++)
                        all.push(`${c},${r}`);
                    coverFog(all);
                  }}
                  title="Cover all"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                </button>
              </div>
            )}

            <div ref={lightPanelWrapRef}>
              <button
                className={`bm-toolbar__icon-btn${lightMode ? ' bm-toolbar__icon-btn--active bm-toolbar__icon-btn--amber' : ''}`}
                onClick={() => {
                  const next = !lightMode;
                  setLightMode(next);
                  if (!next) { setLightBrushPreview([]); setShowLightPanel(false); }
                  if (next) {
                    setFogMode(false); setFogBrushPreview([]); setMeasureMode(false); setMeasureStart(null); setMeasureEnd(null);
                    if (lightPanelWrapRef.current) {
                      const rect = lightPanelWrapRef.current.getBoundingClientRect();
                      setLightPanelAnchor({ top: rect.bottom + 6, left: Math.max(8, rect.left) });
                    }
                    setShowLightPanel(true);
                  }
                }}
                title="Lighting — paint ambient light levels and place light sources"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M6 10v2a2 2 0 004 0v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M5 3L4 1.5M11 3l1-1.5M8 2V0.5M3 6H1.5M14.5 6H13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6"/></svg>
              </button>
              {showLightPanel && lightPanelAnchor && createPortal(
                <LightingPanel
                  tokens={tokens}
                  lightingEnabled={lightingEnabled}
                  ambientLightDefault={ambientLightDefault}
                  lightBrushType={lightBrushType}
                  lightBrushSize={lightBrushSize}
                  lightMaskMode={lightMaskMode}
                  onSetLightingEnabled={setLightingEnabled}
                  onSetAmbientLightDefault={setAmbientLightDefault}
                  onSetBrushType={(v) => { setLightBrushType(v); }}
                  onSetBrushSize={setLightBrushSize}
                  onSetMaskMode={setLightMaskMode}
                  onAddLightSource={handleAddLightSource}
                  style={{ position: 'fixed', top: lightPanelAnchor.top, left: lightPanelAnchor.left, right: 'auto', marginTop: 0, zIndex: 1100 }}
                />,
                document.body
              )}
            </div>
          </div>

          {/* ── Center: battle mode toggle + active move ── */}
          <div className="bm-toolbar__group bm-toolbar__group--battle">
            <button
              className={`bm-toolbar__battle-toggle${battleMode ? ' bm-toolbar__battle-toggle--active' : ''}`}
              onClick={() => {
                const next = !battleMode;
                setBattleMode(next);
                if (!next && activePcMove) handleCancelMove();
              }}
              title={battleMode ? 'Battle mode ON — PC drags limited by speed' : 'Free mode — unrestricted movement'}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1l1.5 3.5L13 5l-3 2.5L11 12 7 9.5 3 12l1-4.5L1 5l4.5-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill={battleMode ? 'currentColor' : 'none'} fillOpacity="0.25"/>
              </svg>
              <span>{battleMode ? 'Battle' : 'Free'}</span>
            </button>
          </div>

          {/* ── Right: view & danger ── */}
          <div className="bm-toolbar__group">
            <div className="bm-toolbar__zoom">
              <button className="bm-toolbar__icon-btn bm-toolbar__icon-btn--sm" onClick={() => zoomBy(0.8)} title="Zoom out">{'\u2212'}</button>
              <span className="bm-toolbar__zoom-value">{Math.round(zoom * 100)}%</span>
              <button className="bm-toolbar__icon-btn bm-toolbar__icon-btn--sm" onClick={() => zoomBy(1.25)} title="Zoom in">+</button>
              <button className="bm-toolbar__icon-btn bm-toolbar__icon-btn--sm" onClick={fitToView} title="Fit to view">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><rect x="3.5" y="3.5" width="5" height="5" rx="0.5" fill="currentColor" fillOpacity="0.3"/></svg>
              </button>
            </div>

            <span className="bm-toolbar__div" />

            <div ref={gridPanelRef}>
              <button
                className={`bm-toolbar__icon-btn${showGridPanel ? ' bm-toolbar__icon-btn--active' : ''}`}
                onClick={() => {
                  const next = !showGridPanel;
                  if (next && gridPanelRef.current) {
                    const rect = gridPanelRef.current.getBoundingClientRect();
                    setGridPanelAnchor({ top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 260) });
                  }
                  setShowGridPanel(next);
                  setShowAddMenu(false);
                  setShowAoeMenu(false);
                }}
                title="Grid settings"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 5.5h14M1 10.5h14M5.5 1v14M10.5 1v14" stroke="currentColor" strokeWidth="1.2" opacity="0.9"/></svg>
              </button>
              {showGridPanel && gridPanelAnchor && createPortal(
                <div className="bm-grid-panel" style={{ position: 'fixed', top: gridPanelAnchor.top, left: gridPanelAnchor.left, zIndex: 1100 }} onClick={(e) => e.stopPropagation()}>
                  <div className="bm-grid-panel__row">
                    <label className="bm-grid-panel__label">
                      <input type="checkbox" checked={gridVisible} onChange={(e) => updateGridConfig({ gridVisible: e.target.checked })} />
                      Show Grid
                    </label>
                    <label className="bm-toolbar__color-wrap" title="Grid colour">
                      <input type="color" className="bm-grid-color" value={gridColor} onChange={(e) => updateGridConfig({ gridColor: e.target.value })} />
                    </label>
                  </div>
                  <div className="bm-grid-panel__row">
                    <span className="bm-grid-panel__label">Cell Size</span>
                    <input type="range" className="bm-grid-slider" min={10} max={200} value={gridCellSize} onChange={(e) => updateGridConfig({ gridCellSize: Number(e.target.value) })} />
                    <span className="bm-grid-panel__val">{gridCellSize}px</span>
                  </div>
                  <div className="bm-grid-panel__row">
                    <span className="bm-grid-panel__label">Offset X</span>
                    <button className="bm-toolbar__step" onClick={() => updateGridConfig({ gridOffsetX: gridOffsetX - 1 })}>{'\u2212'}</button>
                    <span className="bm-grid-panel__val">{gridOffsetX}</span>
                    <button className="bm-toolbar__step" onClick={() => updateGridConfig({ gridOffsetX: gridOffsetX + 1 })}>+</button>
                  </div>
                  <div className="bm-grid-panel__row">
                    <span className="bm-grid-panel__label">Offset Y</span>
                    <button className="bm-toolbar__step" onClick={() => updateGridConfig({ gridOffsetY: gridOffsetY - 1 })}>{'\u2212'}</button>
                    <span className="bm-grid-panel__val">{gridOffsetY}</span>
                    <button className="bm-toolbar__step" onClick={() => updateGridConfig({ gridOffsetY: gridOffsetY + 1 })}>+</button>
                  </div>
                </div>,
                document.body
              )}
            </div>

            {(selectedTokenId || selectedTemplateId || selectedLightSourceId) && (
              <>
                <span className="bm-toolbar__div" />
                <button
                  className="bm-toolbar__icon-btn bm-toolbar__icon-btn--danger"
                  onClick={() => {
                    if (selectedLightSourceId) { removeLightSource(selectedLightSourceId); setSelectedLightSourceId(null); }
                    else if (selectedTokenId) { removeToken(selectedTokenId); setSelectedTokenId(null); }
                    else if (selectedTemplateId) { removeTemplate(selectedTemplateId); setSelectedTemplateId(null); }
                  }}
                  title="Remove selected"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4h8M5.5 4V3a1 1 0 011-1h1a1 1 0 011 1v1M4.5 4l.5 7.5a1 1 0 001 .5h2a1 1 0 001-.5L10 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </>
            )}

            <span className="bm-toolbar__div" />

            <button className="bm-toolbar__icon-btn bm-toolbar__icon-btn--danger" onClick={() => setShowClearConfirm(true)} title="Clear map">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Clear map confirmation */}
      {showClearConfirm && (
        <div className="lr-modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="lr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lr-modal__header">
              <span className="lr-modal__title">Clear Battle Map</span>
            </div>
            <div className="lr-modal__body">
              <p className="ie-modal-desc">
                This will remove the map image, all tokens, templates, and fog of war. This cannot be undone.
              </p>
            </div>
            <div className="lr-modal__footer">
              <button className="lr-modal__btn lr-modal__btn--cancel" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </button>
              <button className="lr-modal__btn lr-modal__btn--confirm lr-modal__btn--danger" onClick={handleClearMap}>
                Clear Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player toolbar */}
      {isPlayerMode && (
        <div className="bm-toolbar bm-toolbar--player">
          <div className="bm-toolbar__group">
            <div className="bm-toolbar__zoom">
              <button className="bm-toolbar__icon-btn bm-toolbar__icon-btn--sm" onClick={() => zoomBy(0.8)} title="Zoom out">{'\u2212'}</button>
              <span className="bm-toolbar__zoom-value">{Math.round(zoom * 100)}%</span>
              <button className="bm-toolbar__icon-btn bm-toolbar__icon-btn--sm" onClick={() => zoomBy(1.25)} title="Zoom in">+</button>
              <button className="bm-toolbar__icon-btn bm-toolbar__icon-btn--sm" onClick={fitToView} title="Fit to view">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><rect x="3.5" y="3.5" width="5" height="5" rx="0.5" fill="currentColor" fillOpacity="0.3"/></svg>
              </button>
            </div>
            <span className="bm-toolbar__div" />
            <button
              className={`bm-toolbar__icon-btn${measureMode ? ' bm-toolbar__icon-btn--active bm-toolbar__icon-btn--blue' : ''}`}
              onClick={() => { setMeasureMode(!measureMode); setMeasureStart(null); setMeasureEnd(null); }}
              title="Measure distance (5 ft/square)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 14L14 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M10 2h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 14H2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Map viewport */}
      <div
        ref={viewportRef}
        className={[
          'bm-viewport',
          isPanning && 'bm-viewport--panning',
          dragTokenId && 'bm-viewport--dragging',
          measureMode && 'bm-viewport--measuring',
          fogMode && 'bm-viewport--fog',
          lightMode && 'bm-viewport--light',
        ].filter(Boolean).join(' ')}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div
          className="bm-world"
          style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}
        >
          <img
            src={mapImage}
            className="bm-image"
            onLoad={handleImageLoad}
            draggable={false}
            alt=""
          />

          <canvas
            ref={gridCanvasRef}
            className="bm-grid-canvas"
            style={{ width: imgSize.w, height: imgSize.h }}
          />

          {/* Lighting overlay — between grid and fog */}
          <canvas
            ref={lightCanvasRef}
            className="bm-light-canvas"
            style={{ width: imgSize.w, height: imgSize.h }}
          />

          {/* Fog of war — DM sees at 50% opacity here, players get z-index:200 via CSS */}
          <canvas
            ref={fogCanvasRef}
            className="bm-fog-canvas"
            style={{ width: imgSize.w, height: imgSize.h }}
          />

          {/* Fog brush preview (DM only) */}
          {!isPlayerMode && fogMode && (
            <canvas
              ref={fogPreviewCanvasRef}
              className="bm-fog-preview-canvas"
              style={{ width: imgSize.w, height: imgSize.h }}
            />
          )}

          {/* Light brush preview (DM only) */}
          {!isPlayerMode && lightMode && (
            <canvas
              ref={lightPreviewCanvasRef}
              className="bm-light-preview-canvas"
              style={{ width: imgSize.w, height: imgSize.h }}
            />
          )}

          {/* AoE template SVG layer — between grid and tokens */}
          {templates.length > 0 && (
            <svg
              className="bm-aoe-layer"
              style={{ width: imgSize.w, height: imgSize.h }}
              viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
            >
              {templates.map((t) => {
                const isDragging = dragTemplateId === t.id;
                const isSelected = selectedTemplateId === t.id;
                const displayRotation = rotationPreview?.id === t.id
                  ? rotationPreview.angle
                  : t.rotation;
                return (
                  <TemplateShape
                    key={t.id}
                    template={t}
                    gridCellSize={gridCellSize}
                    gridOffsetX={gridOffsetX}
                    gridOffsetY={gridOffsetY}
                    isSelected={isSelected}
                    isDragging={isDragging}
                    dragCell={isDragging ? dragTemplateCell : null}
                    displayRotation={displayRotation}
                    onPointerDown={handleTemplatePointerDown}
                    onRotateHandlePointerDown={handleRotateHandlePointerDown}
                  />
                );
              })}
            </svg>
          )}

          <canvas
            ref={measureCanvasRef}
            className="bm-measure-canvas"
            style={{ width: imgSize.w, height: imgSize.h }}
          />

          <canvas
            ref={moveCanvasRef}
            className="bm-measure-canvas"
            style={{ width: imgSize.w, height: imgSize.h }}
          />

          {/* Ghost token at prospective move destination */}
          {pendingMove && (pendingMove.destCol !== pendingMove.originCol || pendingMove.destRow !== pendingMove.originRow) && (() => {
            const ghostToken = tokens.find((t) => t.id === pendingMove.tokenId);
            if (!ghostToken) return null;
            const ghostSize = ghostToken.size * gridCellSize;
            const isDraggingGhost = dragTokenId === '__ghost__';
            const ghostX = isDraggingGhost ? dragPos.x : gridOffsetX + pendingMove.destCol * gridCellSize;
            const ghostY = isDraggingGhost ? dragPos.y : gridOffsetY + pendingMove.destRow * gridCellSize;
            const dx = pendingMove.destCol - pendingMove.originCol;
            const dy = pendingMove.destRow - pendingMove.originRow;
            const usedFt = Math.round(Math.sqrt(dx * dx + dy * dy) * 5);
            const totalFt = activePcMove?.speedFt ?? pendingMove.speedFt;
            const hasMoved = pendingMove.destCol !== pendingMove.originCol || pendingMove.destRow !== pendingMove.originRow;
            return (
              <>
                <div
                  className={[
                    'bm-token',
                    'bm-token--ghost',
                    isDraggingGhost && 'bm-token--dragging',
                  ].filter(Boolean).join(' ')}
                  style={{
                    left: ghostX, top: ghostY,
                    width: ghostSize, height: ghostSize,
                    backgroundColor: ghostToken.color,
                  }}
                  onPointerDown={!isPlayerMode ? handleGhostPointerDown : undefined}
                >
                  <span className="bm-token__label" style={{ fontSize: Math.min(20, Math.max(9, ghostSize * 0.22)) }}>
                    {ghostToken.label}
                  </span>
                </div>
                {/* Movement HUD anchored below ghost token */}
                {!isDraggingGhost && (
                  <div
                    className="bm-move-hud"
                    style={{
                      left: ghostX + ghostSize / 2,
                      top: ghostY + ghostSize + 6,
                    }}
                  >
                    <div className={`bm-move-hud__usage ${usedFt > totalFt ? 'bm-move-hud__usage--over' : usedFt >= totalFt * 0.75 ? 'bm-move-hud__usage--warn' : ''}`}>
                      <span className="bm-move-hud__used">{usedFt}</span>
                      <span className="bm-move-hud__sep">/</span>
                      <span className="bm-move-hud__total">{totalFt} ft</span>
                    </div>
                    {!isPlayerMode && (
                      <div className="bm-move-hud__actions">
                        <button
                          className="bm-move-hud__btn bm-move-hud__btn--confirm"
                          onPointerDown={(e) => { e.stopPropagation(); handleConfirmMove(); }}
                          disabled={!hasMoved}
                          title="Confirm move"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3L11 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button
                          className="bm-move-hud__btn bm-move-hud__btn--cancel"
                          onPointerDown={(e) => { e.stopPropagation(); handleCancelMove(); }}
                          title="Cancel move (Esc)"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}

          {/* Light source icons */}
          {lightSources.map((ls) => {
            const pos = getLightPos(ls);
            const isDragging = dragLightSourceId === ls.id;
            const isSelected = selectedLightSourceId === ls.id;
            const worldX = isDragging ? dragLightPos.x : gridOffsetX + pos.col * gridCellSize;
            const worldY = isDragging ? dragLightPos.y : gridOffsetY + pos.row * gridCellSize;
            const iconSize = gridCellSize * 0.6;
            const offset = (gridCellSize - iconSize) / 2;
            return (
              <div
                key={ls.id}
                className={[
                  'bm-light-source',
                  isSelected && 'bm-light-source--selected',
                  isDragging && 'bm-light-source--dragging',
                ].filter(Boolean).join(' ')}
                style={{
                  left: worldX + offset,
                  top: worldY + offset,
                  width: iconSize,
                  height: iconSize,
                  fontSize: Math.max(10, iconSize * 0.55),
                }}
                onPointerDown={(e) => handleLightSourcePointerDown(e, ls)}
                title={`${ls.label} (${ls.brightRadius}/${ls.dimRadius} ft)`}
              >
                {'\uD83D\uDD25'}
              </div>
            );
          })}

          {tokens.map((token) => {
            const isDragging = dragTokenId === token.id;
            const isSelected = selectedTokenId === token.id;
            const pos = isDragging ? dragPos : tokenWorldPos(token);
            const size = token.size * gridCellSize;
            const fontSize = Math.min(20, Math.max(9, size * 0.22));

            // HP bar for PC tokens
            let hpBar: React.ReactNode = null;
            if (token.characterId) {
              const ch = characters.find((c) => c.id === token.characterId);
              if (ch && ch.hp.max > 0) {
                const hpPct = Math.max(0, Math.min(1, ch.hp.current / ch.hp.max));
                const tempPct = Math.min(1 - hpPct, ch.hp.temp / ch.hp.max);
                const barColor = hpPct <= 0.25 ? '#c0392b'
                  : hpPct <= 0.5 ? '#d4a017'
                  : '#4a7a3a';
                hpBar = (
                  <div className="bm-token__hp">
                    <div
                      className="bm-token__hp-fill"
                      style={{ width: `${Math.round(hpPct * 100)}%`, backgroundColor: barColor }}
                    />
                    {tempPct > 0 && (
                      <div
                        className="bm-token__hp-temp"
                        style={{ width: `${Math.round(tempPct * 100)}%`, left: `${Math.round(hpPct * 100)}%` }}
                      />
                    )}
                  </div>
                );
              }
            }

            return (
              <div
                key={token.id}
                className={[
                  'bm-token',
                  isDragging && 'bm-token--dragging',
                  isSelected && 'bm-token--selected',
                ].filter(Boolean).join(' ')}
                style={{
                  left: pos.x, top: pos.y,
                  width: size, height: size,
                  backgroundColor: token.color,
                }}
                onPointerDown={(e) => handleTokenPointerDown(e, token)}
              >
                <span className="bm-token__label" style={{ fontSize }}>
                  {token.label}
                </span>
                {hpBar}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
