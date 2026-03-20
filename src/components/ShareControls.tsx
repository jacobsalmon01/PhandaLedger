/**
 * ShareControls
 *
 * Share button → modal with two modes (radio-style):
 *   • Whole Party  — encodes all characters
 *   • One Character — user picks from a dropdown
 *
 * Single "Copy Link" CTA fires for whichever mode is selected.
 * Portraits are stripped before encoding.
 */

import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { buildShareUrl } from '../utils/shareUrl';

type Mode = 'all' | 'one';
type Phase = 'idle' | 'menu' | 'building' | 'copied' | 'error';

export function ShareControls() {
  const { characters, selectedId } = useStore();
  const [phase, setPhase] = useState<Phase>('idle');
  const [mode, setMode] = useState<Mode>('all');
  const [pickedCharId, setPickedCharId] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState('');

  // Pre-populate dropdown to the currently viewed character when the modal opens.
  useEffect(() => {
    if (phase === 'menu' && selectedId) {
      setPickedCharId(selectedId);
    }
  }, [phase, selectedId]);

  async function handleCopy() {
    const chars = mode === 'all'
      ? characters
      : characters.filter((c) => c.id === pickedCharId);
    const sid = mode === 'all' ? selectedId : (pickedCharId || null);
    if (chars.length === 0) return;
    setPhase('building');
    try {
      const url = await buildShareUrl(chars, sid);
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setPhase('copied');
    } catch {
      setPhase('error');
    }
  }

  function open() {
    setMode('all');
    setPhase('menu');
  }

  function close() {
    setPhase('idle');
    setPickedCharId('');
  }

  const copyDisabled = phase === 'building'
    || (mode === 'one' && !pickedCharId)
    || characters.length === 0;

  return (
    <>
      <button
        className="ie-btn ie-btn--share"
        onClick={open}
        disabled={characters.length === 0}
        title="Copy a share link to clipboard"
      >
        ↗ Share
      </button>

      {phase !== 'idle' && (
        <div className="lr-modal-overlay" onClick={close}>
          <div className="lr-modal share-modal" onClick={(e) => e.stopPropagation()}>

            {phase === 'copied' ? (
              /* ── Success state ── */
              <>
                <div className="share-success">
                  <span className="share-success__glyph">✦</span>
                  <span className="share-success__title">Link Copied</span>
                  <span className="share-success__sub">
                    Send it to your players — they'll open it in any browser, no install needed.
                  </span>
                </div>
                <div className="lr-modal__footer">
                  <button className="lr-modal__btn lr-modal__btn--cancel" onClick={close}>Done</button>
                  <button
                    className="lr-modal__btn lr-modal__btn--confirm"
                    onClick={() => navigator.clipboard.writeText(copiedUrl)}
                  >
                    Copy Again
                  </button>
                </div>
              </>
            ) : phase === 'error' ? (
              /* ── Error state ── */
              <>
                <div className="lr-modal__header">
                  <span className="lr-modal__title">Share Failed</span>
                  <span className="lr-modal__subtitle">
                    Clipboard access was denied. Try again or check your browser permissions.
                  </span>
                </div>
                <div className="lr-modal__footer">
                  <button className="lr-modal__btn lr-modal__btn--cancel" onClick={() => setPhase('menu')}>
                    Back
                  </button>
                </div>
              </>
            ) : (
              /* ── Menu state ── */
              <>
                <div className="lr-modal__header">
                  <span className="lr-modal__title">Share via Link</span>
                  <span className="lr-modal__subtitle">
                    Encodes character data directly in the URL — no portraits, no account needed.
                  </span>
                </div>

                <div className="lr-modal__body">
                  <div className="share-choices">

                    {/* Option A: Whole Party */}
                    <label className={`share-choice${mode === 'all' ? ' share-choice--active' : ''}`}>
                      <input
                        type="radio"
                        name="share-mode"
                        className="share-choice__radio"
                        checked={mode === 'all'}
                        onChange={() => setMode('all')}
                      />
                      <span className="share-choice__glyph">✦</span>
                      <div className="share-choice__text">
                        <span className="share-choice__label">Whole Party</span>
                        <span className="share-choice__desc">
                          {characters.length} adventurer{characters.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </label>

                    {/* Option B: One Character */}
                    <label className={`share-choice${mode === 'one' ? ' share-choice--active' : ''}`}>
                      <input
                        type="radio"
                        name="share-mode"
                        className="share-choice__radio"
                        checked={mode === 'one'}
                        onChange={() => setMode('one')}
                      />
                      <span className="share-choice__glyph">✦</span>
                      <div className="share-choice__text">
                        <span className="share-choice__label">One Character</span>
                        <select
                          className="skill-check-select share-char-select"
                          value={pickedCharId}
                          onChange={(e) => { setPickedCharId(e.target.value); setMode('one'); }}
                          onClick={(e) => { e.preventDefault(); setMode('one'); }}
                        >
                          {characters.length === 0
                            ? <option value="">No characters</option>
                            : characters.map((c) => (
                                <option key={c.id} value={c.id}>{c.name || 'Unnamed'}</option>
                              ))
                          }
                        </select>
                      </div>
                    </label>

                  </div>

                  <p className="share-note">✦ Portraits are not included to keep the link short.</p>
                </div>

                <div className="lr-modal__footer">
                  <button className="lr-modal__btn lr-modal__btn--cancel" onClick={close}>
                    Cancel
                  </button>
                  <button
                    className="lr-modal__btn lr-modal__btn--confirm"
                    onClick={handleCopy}
                    disabled={copyDisabled}
                  >
                    {phase === 'building' ? 'Encoding…' : 'Copy Link'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
