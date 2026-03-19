import { useState, useRef, useCallback, useEffect } from 'react';
import type { PortraitCrop } from '../types/character';

const PREVIEW_SIZE = 248; // px — square crop preview

interface Props {
  src: string;
  initialCrop: PortraitCrop;
  onSave: (crop: PortraitCrop) => void;
  onCancel: () => void;
}

export function PortraitCropModal({ src, initialCrop, onSave, onCancel }: Props) {
  const [scale, setScale] = useState(initialCrop.scale);
  const [offsetX, setOffsetX] = useState(initialCrop.offsetX);
  const [offsetY, setOffsetY] = useState(initialCrop.offsetY);

  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onSave({ scale, offsetX, offsetY });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scale, offsetX, offsetY, onSave, onCancel]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffsetX((prev) => Math.max(-1, Math.min(1, prev + dx / PREVIEW_SIZE)));
    setOffsetY((prev) => Math.max(-1, Math.min(1, prev + dy / PREVIEW_SIZE)));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => Math.max(0.5, Math.min(4, prev - e.deltaY * 0.002)));
  }, []);

  const handleReset = () => {
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  return (
    <div className="crop-overlay" onClick={onCancel}>
      <div className="crop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crop-modal__header">
          <span className="crop-modal__title">Adjust Portrait</span>
          <span className="crop-modal__hint">Drag · Scroll to zoom</span>
        </div>

        <div
          ref={previewRef}
          className="crop-preview"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onWheel={onWheel}
          style={{ cursor: dragging.current ? 'grabbing' : 'grab' }}
        >
          <img
            src={src}
            className="crop-preview__img"
            style={{
              transform: `translate(${offsetX * 100}%, ${offsetY * 100}%) scale(${scale})`,
            }}
            draggable={false}
          />
          {/* Corner brackets as crop frame overlay */}
          <div className="crop-frame">
            <div className="crop-frame__corner crop-frame__corner--tl" />
            <div className="crop-frame__corner crop-frame__corner--tr" />
            <div className="crop-frame__corner crop-frame__corner--bl" />
            <div className="crop-frame__corner crop-frame__corner--br" />
          </div>
        </div>

        <div className="crop-zoom-row">
          <span className="crop-zoom-label">Zoom</span>
          <input
            type="range"
            className="crop-zoom-slider"
            min={0.5}
            max={4}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
          />
          <span className="crop-zoom-value">{Math.round(scale * 100)}%</span>
        </div>

        <div className="crop-modal__btns">
          <button className="crop-btn crop-btn--reset" onClick={handleReset}>
            Reset
          </button>
          <button className="crop-btn crop-btn--cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="crop-btn crop-btn--save"
            onClick={() => onSave({ scale, offsetX, offsetY })}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
