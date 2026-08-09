import { type ReactNode, useState } from 'react';
import { useAuth, type Role } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Home, MessageSquare, QrCode, ClipboardList, UserIcon,
  LayoutDashboard, Leaf, Moon, Sun, LogOut, Bell,
} from '@/lib/icons';

export type Tab = 'home' | 'ai' | 'scanner' | 'complaints' | 'profile';

const navByRole: Record<Role, { key: Tab; label: string; icon: typeof Home }[]> = {
  citizen: [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'ai', label: 'AI', icon: MessageSquare },
    { key: 'complaints', label: 'Complaints', icon: ClipboardList },
    { key: 'profile', label: 'Profile', icon: UserIcon },
  ],
  worker: [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'ai', label: 'AI', icon: MessageSquare },
    { key: 'scanner', label: 'Scanner', icon: QrCode },
    { key: 'complaints', label: 'History', icon: ClipboardList },
    { key: 'profile', label: 'Profile', icon: UserIcon },
  ],
  admin: [
    { key: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'ai', label: 'AI', icon: MessageSquare },
    { key: 'complaints', label: 'Complaints', icon: ClipboardList },
    { key: 'profile', label: 'Profile', icon: UserIcon },
  ],
};

const roleLabel: Record<Role, string> = {
  citizen: 'Citizen',
  worker: 'Sanitation Worker',
  admin: 'Municipal Admin',
};

export default function AppShell({
  tab, setTab, children,
}: {
  tab: Tab; setTab: (t: Tab) => void; children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const role = user!.role;
  const nav = navByRole[role];

  return (
    <div className="min-h-screen app-bg theme-transition">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col p-5 z-40">
        <div className="glass-card flex flex-col h-full p-4">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center shadow-lg">
              <Leaf className="text-white" size={20} />
            </div>
            <div>
              <p className="font-bold font-display text-primary-c leading-none">CleanOS</p>
              <p className="text-[10px] text-muted-c mt-0.5">{roleLabel[role]}</p>
            </div>
          </div>

          <nav className="flex-1 mt-6 space-y-1">
            {nav.map((n) => {
              const Icon = n.icon;
              const active = tab === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => setTab(n.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-sm font-medium ${
                    active
                      ? 'bg-gradient-to-r from-emerald-500/15 to-blue-500/15 text-primary-c'
                      : 'text-secondary-c hover:bg-white/5'
                  }`}
                >
                  <Icon size={18} className={active ? 'text-emerald-500' : ''} />
                  {n.label}
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                </button>
              );
            })}
          </nav>

          <div className="space-y-1 pt-3 border-t border-soft-c">
            <button onClick={toggle} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary-c hover:bg-white/5 transition text-sm">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
            <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition text-sm">
              <LogOut size={18} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 px-4 pt-4 pb-2 app-bg">
        <div className="glass-card flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center">
              <Leaf className="text-white" size={18} />
            </div>
            <div>
              <p className="font-bold font-display text-primary-c text-sm leading-none">CleanOS</p>
              <p className="text-[10px] text-muted-c">{roleLabel[role]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="w-9 h-9 rounded-xl flex items-center justify-center text-secondary-c">
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button onClick={() => setNotifOpen(true)} className="relative w-9 h-9 rounded-xl flex items-center justify-center text-secondary-c">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            </button>
          </div>
        </div>
      </header>

      {/* Notifications drawer (mobile) */}
      {notifOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end animate-fade-in" onClick={() => setNotifOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-80 max-w-[85vw] glass-card rounded-none p-5 animate-slide-right" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-primary-c">Notifications</h3>
              <button onClick={() => setNotifOpen(false)} className="text-muted-c">✕</button>
            </div>
            <NotifList />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="lg:pl-64 pb-24 lg:pb-6 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" key={tab}>
          <div className="animate-fade-up">{children}</div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-3 pt-1 app-bg">
        <div className="glass-card flex items-center justify-around px-2 py-2">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = tab === n.key;
            return (
              <button
                key={n.key}
                onClick={() => setTab(n.key)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition ${
                  active ? 'text-emerald-500' : 'text-muted-c'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{n.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function NotifList() {
  const items = [
    { t: 'Pickup scheduled tomorrow', b: 'Next collection at 7:30 AM.', time: '1h' },
    { t: 'Complaint resolved', b: 'CMP-4805 — Bin replaced.', time: '3h' },
    { t: 'Green Points earned', b: 'You earned 15 points.', time: '5h' },
  ];
  return (
    <div className="space-y-3">
      {items.map((n, i) => (
        <div key={i} className="p-3 rounded-2xl bg-input-c border border-soft-c">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-primary-c">{n.t}</p>
            <span className="text-[10px] text-muted-c shrink-0">{n.time}</span>
          </div>
          <p className="text-xs text-secondary-c mt-1">{n.b}</p>
        </div>
      ))}
    </div>
  );
}
