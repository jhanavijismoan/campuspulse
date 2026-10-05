import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import PulseAILauncher from './PulseAILauncher';
import { PulseChatProvider } from '../context/PulseChatContext';
import { api } from '../api/client';

export default function AppLayout() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api
      .notifications()
      .then((rows) => setUnreadCount(rows.filter((n) => !n.read).length))
      .catch(() => {});
  }, []);

  return (
    <PulseChatProvider>
      <div className="flex min-h-screen bg-[#f5f5fb]">
        <Sidebar unreadCount={unreadCount} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar unreadCount={unreadCount} />
          <main className="flex-1 p-6 overflow-x-hidden">
            <Outlet context={{ unreadCount, setUnreadCount }} />
          </main>
        </div>
      </div>
      <PulseAILauncher />
    </PulseChatProvider>
  );
}
