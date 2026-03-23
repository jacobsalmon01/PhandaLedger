import { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { CharacterSheet } from './components/CharacterSheet';
import { BattleMap } from './components/BattleMap';
import { PlayerBanner } from './components/PlayerBanner';
import { useStore } from './store/useStore';
import { isPlayerMode } from './store/wsClient';
import { parseShareHash } from './utils/shareUrl';
import type { PartyExport } from './utils/importExport';

// ── Incoming share modal ──────────────────────────────────────────────────────

function IncomingShareModal({
  incoming,
  currentCount,
  onAdd,
  onReplace,
  onCancel,
}: {
  incoming: PartyExport;
  currentCount: number;
  onAdd: () => void;
  onReplace: () => void;
  onCancel: () => void;
}) {
  const count = incoming.characters.length;
  return (
    <div className="lr-modal-overlay" onClick={onCancel}>
      <div className="lr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lr-modal__header">
          <span className="lr-modal__title">Party Shared With You</span>
          <span className="lr-modal__subtitle">
            {count === 1
              ? `${incoming.characters[0].name || 'Someone'} was shared via link.`
              : `${count} adventurers were shared via link.`}
          </span>
        </div>
        <div className="lr-modal__body">
          <ul className="ie-char-list">
            {incoming.characters.map((ch) => (
              <li key={ch.id} className="ie-char-list__item">
                <span className="ie-char-list__name">{ch.name || 'Unnamed'}</span>
                <span className="ie-char-list__meta">
                  {[ch.class, ch.race].filter(Boolean).join(' · ') || 'No class set'}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="lr-modal__footer">
          <button className="lr-modal__btn lr-modal__btn--cancel" onClick={onCancel}>
            Dismiss
          </button>
          {currentCount > 0 && (
            <button
              className="lr-modal__btn lr-modal__btn--warn"
              onClick={onReplace}
              title="Removes your current party"
            >
              Replace Party
            </button>
          )}
          <button className="lr-modal__btn lr-modal__btn--confirm" onClick={onAdd}>
            Add to Party
          </button>
        </div>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const { characters, replaceParty, mergeCharacters } = useStore();
  const [incomingShare, setIncomingShare] = useState<PartyExport | null>(null);
  const [showBattleMap, setShowBattleMap] = useState(false);

  // Apply player-mode body class for CSS-based read-only enforcement.
  useEffect(() => {
    if (isPlayerMode) document.body.classList.add('player-mode');
    return () => document.body.classList.remove('player-mode');
  }, []);

  // Detect a share hash on mount and offer to load it.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#share=')) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    parseShareHash(hash).then((parsed: PartyExport | null) => {
      if (parsed) setIncomingShare(parsed);
    });
  }, []);

  function handleAdd() {
    if (!incomingShare) return;
    mergeCharacters(incomingShare.characters);
    setIncomingShare(null);
  }

  function handleReplace() {
    if (!incomingShare) return;
    replaceParty(incomingShare);
    setIncomingShare(null);
  }

  return (
    <>
    <PlayerBanner />
    <div id="app">
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? '\u2715' : '\u2630'}
      </button>
      <div
        className={`sidebar-overlay${sidebarOpen ? ' sidebar-overlay--open' : ''}`}
        onClick={closeSidebar}
      />
      <Sidebar
        open={sidebarOpen}
        onNavigate={closeSidebar}
        showBattleMap={showBattleMap}
        onSetView={(v) => setShowBattleMap(v === 'map')}
      />
      {showBattleMap ? <BattleMap /> : <CharacterSheet />}

      {incomingShare && (
        <IncomingShareModal
          incoming={incomingShare}
          currentCount={characters.length}
          onAdd={handleAdd}
          onReplace={handleReplace}
          onCancel={() => setIncomingShare(null)}
        />
      )}
    </div>
    </>
  );
}
