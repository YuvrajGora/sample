import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, type House } from '@/lib/supabase';
import { StatCard, SectionTitle, Badge, EmptyState } from '@/components/ui/Primitives';
import {
  QrCode, MapPin, CheckCircle2, Clock, Route, Navigation,
  ShieldCheck, Loader2, RefreshCw, Home as HomeIcon, AlertTriangle,
} from '@/lib/icons';

const LANES = ['Lane A', 'Lane B', 'Lane C'];

export default function WorkerDashboard({ onOpenScanner }: { onOpenScanner?: () => void }) {
  const { user } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHouses = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.from('houses').select('*').order('id');
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setHouses((data as House[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchHouses(); }, [fetchHouses]);

  const collected = houses.filter((h) => h.collection_status === 'Collected').length;
  const pending = houses.length - collected;
  const total = houses.length;
  const pct = total > 0 ? Math.round((collected / total) * 100) : 0;

  const laneStats = LANES.map((lane) => {
    const laneHouses = houses.filter((h) => h.lane === lane);
    const laneCollected = laneHouses.filter((h) => h.collection_status === 'Collected').length;
    return {
      lane,
      total: laneHouses.length,
      collected: laneCollected,
      pending: laneHouses.length - laneCollected,
      pct: laneHouses.length > 0 ? Math.round((laneCollected / laneHouses.length) * 100) : 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="glass-card p-5 sm:p-6 relative overflow-hidden animate-fade-up">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-400/20 blur-2xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-secondary-c">Welcome back,</p>
            <h1 className="text-2xl font-bold font-display text-primary-c mt-0.5">{user?.name}</h1>
            <p className="text-xs text-muted-c mt-1 flex items-center gap-1">
              <ShieldCheck size={12} /> {user?.employeeId} · {user?.ward}
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
            {user?.avatar}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-12 flex flex-col items-center gap-4">
          <Loader2 size={28} className="animate-spin text-emerald-500" />
          <p className="text-sm text-secondary-c">Loading houses from database…</p>
        </div>
      ) : error ? (
        <div className="glass-card p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-500">
            <AlertTriangle size={26} />
          </div>
          <div>
            <p className="font-semibold text-primary-c">Failed to load houses</p>
            <p className="text-xs text-secondary-c mt-1">{error}</p>
          </div>
          <button onClick={fetchHouses} className="flex items-center gap-2 text-sm font-medium text-emerald-500 hover:underline">
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
            <StatCard label="Total Houses" value={total} icon={<HomeIcon size={20} />} accent="blue" delay={0.04} />
            <StatCard label="Collected Today" value={collected} icon={<CheckCircle2 size={20} />} accent="emerald" delay={0.08} />
            <StatCard label="Pending Today" value={pending} icon={<Clock size={20} />} accent="amber" delay={0.12} />
            <StatCard label="Progress" value={pct} suffix="%" icon={<Route size={20} />} accent="cyan" delay={0.16} />
          </div>

          {/* Overall progress bar */}
          <div className="glass-card p-5 animate-fade-up">
            <SectionTitle title="Collection Progress" subtitle={`${collected} of ${total} houses collected`} action={
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 rounded-full bg-input-c overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-600 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-semibold text-emerald-500">{pct}%</span>
              </div>
            } />
          </div>

          {/* Lane-wise progress */}
          <div className="glass-card p-5 animate-fade-up">
            <SectionTitle title="Lane-wise Progress" subtitle="Collection status by lane" />
            <div className="space-y-4">
              {laneStats.map((lane) => (
                <div key={lane.lane}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-muted-c" />
                      <span className="text-sm font-medium text-primary-c">{lane.lane}</span>
                    </div>
                    <span className="text-xs text-muted-c">
                      {lane.collected}/{lane.total} collected · {lane.pending} pending
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-input-c overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-600 transition-all duration-500"
                      style={{ width: `${lane.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* House list */}
          <div className="glass-card p-5 animate-fade-up">
            <SectionTitle
              title="All Houses"
              subtitle={`${total} houses across ${LANES.length} lanes`}
              action={
                <button onClick={fetchHouses} className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 hover:underline">
                  <RefreshCw size={14} /> Refresh
                </button>
              }
            />
            {houses.length === 0 ? (
              <EmptyState
                icon={<HomeIcon size={28} />}
                title="No houses found"
                subtitle="No houses exist in the database yet."
              />
            ) : (
              <div className="space-y-2.5">
                {houses.map((house, i) => {
                  const isCollected = house.collection_status === 'Collected';
                  return (
                    <div
                      key={house.id}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-input-c border border-soft-c animate-fade-up"
                      style={{ animationDelay: `${i * 0.03}s` }}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isCollected ? 'bg-emerald-500/15 text-emerald-500' : 'bg-slate-400/10 text-muted-c'
                      }`}>
                        {isCollected ? <CheckCircle2 size={18} /> : <span className="text-xs font-bold">{house.house_number}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary-c truncate">
                          {house.house_number} · {house.lane}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-c">
                          <span className="flex items-center gap-0.5"><MapPin size={11} /> {house.address}</span>
                        </div>
                        {house.last_collected && (
                          <p className="text-[11px] text-muted-c mt-0.5">
                            Last: {new Date(house.last_collected).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Badge status={isCollected ? 'Completed' : 'Pending'} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* QR scan shortcut */}
          <div
            onClick={onOpenScanner}
            className="glass-card p-5 flex items-center justify-between hover:scale-[1.01] transition group animate-fade-up cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 group-hover:scale-110 transition">
                <QrCode size={26} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-primary-c">QR Collection</p>
                <p className="text-xs text-secondary-c mt-0.5">Scan a house QR code to record collection</p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500">
              <Navigation size={18} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
