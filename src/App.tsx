import { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { CharacterSheet } from './components/CharacterSheet';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
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
      <Sidebar open={sidebarOpen} onNavigate={closeSidebar} />
      <CharacterSheet />
    </div>
  );
}
