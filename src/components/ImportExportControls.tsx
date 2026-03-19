/**
 * ImportExportControls
 *
 * Provides two actions in the sidebar footer:
 *   • Export — serialises the current party to a JSON file download.
 *   • Import — opens a file picker, validates the chosen file, shows a
 *     confirmation modal (because import is destructive), then calls
 *     `replaceParty` on the store.
 *
 * Error states are surfaced inline beneath the buttons rather than in a
 * separate modal to keep the interaction lightweight.
 */

import { useRef, useState } from 'react';
import { type PartyExport, exportParty, parseImportFile, ImportValidationError } from '../utils/importExport';
import type { Character } from '../types/character';

interface Props {
  characters: Character[];
  selectedId: string | null;
  onImport: (exported: PartyExport) => void;
}

interface PendingImport {
  data: PartyExport;
  filename: string;
}

export function ImportExportControls({ characters, selectedId, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // A successfully parsed file waiting for user confirmation.
  const [pending, setPending] = useState<PendingImport | null>(null);
  // Human-readable error string shown beneath the buttons.
  const [importError, setImportError] = useState<string | null>(null);

  // ── Export ──────────────────────────────────────────────────────────────────

  function handleExport() {
    exportParty(characters, selectedId);
  }

  // ── Import: file selection ──────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so the same file can be re-selected after a dismissal.
    e.target.value = '';
    if (!file) return;

    setImportError(null);

    try {
      const data = await parseImportFile(file);
      setPending({ data, filename: file.name });
    } catch (err) {
      const message =
        err instanceof ImportValidationError
          ? err.message
          : 'Could not read the file. Make sure it is a valid PhandaLedger save.';
      setImportError(message);
    }
  }

  // ── Import: confirmation ────────────────────────────────────────────────────

  function handleConfirmImport() {
    if (!pending) return;
    onImport(pending.data);
    setPending(null);
  }

  function handleCancelImport() {
    setPending(null);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const incomingCount = pending?.data.characters.length ?? 0;
  const currentCount = characters.length;

  return (
    <>
      <div className="ie-controls">
        <button
          className="ie-btn ie-btn--export"
          onClick={handleExport}
          title="Export party to JSON"
          disabled={characters.length === 0}
        >
          ↑ Export
        </button>
        <button
          className="ie-btn ie-btn--import"
          onClick={() => fileInputRef.current?.click()}
          title="Import party from JSON"
        >
          ↓ Import
        </button>
        {/* Hidden file input — accept only JSON */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {importError && (
        <div className="ie-error" role="alert">
          {importError}
        </div>
      )}

      {/* Confirmation modal — shown after a file has been successfully parsed */}
      {pending && (
        <div className="lr-modal-overlay" onClick={handleCancelImport}>
          <div className="lr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lr-modal__header">
              <span className="lr-modal__title">Import Party</span>
              <span className="lr-modal__subtitle">{pending.filename}</span>
            </div>

            <div className="lr-modal__body">
              <p className="ie-modal-desc">
                This will replace your current{' '}
                <strong>{currentCount} adventurer{currentCount !== 1 ? 's' : ''}</strong> with{' '}
                <strong>{incomingCount} adventurer{incomingCount !== 1 ? 's' : ''}</strong> from
                the save file.
              </p>
              {currentCount > 0 && (
                <div className="lr-modal__warning">
                  ⚠ Your current party will be lost. Export first if you want to keep it.
                </div>
              )}
              <ul className="ie-char-list">
                {pending.data.characters.map((ch) => (
                  <li key={ch.id} className="ie-char-list__item">
                    <span className="ie-char-list__name">{ch.name || 'Unnamed'}</span>
                    <span className="ie-char-list__meta">
                      {[ch.class, ch.race].filter(Boolean).join(' · ') || 'No class set'}
                    </span>
                  </li>
                ))}
                {incomingCount === 0 && (
                  <li className="ie-char-list__item ie-char-list__item--empty">
                    (empty party)
                  </li>
                )}
              </ul>
            </div>

            <div className="lr-modal__footer">
              <button className="lr-modal__btn lr-modal__btn--cancel" onClick={handleCancelImport}>
                Cancel
              </button>
              <button className="lr-modal__btn lr-modal__btn--confirm" onClick={handleConfirmImport}>
                Load Party
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
