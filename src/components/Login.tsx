import { useState } from 'react';
import { useAuth, type Role } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Leaf, Users, Truck, ShieldCheck, Moon, Sun, ArrowRight, Sparkles } from '@/lib/icons';

const roles: { key: Role; title: string; desc: string; icon: typeof Users; accent: string }[] = [
  { key: 'citizen', title: 'Citizen', desc: 'Report issues, track pickups, earn Green Points', icon: Users, accent: 'from-emerald-400 to-emerald-600' },
  { key: 'worker', title: 'Sanitation Worker', desc: 'Scan routes, verify collections, complete tasks', icon: Truck, accent: 'from-blue-400 to-blue-600' },
  { key: 'admin', title: 'Municipal Admin', desc: 'Analytics, complaint management, worker oversight', icon: ShieldCheck, accent: 'from-cyan-400 to-blue-500' },
];

export default function Login() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const [selected, setSelected] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!selected) return;
    setLoading(true);
    setTimeout(() => login(selected), 900);
  };

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4 sm:p-6">
      <div className="absolute top-5 right-5">
        <button
          onClick={toggle}
          className="w-10 h-10 rounded-full glass flex items-center justify-center text-secondary-c hover:scale-105 transition"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-emerald-400/20 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-blue-400/20 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

      <div className="relative w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400 to-blue-600 shadow-xl shadow-emerald-500/30 mb-4">
            <Leaf className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold font-display gradient-text">CleanOS</h1>
          <p className="text-sm text-secondary-c mt-1.5">AI-Powered Smart Waste Management</p>
        </div>

        <div className="glass-card p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-emerald-500" />
            <h2 className="text-lg font-semibold text-primary-c">Choose your role to continue</h2>
          </div>
          <p className="text-sm text-secondary-c mb-6">One account, three experiences. Select how you want to sign in today.</p>

          <div className="space-y-3 stagger">
            {roles.map((r) => {
              const Icon = r.icon;
              const active = selected === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => setSelected(r.key)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                    active
                      ? 'glass border-emerald-400 ring-2 ring-emerald-400/40 scale-[1.02]'
                      : 'border-soft-c hover:border-emerald-400/40 hover:scale-[1.01]'
                  }`}
                  style={{ background: active ? 'var(--glass-bg)' : 'var(--input-bg)' }}
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${r.accent} flex items-center justify-center text-white shadow-lg shrink-0`}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary-c">{r.title}</p>
                    <p className="text-xs text-secondary-c mt-0.5 truncate">{r.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                    active ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {active && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleLogin}
            disabled={!selected || loading}
            className="w-full mt-6 h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                Signing in...
              </>
            ) : (
              <>
                Continue <ArrowRight size={18} />
              </>
            )}
          </button>

          <p className="text-center text-xs text-muted-c mt-5">
            Demo build — no real credentials needed. Pick a role to explore.
          </p>
        </div>
      </div>
    </div>
  );
}
