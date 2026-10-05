import { Outlet } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CommandPalette from './CommandPalette';
import PulseAILauncher from './PulseAILauncher';
import { PulseChatProvider } from '../context/PulseChatContext';
import { api } from '../api/client';

export default function AppLayout() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    api
      .notifications()
      .then((rows) => setUnreadCount(rows.filter((n) => !n.read).length))
      .catch(() => {});
  }, []);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <PulseChatProvider>
      <div className="flex min-h-screen bg-[#f5f5fb]">
        <Sidebar unreadCount={unreadCount} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar unreadCount={unreadCount} onOpenPalette={openPalette} />
          <main className="flex-1 p-6 overflow-x-hidden">
            <Outlet context={{ unreadCount, setUnreadCount }} />
          </main>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onClose={closePalette} />
      <PulseAILauncher />
    </PulseChatProvider>
  );
}
