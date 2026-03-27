import { useStore } from '../../store/useStore';
import { useBattleMapStore } from '../../store/useBattleMapStore';
import { onStatusChange, type WsStatus } from '../../store/wsClient';
import { useState, useEffect, type ReactNode } from 'react';
import { Swords, Sparkle, Wand, Backpack, Scroll, Map as MapIcon } from 'lucide-react';
import { PartyStrip } from './PartyStrip';
import { HeroCard } from './HeroCard';
import { CombatCard } from './CombatCard';
import { AbilitiesCard } from './AbilitiesCard';
import { SpellsCard } from './SpellsCard';
import { InventoryCard } from './InventoryCard';
import { ResourcesCard } from './ResourcesCard';
import { BattleMap } from '../BattleMap';

function useWsStatus(): WsStatus {
  const [status, setStatus] = useState<WsStatus>('connecting');
  useEffect(() => onStatusChange(setStatus), []);
  return status;
}

type CardTab = 'combat' | 'abilities' | 'spells' | 'inventory';

const CARD_TABS: { id: CardTab; icon: ReactNode; label: string }[] = [
  { id: 'combat', icon: <Swords size={16} strokeWidth={1.5} />, label: 'Combat' },
  { id: 'abilities', icon: <Sparkle size={16} strokeWidth={1.5} />, label: 'Abilities' },
  { id: 'spells', icon: <Wand size={16} strokeWidth={1.5} />, label: 'Spells' },
  { id: 'inventory', icon: <Backpack size={16} strokeWidth={1.5} />, label: 'Items' },
];

type PlayerScreen = 'sheet' | 'map';

export function PlayerView() {
  const { characters, selected, selectedId, selectCharacter } = useStore();
  const { mapImage } = useBattleMapStore();
  const wsStatus = useWsStatus();
  const [activeCard, setActiveCard] = useState<CardTab>('combat');
  const [activeView, setActiveView] = useState<PlayerScreen>('sheet');

  const mapAvailable = mapImage !== null;

  return (
    <div className={`player-view player-view--has-nav${activeView === 'map' ? ' player-view--map-active' : ''}`}>
      <div className="pv-table-vignette" />
      {/* ── Connection badge ── */}
      <div className={`pv-connection pv-connection--${wsStatus}`}>
        <span className="pv-connection__dot" />
        <span className="pv-connection__label">
          {wsStatus === 'connected' ? 'Live' :
           wsStatus === 'connecting' ? 'Connecting\u2026' :
           wsStatus === 'disconnected' ? 'Reconnecting\u2026' :
           'Waiting for DM\u2026'}
        </span>
      </div>

      {activeView === 'sheet' ? (
        <>
          {/* ── Party strip ── */}
          <PartyStrip
            characters={characters}
            selectedId={selectedId}
            onSelect={selectCharacter}
          />

          {/* ── Main content ── */}
          {selected ? (
            <>
              {selected.dead ? (
                <div className="pv-death-overlay">
                  <span className="pv-death__skull">{'\u2620'}</span>
                  <span className="pv-death__name">{selected.name || 'The Adventurer'}</span>
                  <span className="pv-death__tagline">This adventurer has fallen.</span>
                </div>
              ) : (
                <>
                  <HeroCard ch={selected} />

                  {/* ── Card Deck ── */}
                  <div className="pv-deck">
                    <div className="pv-deck__frame">
                      <nav className="pv-deck__tabs">
                        {CARD_TABS.map((tab) => (
                          <button
                            key={tab.id}
                            className={`pv-deck__tab${activeCard === tab.id ? ' pv-deck__tab--active' : ''}`}
                            onClick={() => setActiveCard(tab.id)}
                          >
                            <span className="pv-deck__tab-icon">{tab.icon}</span>
                            <span className="pv-deck__tab-label">{tab.label}</span>
                          </button>
                        ))}
                      </nav>

                      <div className="pv-deck__content">
                        {activeCard === 'combat' && <CombatCard ch={selected} />}
                        {activeCard === 'abilities' && <AbilitiesCard ch={selected} />}
                        {activeCard === 'spells' && <SpellsCard ch={selected} />}
                        {activeCard === 'inventory' && (
                          <>
                            <InventoryCard ch={selected} />
                            <ResourcesCard ch={selected} />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="pv-empty">
              <div className="pv-empty__icon">{'\u2726'}</div>
              <div className="pv-empty__title">Waiting for Party Data</div>
              <div className="pv-empty__text">
                The DM's screen will populate this view once the session is live.
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="pv-map-container">
          <BattleMap />
        </div>
      )}

      {/* ── Bottom navigation ── */}
      <nav className="pv-bottom-nav">
        {/* Sliding brass plate indicator */}
        <div className={`pv-bottom-nav__slider${activeView === 'map' ? ' pv-bottom-nav__slider--right' : ''}`} />

        {/* Center divider rivet */}
        <div className="pv-bottom-nav__rivet" />

        <button
          className={`pv-bottom-nav__item${activeView === 'sheet' ? ' pv-bottom-nav__item--active' : ''}`}
          onClick={() => setActiveView('sheet')}
        >
          <span className="pv-bottom-nav__icon">
            <Scroll size={18} strokeWidth={1.5} />
          </span>
          <span className="pv-bottom-nav__label">Sheet</span>
        </button>
        <button
          className={`pv-bottom-nav__item${activeView === 'map' ? ' pv-bottom-nav__item--active' : ''}`}
          onClick={() => setActiveView('map')}
        >
          <span className="pv-bottom-nav__icon">
            <MapIcon size={18} strokeWidth={1.5} />
            {mapAvailable && activeView !== 'map' && (
              <span className="pv-bottom-nav__dot" />
            )}
          </span>
          <span className="pv-bottom-nav__label">Map</span>
        </button>
      </nav>
    </div>
  );
}
