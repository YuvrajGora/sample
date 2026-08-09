import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { SectionTitle, Badge } from '@/components/ui/Primitives';
import {
  Leaf, Moon, Sun, LogOut, Bell, Award, Star, Recycle, AlertTriangle,
  ShieldCheck, Truck, Users, MapPin, CheckCircle2, Settings, ChevronRight,
} from '@/lib/icons';

const roleLabel: Record<string, string> = {
  citizen: 'Citizen',
  worker: 'Sanitation Worker',
  admin: 'Municipal Admin',
};

export default function ProfileView() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const role = user!.role;

  const stats = role === 'citizen'
    ? [{ label: 'Green Points', value: '1,240', icon: Award, accent: 'amber' }, { label: 'Reports Filed', value: '7', icon: AlertTriangle, accent: 'blue' }, { label: 'Recycling Streak', value: '12 days', icon: Recycle, accent: 'emerald' }]
    : role === 'worker'
    ? [{ label: 'Collections Today', value: '38', icon: Truck, accent: 'emerald' }, { label: 'Rating', value: '4.8 ★', icon: Star, accent: 'amber' }, { label: 'Employee ID', value: 'SW-2041', icon: ShieldCheck, accent: 'blue' }]
    : [{ label: 'Zones Managed', value: '6', icon: MapPin, accent: 'blue' }, { label: 'Active Workers', value: '5', icon: Users, accent: 'emerald' }, { label: 'Complaints Resolved', value: '142', icon: CheckCircle2, accent: 'amber' }];

  const accentMap: Record<string, string> = {
    emerald: 'from-emerald-400 to-emerald-600',
    blue: 'from-blue-400 to-blue-600',
    amber: 'from-amber-400 to-orange-500',
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Profile header */}
      <div className="glass-card p-6 relative overflow-hidden animate-fade-up">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-400/15 blur-2xl" />
        <div className="relative flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-emerald-500/30 mb-3">
            {user?.avatar}
          </div>
          <h1 className="text-xl font-bold font-display text-primary-c">{user?.name}</h1>
          <p className="text-sm text-secondary-c">{user?.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <ShieldCheck size={12} /> {roleLabel[role]}
            </span>
            {role === 'citizen' && <Badge status="Gold Tier" />}
          </div>
          {(user?.zone || user?.ward) && (
            <p className="text-xs text-muted-c mt-2 flex items-center gap-1"><MapPin size={11} /> {user.zone || user.ward}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 stagger">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="glass-card p-4 text-center">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${accentMap[s.accent]} flex items-center justify-center text-white mx-auto mb-2`}>
                <Icon size={18} />
              </div>
              <p className="text-lg font-bold font-display text-primary-c">{s.value}</p>
              <p className="text-[10px] text-muted-c mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Settings list */}
      <div className="glass-card p-2 animate-fade-up">
        <button onClick={toggle} className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-white/5 transition">
          <div className="w-9 h-9 rounded-xl bg-input-c flex items-center justify-center text-secondary-c">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </div>
          <span className="flex-1 text-left text-sm text-primary-c">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
          <div className={`w-10 h-5 rounded-full transition relative ${theme === 'dark' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition ${theme === 'dark' ? 'left-5' : 'left-0.5'}`} />
          </div>
        </button>
        <button className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-white/5 transition">
          <div className="w-9 h-9 rounded-xl bg-input-c flex items-center justify-center text-secondary-c">
            <Bell size={16} />
          </div>
          <span className="flex-1 text-left text-sm text-primary-c">Notifications</span>
          <ChevronRight size={16} className="text-muted-c" />
        </button>
        <button className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-white/5 transition">
          <div className="w-9 h-9 rounded-xl bg-input-c flex items-center justify-center text-secondary-c">
            <Settings size={16} />
          </div>
          <span className="flex-1 text-left text-sm text-primary-c">Settings</span>
          <ChevronRight size={16} className="text-muted-c" />
        </button>
      </div>

      {/* Sign out */}
      <button onClick={logout} className="w-full glass-card p-3.5 flex items-center justify-center gap-2 text-rose-500 hover:bg-rose-500/10 transition animate-fade-up">
        <LogOut size={18} /> Sign out
      </button>

      <p className="text-center text-xs text-muted-c pt-2 flex items-center justify-center gap-1">
        <Leaf size={12} /> CleanOS v1.0 · Smart Waste Management
      </p>
    </div>
  );
}
