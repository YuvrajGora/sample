import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, type House, type PickupSchedule } from '@/lib/supabase';
import { fetchSchedules, subscribeToPickupSchedules } from '@/lib/pickupScheduleService';
import { StatCard, SectionTitle, Badge, EmptyState } from '@/components/ui/Primitives';
import {
  QrCode, MapPin, CheckCircle2, Clock, Route, Navigation,
  ShieldCheck, Loader2, RefreshCw, Home as HomeIcon, AlertTriangle, Calendar
} from '@/lib/icons';

import MapView from '@/components/ui/MapView';

const LANES = ['Lane A', 'Lane B', 'Lane C'];

export default function WorkerDashboard({ onOpenScanner }: { onOpenScanner?: () => void }) {
  const { user } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [schedules, setSchedules] = useState<PickupSchedule[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.from('houses').select('*').order('id');
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const houseList = (data as House[]) ?? [];
    setHouses(houseList);

    // Fetch today's pickup schedules
    const todaySchedules = await fetchSchedules(todayStr);
    setSchedules(todaySchedules);

    setLoading(false);
  }, [todayStr]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const unsub = subscribeToPickupSchedules(() => {
      fetchSchedules(todayStr).then(setSchedules);
    });
    return () => unsub();
  }, [todayStr]);

  const collected = houses.filter((h) => h.collection_status === 'Collected').length;
  const pending = houses.length - collected;
  const total = houses.length;
  const pct = total > 0 ? Math.round((collected / total) * 100) : 0;

  // Prioritize pending houses first, then collected houses
  const sortedHouses = [...houses].sort((a, b) => {
    if (a.collection_status === 'Pending' && b.collection_status === 'Collected') return -1;
    if (a.collection_status === 'Collected' && b.collection_status === 'Pending') return 1;
    return a.id.localeCompare(b.id);
  });

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
          <Loader2 size={32} className="animate-spin text-emerald-500" />
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
          <button onClick={fetchDashboardData} className="flex items-center gap-2 text-sm font-medium text-emerald-500 hover:underline">
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

          {/* Interactive Sector Map Section */}
          <div className="animate-fade-up">
            <MapView
              houses={houses}
              selectedHouseId={selectedHouseId}
              showWorkerLocation={true}
              height="h-[380px]"
              onSelectHouse={(h) => setSelectedHouseId(h.id)}
            />
          </div>

          {/* Scheduled Pickups Today (Separated by 7:00 AM and 12:00 PM) */}
          <div className="glass-card p-5 animate-fade-up space-y-4">
            <SectionTitle
              title="Today's Scheduled Pickups"
              subtitle="Resident-requested waste pickups separated by slot"
              action={<Calendar size={16} className="text-emerald-500" />}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 7:00 AM Slot Card */}
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🌅</span>
                    <h3 className="text-sm font-bold text-primary-c">7:00 AM Slot (Morning)</h3>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500">
                    {schedules.filter((s) => s.slot === '07:00').length} Requested
                  </span>
                </div>

                {schedules.filter((s) => s.slot === '07:00').length === 0 ? (
                  <p className="text-xs text-muted-c italic py-2">No 7:00 AM pickups scheduled today.</p>
                ) : (
                  <div className="space-y-2.5">
                    {schedules.filter((s) => s.slot === '07:00').map((s) => {
                      const h = houses.find((item) => item.id === s.house_id);
                      return (
                        <div key={s.id} className="p-3 rounded-xl bg-input-c border border-soft-c space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono text-primary-c">House {h?.house_number || s.house_id}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                              s.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' :
                              s.status === 'cancelled' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'
                            }`}>
                              {s.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-secondary-c truncate">{h?.address || 'Municipal Address'}</p>
                          {h && h.latitude && h.longitude && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold text-emerald-500 hover:underline flex items-center gap-1 pt-1"
                            >
                              <Navigation size={11} /> Open Directions
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 12:00 PM Slot Card */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">☀️</span>
                    <h3 className="text-sm font-bold text-primary-c">12:00 PM Slot (Midday)</h3>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500">
                    {schedules.filter((s) => s.slot === '12:00').length} Requested
                  </span>
                </div>

                {schedules.filter((s) => s.slot === '12:00').length === 0 ? (
                  <p className="text-xs text-muted-c italic py-2">No 12:00 PM pickups scheduled today.</p>
                ) : (
                  <div className="space-y-2.5">
                    {schedules.filter((s) => s.slot === '12:00').map((s) => {
                      const h = houses.find((item) => item.id === s.house_id);
                      return (
                        <div key={s.id} className="p-3 rounded-xl bg-input-c border border-soft-c space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono text-primary-c">House {h?.house_number || s.house_id}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                              s.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' :
                              s.status === 'cancelled' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'
                            }`}>
                              {s.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-secondary-c truncate">{h?.address || 'Municipal Address'}</p>
                          {h && h.latitude && h.longitude && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold text-emerald-500 hover:underline flex items-center gap-1 pt-1"
                            >
                              <Navigation size={11} /> Open Directions
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
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

          {/* House list with prioritized pending houses and directions */}
          <div className="glass-card p-5 animate-fade-up">
            <SectionTitle
              title="Sector Houses"
              subtitle={`${pending} pending · ${collected} collected (Pending prioritized)`}
              action={
                <button onClick={fetchDashboardData} className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 hover:underline">
                  <RefreshCw size={14} /> Refresh
                </button>
              }
            />
            {sortedHouses.length === 0 ? (
              <EmptyState
                icon={<HomeIcon size={28} />}
                title="No houses found"
                subtitle="No houses exist in the database yet."
              />
            ) : (
              <div className="space-y-2.5">
                {sortedHouses.map((house, i) => {
                  const isCollected = house.collection_status === 'Collected';
                  const isSelected = house.id === selectedHouseId;
                  const lat = Number(house.latitude);
                  const lng = Number(house.longitude);
                  const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

                  return (
                    <div
                      key={house.id}
                      onClick={() => setSelectedHouseId(house.id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition cursor-pointer animate-fade-up ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-md'
                          : 'bg-input-c border-soft-c hover:bg-white/5'
                      }`}
                      style={{ animationDelay: `${i * 0.02}s` }}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isCollected ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500 font-bold'
                      }`}>
                        {isCollected ? <CheckCircle2 size={18} /> : <span className="text-xs font-bold">{house.house_number}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-primary-c truncate">
                            {house.house_number} · {house.lane}
                          </p>
                          <span className="text-[10px] text-muted-c font-mono">({house.id})</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-c">
                          <span className="flex items-center gap-0.5 truncate"><MapPin size={11} /> {house.address}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge status={isCollected ? 'Completed' : 'Pending'} />
                        <a
                          href={dirUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] font-semibold text-emerald-500 hover:underline flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg"
                        >
                          <Navigation size={11} /> Directions
                        </a>
                      </div>
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
