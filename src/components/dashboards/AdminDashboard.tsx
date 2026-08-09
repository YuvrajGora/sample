import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { StatCard, SectionTitle, Badge, EmptyState } from '@/components/ui/Primitives';
import { supabase, type House, type CollectionLog } from '@/lib/supabase';
import {
  Home, Truck, Users, AlertTriangle, Activity, TrendingUp, Sparkles,
  MapPin, ShieldCheck, Award, Gauge, ChevronRight, X, CheckCircle2, RefreshCw,
  Navigation, Zap, AlertTriangle as Alert, Clock, ClipboardList, Loader2
} from '@/lib/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

export type Complaint = {
  id: string;
  reporter_email: string;
  reporter_name: string;
  address: string;
  bin_number: string | null;
  description: string | null;
  waste_type: string;
  overflow: number;
  priority: string;
  status: string;
  summary: string | null;
  image_data: string | null;
  created_at: string;
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [collectionLogs, setCollectionLogs] = useState<CollectionLog[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [housesRes, logsRes, complaintsRes] = await Promise.all([
        supabase.from('houses').select('*').order('id'),
        supabase.from('collection_logs').select('*').order('collected_at', { ascending: false }),
        supabase.from('complaints').select('*').order('created_at', { ascending: false }),
      ]);

      if (housesRes.error) throw housesRes.error;
      if (logsRes.error) throw logsRes.error;
      if (complaintsRes.error) throw complaintsRes.error;

      setHouses(housesRes.data ?? []);
      setCollectionLogs(logsRes.data ?? []);
      setComplaints(complaintsRes.data ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculations
  const totalHouses = houses.length;
  const collectedToday = houses.filter((h) => h.collection_status === 'Collected').length;
  const pendingHouses = houses.filter((h) => h.collection_status === 'Pending').length;
  const collectionProgress = totalHouses > 0 ? Math.round((collectedToday / totalHouses) * 100) : 0;
  const pendingComplaintsCount = complaints.filter((c) => c.status === 'Pending').length;
  const overflowReportsCount = complaints.filter((c) => c.overflow > 80).length;
  
  // Performance matches progress
  const avgPerformance = collectionProgress;

  // Lane-wise collection
  const LANES = ['Lane A', 'Lane B', 'Lane C'];
  const laneStats = LANES.map((lane) => {
    const laneHouses = houses.filter((h) => h.lane === lane);
    const laneCollected = laneHouses.filter((h) => h.collection_status === 'Collected').length;
    const pct = laneHouses.length > 0 ? Math.round((laneCollected / laneHouses.length) * 100) : 0;
    return {
      zone: lane,
      level: pct,
      collections: laneCollected,
    };
  });

  // Weekly Collection Trends
  const getWeeklyData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      const dateStr = d.toDateString();

      // Count collections on this day
      const cols = collectionLogs.filter((log) => {
        const logDate = new Date(log.collected_at);
        return logDate.toDateString() === dateStr;
      }).length;

      // Count complaints on this day
      const comps = complaints.filter((c) => {
        const cDate = new Date(c.created_at);
        return cDate.toDateString() === dateStr;
      }).length;

      data.push({ day: dayName, collections: cols, complaints: comps });
    }
    return data;
  };
  const weeklyCollections = getWeeklyData();

  // Waste Breakdown
  const getWasteBreakdown = () => {
    if (complaints.length === 0) return [];
    const counts: Record<string, number> = {};
    complaints.forEach((c) => {
      const type = c.waste_type || 'Mixed Municipal Waste';
      counts[type] = (counts[type] || 0) + 1;
    });
    const total = complaints.length;
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
    return Object.keys(counts).map((name, i) => ({
      name,
      value: Math.round((counts[name] / total) * 100),
      color: colors[i % colors.length],
    }));
  };
  const wasteTypeBreakdown = getWasteBreakdown();

  // Workers dynamic stats mapped to lanes
  const getWorkerStats = () => {
    const laneAHouses = houses.filter((h) => h.lane === 'Lane A');
    const laneACollected = laneAHouses.filter((h) => h.collection_status === 'Collected').length;

    const laneBHouses = houses.filter((h) => h.lane === 'Lane B');
    const laneBCollected = laneBHouses.filter((h) => h.collection_status === 'Collected').length;

    const laneCHouses = houses.filter((h) => h.lane === 'Lane C');
    const laneCCollected = laneCHouses.filter((h) => h.collection_status === 'Collected').length;

    return [
      {
        id: 'W001',
        name: 'Ramesh Kumar',
        avatar: '👨‍✈️',
        status: laneACollected > 0 ? 'Online' : 'Offline',
        zone: 'Lane A',
        collectionsToday: laneACollected,
        target: laneAHouses.length,
        rating: 4.8,
      },
      {
        id: 'W002',
        name: 'Suresh Singh',
        avatar: '👨‍🔧',
        status: laneBCollected > 0 ? 'Online' : 'Offline',
        zone: 'Lane B',
        collectionsToday: laneBCollected,
        target: laneBHouses.length,
        rating: 4.6,
      },
      {
        id: 'W003',
        name: 'Amit Patel',
        avatar: '👷',
        status: laneCCollected > 0 ? 'Online' : 'Offline',
        zone: 'Lane C',
        collectionsToday: laneCCollected,
        target: laneCHouses.length,
        rating: 4.7,
      },
    ];
  };
  const workers = getWorkerStats();

  // AI Insights
  const getAiInsights = () => {
    const ins = [];
    if (collectionProgress === 100) {
      ins.push({
        title: 'Optimal Collection Day',
        body: 'All 15 houses have been successfully collected. Excellent efficiency today!',
        icon: 'zap',
        accent: 'emerald',
      });
    } else if (collectionProgress > 50) {
      ins.push({
        title: 'Collection in Progress',
        body: `More than half of the city is covered (${collectionProgress}%). Remaining houses are pending collection.`,
        icon: 'trend',
        accent: 'blue',
      });
    } else {
      ins.push({
        title: 'Low Coverage Alert',
        body: `Only ${collectionProgress}% of houses are collected today. High density of pending pickups in residential areas.`,
        icon: 'alert',
        accent: 'amber',
      });
    }

    const unresolved = complaints.filter((c) => c.status !== 'Resolved').length;
    if (unresolved > 0) {
      ins.push({
        title: 'Complaints Action Required',
        body: `There are ${unresolved} open complaints. Prioritize assigning workers to outstanding tasks.`,
        icon: 'alert',
        accent: 'amber',
      });
    } else {
      ins.push({
        title: 'No Pending Issues',
        body: 'All citizen complaints are resolved. Keep up the clean work!',
        icon: 'zap',
        accent: 'emerald',
      });
    }
    return ins;
  };
  const aiInsights = getAiInsights();
  const insightIcons: Record<string, typeof TrendingUp> = { trend: TrendingUp, alert: Alert, zap: Zap };
  const insightAccents: Record<string, string> = {
    emerald: 'text-emerald-500 bg-emerald-500/15',
    amber: 'text-amber-500 bg-amber-500/15',
    blue: 'text-blue-500 bg-blue-500/15',
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[50vh] gap-4">
        <Loader2 size={32} className="animate-spin text-cyan-500" />
        <p className="text-sm text-secondary-c">Loading admin dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-500">
          <AlertTriangle size={26} />
        </div>
        <div>
          <p className="font-semibold text-primary-c">Failed to load admin data</p>
          <p className="text-xs text-secondary-c mt-1">{error}</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 text-sm font-medium text-emerald-500 hover:underline">
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="glass-card p-5 sm:p-6 relative overflow-hidden animate-fade-up">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-cyan-400/20 blur-2xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-secondary-c">Municipal Control Center</p>
            <h1 className="text-2xl font-bold font-display text-primary-c mt-0.5">{user?.name}</h1>
            <p className="text-xs text-muted-c mt-1 flex items-center gap-1"><ShieldCheck size={12} /> {user?.ward}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
            {user?.avatar}
          </div>
        </div>
      </div>

      {/* Analytics cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 stagger">
        <StatCard label="Total Houses" value={totalHouses} icon={<Home size={20} />} accent="blue" delay={0.04} />
        <StatCard label="Collections Today" value={collectedToday} icon={<Truck size={20} />} accent="emerald" delay={0.08} />
        <StatCard label="Active Workers" value={workers.filter(w => w.status === 'Online').length} suffix={`/${workers.length}`} icon={<Users size={20} />} accent="cyan" delay={0.12} />
        <StatCard label="Pending Complaints" value={pendingComplaintsCount} icon={<AlertTriangle size={20} />} accent="amber" delay={0.16} />
        <StatCard label="Overflow Reports" value={overflowReportsCount} icon={<Gauge size={20} />} accent="rose" delay={0.20} />
        <StatCard label="Avg Performance" value={avgPerformance} suffix="%" icon={<Award size={20} />} accent="violet" delay={0.24} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly collections bar chart */}
        <div className="lg:col-span-2 glass-card p-5 animate-fade-up">
          <SectionTitle title="Weekly Collection Trends" subtitle="Collections vs complaints this week" />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weeklyCollections} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 12, fontSize: 12, backdropFilter: 'blur(20px)' }}
                cursor={{ fill: 'rgba(16,185,129,0.06)' }}
              />
              <Bar dataKey="collections" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Bar dataKey="complaints" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Waste type pie */}
        <div className="glass-card p-5 animate-fade-up" style={{ animationDelay: '0.05s' }}>
          <SectionTitle title="Waste Breakdown" subtitle="By type this month" />
          {wasteTypeBreakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-c text-xs">
              No waste reports available
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={wasteTypeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={3}>
                    {wasteTypeBreakdown.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {wasteTypeBreakdown.map((w) => (
                  <div key={w.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: w.color }} />
                    <span className="text-secondary-c truncate max-w-[80px]">{w.name}</span>
                    <span className="text-muted-c ml-auto">{w.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Collection heatmap + Recent collections + AI insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Heatmap */}
        <div className="glass-card p-5 animate-fade-up">
          <SectionTitle title="Collection Heatmap" subtitle="Lane-wise activity intensity" action={<MapPin size={16} className="text-emerald-500" />} />
          <div className="space-y-2.5">
            {laneStats.map((z) => (
              <div key={z.zone} className="flex items-center gap-3">
                <span className="text-xs text-secondary-c w-20 truncate">{z.zone}</span>
                <div className="flex-1 h-7 rounded-lg overflow-hidden bg-input-c relative">
                  <div
                    className="h-full rounded-lg transition-all duration-700 flex items-center justify-end px-2"
                    style={{
                      width: `${z.level}%`,
                      background: z.level > 80 ? 'linear-gradient(90deg,#ef4444,#f59e0b)' : z.level > 55 ? 'linear-gradient(90deg,#f59e0b,#10b981)' : 'linear-gradient(90deg,#10b981,#3b82f6)',
                    }}
                  >
                    <span className="text-[10px] font-semibold text-white">{z.level}%</span>
                  </div>
                </div>
                <span className="text-xs text-muted-c w-12 text-right">{z.collections} col</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4 text-[10px] text-muted-c">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Low</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Medium</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> High</span>
          </div>
        </div>

        {/* Recent Collections */}
        <div className="glass-card p-5 animate-fade-up" style={{ animationDelay: '0.05s' }}>
          <SectionTitle title="Recent Collections" subtitle="Latest logs from the field" action={<Clock size={16} className="text-cyan-500" />} />
          <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
            {collectionLogs.length === 0 ? (
              <div className="text-center py-10 text-muted-c text-xs">
                No collections recorded today.
              </div>
            ) : (
              collectionLogs.slice(0, 4).map((log) => {
                const logTime = new Date(log.collected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={log.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-input-c border border-soft-c">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-500 shrink-0">
                        <CheckCircle2 size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-primary-c truncate">House {log.house_id}</p>
                        <p className="text-[9px] text-muted-c">Verified pickup</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-secondary-c shrink-0">{logTime}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AI Insights */}
        <div className="glass-card p-5 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <SectionTitle title="AI Insights" subtitle="Generated from live city data" action={<Sparkles size={16} className="text-emerald-500" />} />
          <div className="space-y-3">
            {aiInsights.map((ins, i) => {
              const Icon = insightIcons[ins.icon];
              return (
                <div key={i} className="p-3.5 rounded-2xl bg-input-c border border-soft-c animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${insightAccents[ins.accent]}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary-c">{ins.title}</p>
                      <p className="text-xs text-secondary-c mt-1 leading-relaxed">{ins.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Worker status list */}
      <div className="glass-card p-5 animate-fade-up">
        <SectionTitle title="Worker Status" subtitle="Live field team overview" action={
          <button onClick={fetchData} className="flex items-center gap-1 text-xs font-medium text-emerald-500 hover:underline">
            <RefreshCw size={12} /> Refresh
          </button>
        } />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {workers.map((w) => (
            <div key={w.id} className="p-4 rounded-2xl bg-input-c border border-soft-c animate-fade-up">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                    {w.avatar}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${w.status === 'Online' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary-c truncate">{w.name}</p>
                  <p className="text-[10px] text-muted-c font-mono">{w.id}</p>
                </div>
                <Badge status={w.status} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-secondary-c">{w.zone}</span>
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] text-muted-c mb-1">
                  <span>Today's progress</span>
                  <span>{w.collectionsToday}/{w.target}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-600" style={{ width: `${Math.min((w.collectionsToday / w.target) * 100, 100)}%` }} />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                <Award size={12} className="text-amber-500" />
                <span className="text-secondary-c">{w.rating} rating</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent complaints table */}
      <div className="glass-card p-5 animate-fade-up">
        <SectionTitle title="Recent Complaints" subtitle="Tap to view, assign worker, or update status" />
        {complaints.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={28} />}
            title="No complaints reported"
            subtitle="There are currently no reported complaints in the database."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-c uppercase tracking-wider border-b border-soft-c">
                    <th className="pb-3 font-medium">ID</th>
                    <th className="pb-3 font-medium">Description</th>
                    <th className="pb-3 font-medium">Location</th>
                    <th className="pb-3 font-medium">Priority</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => (
                    <tr key={c.id} className="border-b border-soft-c last:border-0 hover:bg-white/5 transition cursor-pointer" onClick={() => setSelectedComplaint(c)}>
                      <td className="py-3 font-mono text-xs text-secondary-c">{c.id.substring(0, 8)}</td>
                      <td className="py-3 text-primary-c truncate max-w-[200px]">{c.description || c.waste_type}</td>
                      <td className="py-3 text-secondary-c">{c.address}</td>
                      <td className="py-3"><Badge status={c.priority} /></td>
                      <td className="py-3"><Badge status={c.status} /></td>
                      <td className="py-3 text-right"><ChevronRight size={16} className="text-muted-c" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="lg:hidden space-y-2.5">
              {complaints.map((c) => (
                <button key={c.id} onClick={() => setSelectedComplaint(c)} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-input-c border border-soft-c text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-c">{c.id.substring(0, 8)}</span>
                      <Badge status={c.priority} />
                    </div>
                    <p className="text-sm text-primary-c mt-0.5">{c.description || c.waste_type}</p>
                    <p className="text-xs text-muted-c flex items-center gap-1 mt-0.5"><MapPin size={10} /> {c.address}</p>
                  </div>
                  <Badge status={c.status} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Complaint detail modal */}
      {selectedComplaint && (
        <ComplaintDetail
          complaint={selectedComplaint}
          workers={workers}
          onClose={() => setSelectedComplaint(null)}
          onSave={fetchData}
        />
      )}
    </div>
  );
}

function ComplaintDetail({
  complaint,
  workers,
  onClose,
  onSave,
}: {
  complaint: Complaint;
  workers: any[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [status, setStatus] = useState(complaint.status);
  const [assigned, setAssigned] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleSaveChanges = async () => {
    setUpdating(true);
    const { error } = await supabase
      .from('complaints')
      .update({ status })
      .eq('id', complaint.id);
    setUpdating(false);
    if (error) {
      alert(error.message);
    } else {
      onSave();
      onClose();
    }
  };

  const formattedDate = new Date(complaint.created_at).toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg glass-card p-6 animate-scale-in max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <AlertTriangle size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-primary-c">Complaint {complaint.id.substring(0, 8)}</h2>
              <p className="text-xs text-muted-c">{formattedDate}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-c hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-input-c border border-soft-c">
              <p className="text-xs text-muted-c">Type</p>
              <p className="text-sm font-semibold text-primary-c truncate">{complaint.description || 'Garbage Report'}</p>
            </div>
            <div className="p-3 rounded-2xl bg-input-c border border-soft-c">
              <p className="text-xs text-muted-c">Waste Type</p>
              <p className="text-sm font-semibold text-primary-c truncate">{complaint.waste_type}</p>
            </div>
            <div className="p-3 rounded-2xl bg-input-c border border-soft-c">
              <p className="text-xs text-muted-c">Priority</p>
              <Badge status={complaint.priority} />
            </div>
            <div className="p-3 rounded-2xl bg-input-c border border-soft-c">
              <p className="text-xs text-muted-c">Overflow</p>
              <p className="text-sm font-semibold text-primary-c">{complaint.overflow}%</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-input-c border border-soft-c">
            <p className="text-xs text-muted-c mb-1">Location</p>
            <p className="text-sm text-primary-c flex items-center gap-1"><MapPin size={14} className="text-emerald-500" /> {complaint.address}</p>
          </div>

          {complaint.summary && (
            <div className="p-3 rounded-2xl bg-input-c border border-soft-c">
              <p className="text-xs text-muted-c mb-1">AI Summary</p>
              <p className="text-sm text-secondary-c leading-relaxed">{complaint.summary}</p>
            </div>
          )}

          {/* Assign worker */}
          <div>
            <p className="text-xs text-muted-c mb-2">Assign Worker</p>
            <div className="grid grid-cols-1 gap-2">
              {workers.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setAssigned(w.name)}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl border transition text-left ${
                    assigned.includes(w.name) ? 'border-emerald-400 bg-emerald-500/10' : 'border-soft-c bg-input-c'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {w.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-c">{w.name}</p>
                    <p className="text-[10px] text-muted-c">{w.id} · {w.zone}</p>
                  </div>
                  {assigned.includes(w.name) && <CheckCircle2 size={18} className="text-emerald-500" />}
                </button>
              ))}
            </div>
          </div>

          {/* Update status */}
          <div>
            <p className="text-xs text-muted-c mb-2">Update Status</p>
            <div className="flex gap-2">
              {['Pending', 'Assigned', 'In Progress', 'Resolved'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatus(st)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition ${
                    status === st ? 'bg-gradient-to-r from-emerald-500 to-blue-600 text-white' : 'bg-input-c text-secondary-c border border-soft-c'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveChanges}
            disabled={updating}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.01] transition disabled:opacity-50"
          >
            {updating ? 'Saving...' : (
              <>
                <CheckCircle2 size={18} /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
