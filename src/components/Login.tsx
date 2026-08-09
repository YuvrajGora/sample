import { useState } from 'react';
import { useAuth, type Role } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Leaf, Users, Truck, ShieldCheck, Moon, Sun, ArrowRight, Sparkles, Key, Home, AlertTriangle } from '@/lib/icons';

export default function Login() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'resident' | 'staff'>('resident');
  const [selectedStaff, setSelectedStaff] = useState<'worker' | 'admin' | null>(null);
  
  const [houseNumber, setHouseNumber] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleResidentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseNumber.trim() || !password.trim()) {
      setErrorMsg('Please enter both House/Flat Number and Password.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    const result = await login('resident', { houseNumber, password });
    if (result.error) {
      setErrorMsg(result.error);
      setLoading(false);
    }
  };

  const handleStaffLogin = async () => {
    if (!selectedStaff) return;
    setErrorMsg(null);
    setLoading(true);

    const result = await login(selectedStaff);
    if (result.error) {
      setErrorMsg(result.error);
      setLoading(false);
    }
  };

  const triggerDemoResident = () => {
    setHouseNumber('A101');
    setPassword('password123');
    setErrorMsg(null);
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
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-emerald-400/10 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-blue-400/10 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

      <div className="relative w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400 to-blue-600 shadow-xl shadow-emerald-500/30 mb-4">
            <Leaf className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold font-display gradient-text">CleanOS</h1>
          <p className="text-sm text-secondary-c mt-1.5">Smart Municipal Waste System</p>
        </div>

        <div className="glass-card overflow-hidden">
          {/* Custom Tabs */}
          <div className="flex border-b border-soft-c">
            <button
              onClick={() => { setActiveTab('resident'); setErrorMsg(null); }}
              className={`flex-1 py-4 text-sm font-semibold text-center transition ${
                activeTab === 'resident'
                  ? 'border-b-2 border-emerald-500 text-emerald-500 dark:text-emerald-400 bg-white/5'
                  : 'text-secondary-c hover:text-primary-c'
              }`}
            >
              Resident Portal
            </button>
            <button
              onClick={() => { setActiveTab('staff'); setErrorMsg(null); }}
              className={`flex-1 py-4 text-sm font-semibold text-center transition ${
                activeTab === 'staff'
                  ? 'border-b-2 border-emerald-500 text-emerald-500 dark:text-emerald-400 bg-white/5'
                  : 'text-secondary-c hover:text-primary-c'
              }`}
            >
              Municipal Staff
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-rose-600 dark:text-rose-400 text-sm">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {activeTab === 'resident' ? (
              <form onSubmit={handleResidentLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-secondary-c uppercase tracking-wider mb-2 block">
                    House/Flat Number
                  </label>
                  <div className="flex items-center gap-2.5 px-3.5 h-12 rounded-2xl bg-input-c border border-soft-c focus-within:border-emerald-400/50 transition">
                    <Home size={16} className="text-muted-c shrink-0" />
                    <input
                      type="text"
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      placeholder="e.g. A101, B203"
                      className="flex-1 bg-transparent outline-none text-sm text-primary-c placeholder:text-muted-c font-semibold uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary-c uppercase tracking-wider mb-2 block">
                    Password
                  </label>
                  <div className="flex items-center gap-2.5 px-3.5 h-12 rounded-2xl bg-input-c border border-soft-c focus-within:border-emerald-400/50 transition">
                    <Key size={16} className="text-muted-c shrink-0" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter house password"
                      className="flex-1 bg-transparent outline-none text-sm text-primary-c placeholder:text-muted-c"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={triggerDemoResident}
                    className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 hover:underline transition"
                  >
                    Use Demo Resident (A101)
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.01] transition disabled:opacity-40"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Sign In <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-secondary-c mb-4">
                  Select your role to access the staff terminal. Authentic tokens will be generated.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedStaff('worker')}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition text-left ${
                      selectedStaff === 'worker'
                        ? 'glass border-emerald-400 ring-2 ring-emerald-400/20 scale-[1.01]'
                        : 'border-soft-c hover:border-emerald-400/30'
                    }`}
                    style={{ background: selectedStaff === 'worker' ? 'var(--glass-bg)' : 'var(--input-bg)' }}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-lg shrink-0">
                      <Truck size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-primary-c">Sanitation Worker</p>
                      <p className="text-xs text-secondary-c mt-0.5">Route collection & GPS checks</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedStaff('admin')}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition text-left ${
                      selectedStaff === 'admin'
                        ? 'glass border-emerald-400 ring-2 ring-emerald-400/20 scale-[1.01]'
                        : 'border-soft-c hover:border-emerald-400/30'
                    }`}
                    style={{ background: selectedStaff === 'admin' ? 'var(--glass-bg)' : 'var(--input-bg)' }}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white shadow-lg shrink-0">
                      <ShieldCheck size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-primary-c">Municipal Admin</p>
                      <p className="text-xs text-secondary-c mt-0.5">Management, logs & analytics</p>
                    </div>
                  </button>
                </div>

                <button
                  onClick={handleStaffLogin}
                  disabled={!selectedStaff || loading}
                  className="w-full mt-4 h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.01] transition disabled:opacity-40"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Secure Sign In <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
