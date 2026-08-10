import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { StatCard, SectionTitle, Badge, EmptyState } from '@/components/ui/Primitives';
import ReportIssue from '@/components/ReportIssue';
import MapView from '@/components/ui/MapView';
import PickupSchedulerModal from '@/components/scheduling/PickupSchedulerModal';
import {
  fetchActiveScheduleForHouse,
  subscribeToPickupSchedules,
  cancelSchedule,
} from '@/lib/pickupScheduleService';
import type { PickupSchedule } from '@/lib/supabase';
import {
  fetchResidentGreenPoints,
  subscribeToGreenPoints,
  type GreenPointsLedgerItem,
  type EcoRankInfo,
  calculateEcoRank,
} from '@/lib/greenPointsService';
import {
  Leaf, Plus, Truck, Award, Activity, Bell, Clock, MapPin, CheckCircle2,
  Star, AlertTriangle, Recycle, Sparkles, ChevronRight, ClipboardList, Loader2, Navigation,
  Calendar, XCircle, RefreshCw, Zap
} from '@/lib/icons';

type HouseDetails = {
  id: string;
  lane: string;
  house_number: string;
  address: string;
  collection_status: string;
  last_collected: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type CollectionLog = {
  id: string;
  collected_at: string;
  latitude: number | null;
  longitude: number | null;
};

type Complaint = {
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
  created_at: string;
};

type Notification = {
  id: string;
  title: string;
  body?: string;
  message?: string;
  created_at: string;
};

export default function ResidentDashboard({ onOpenAI }: { onOpenAI: () => void }) {
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [activeSchedule, setActiveSchedule] = useState<PickupSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [house, setHouse] = useState<HouseDetails | null>(null);
  const [logs, setLogs] = useState<CollectionLog[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [greenPoints, setGreenPoints] = useState<number>(0);
  const [pointsLedger, setPointsLedger] = useState<GreenPointsLedgerItem[]>([]);
  const [ecoRank, setEcoRank] = useState<EcoRankInfo>(calculateEcoRank(0));

  const loadPoints = async () => {
    if (!user?.id) return;
    const summary = await fetchResidentGreenPoints(user.id);
    setGreenPoints(summary.points);
    setPointsLedger(summary.ledger);
    setEcoRank(summary.rank);
  };

  const loadSchedule = async () => {
    if (!user?.house_id) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const sched = await fetchActiveScheduleForHouse(user.house_id, todayStr);
    setActiveSchedule(sched);
  };

  const fetchData = async () => {
    if (!user?.house_id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch house
      const { data: houseData, error: houseErr } = await supabase
        .from('houses')
        .select('*')
        .eq('id', user.house_id)
        .maybeSingle();

      if (houseErr) throw houseErr;
      setHouse(houseData);

      // 2. Fetch collection history
      const { data: logsData, error: logsErr } = await supabase
        .from('collection_logs')
        .select('*')
        .eq('house_id', user.house_id)
        .order('collected_at', { ascending: false })
        .limit(5);

      if (logsErr) throw logsErr;
      setLogs(logsData || []);

      // 3. Fetch complaints
      const { data: complaintsData, error: compErr } = await supabase
        .from('complaints')
        .select('*')
        .eq('house_id', user.house_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (compErr) throw compErr;
      setComplaints(complaintsData || []);

      // 4. Fetch notifications
      const { data: notifData, error: notifErr } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (notifErr) throw notifErr;
      setNotifications(notifData || []);

      // 5. Fetch active pickup schedule & Green Points
      await Promise.all([loadSchedule(), loadPoints()]);

    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.house_id]);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeToGreenPoints(user.id, () => {
      loadPoints();
    });
    return () => unsub();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.house_id) return;
    const unsub = subscribeToPickupSchedules(() => {
      loadSchedule();
    });
    return () => unsub();
  }, [user?.house_id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
        <p className="text-sm text-secondary-c">Syncing house database...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="glass-card p-6 border border-rose-500/20 text-center space-y-4">
        <AlertTriangle className="text-rose-500 mx-auto" size={36} />
        <h3 className="font-bold text-primary-c">Database Error</h3>
        <p className="text-sm text-secondary-c">{errorMsg}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold text-sm hover:bg-emerald-600 transition">
          Retry Sync
        </button>
      </div>
    );
  }

  const isCollectedToday = house?.collection_status === 'Collected';

  return (
    <div className="space-y-6">
      {/* Welcome & House details */}
      <div className="glass-card p-5 sm:p-6 relative overflow-hidden animate-fade-up">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-c uppercase tracking-wider font-semibold">Registered Property</p>
            <h1 className="text-2xl font-bold font-display text-primary-c mt-0.5">
              House {house?.house_number || user?.name}
            </h1>
            <p className="text-xs text-muted-c mt-1 flex items-center gap-1">
              <MapPin size={12} className="text-emerald-500" /> {house?.address || 'CleanOS Municipal Area'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-c">Lane:</span>
            <Badge status={house?.lane || 'Lane A'} />
          </div>
        </div>
      </div>

      {/* Green Points & Eco Rank Card */}
      <div className="glass-card p-5 sm:p-6 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 relative overflow-hidden animate-fade-up">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
              <Leaf size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Green Points & Eco Rewards
                </p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                  {ecoRank.badge}
                </span>
              </div>
              <p className="text-2xl font-black font-display text-primary-c mt-0.5 flex items-center gap-1.5">
                {greenPoints.toLocaleString()} <span className="text-xs font-semibold text-muted-c">PTS</span>
              </p>
            </div>
          </div>

          <div className="w-full sm:w-48 space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold text-secondary-c">
              <span>{ecoRank.level}</span>
              <span>{ecoRank.nextPoints ? `${greenPoints}/${ecoRank.nextPoints} PTS` : 'MAX LEVEL'}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500 rounded-full"
                style={{ width: `${ecoRank.progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Recent Points Activity List */}
        {pointsLedger.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-c">Recent Eco Reward Activity</p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
              {pointsLedger.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-emerald-500/5 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-medium text-primary-c truncate">{item.description}</span>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                    +{item.points} PTS
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <button onClick={() => setScheduleModalOpen(true)} className="glass-card p-3.5 sm:p-4 flex flex-col items-start gap-2 hover:scale-[1.02] transition group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition">
            <Calendar size={18} />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-primary-c">Schedule Pickup</span>
        </button>

        <button onClick={() => setReportOpen(true)} className="glass-card p-3.5 sm:p-4 flex flex-col items-start gap-2 hover:scale-[1.02] transition group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition">
            <Plus size={18} />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-primary-c">Report Issue</span>
        </button>

        <button onClick={onOpenAI} className="glass-card p-3.5 sm:p-4 flex flex-col items-start gap-2 hover:scale-[1.02] transition group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition">
            <Sparkles size={18} />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-primary-c">Ask Assistant</span>
        </button>
      </div>

      {/* Real-time Scheduled Pickup Banner */}
      {activeSchedule && (
        <div className="glass-card p-5 border border-emerald-500/30 bg-emerald-500/10 animate-fade-up space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Scheduled Pickup Reserved
              </span>
            </div>
            <button
              onClick={() => setScheduleModalOpen(true)}
              className="text-xs font-bold text-emerald-500 hover:underline flex items-center gap-1"
            >
              <RefreshCw size={12} /> Manage
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div>
              <p className="text-base font-bold text-primary-c flex items-center gap-2">
                <Clock size={16} className="text-emerald-500" />
                Slot: {activeSchedule.slot === '07:00' ? '7:00 AM (Morning)' : '12:00 PM (Midday)'}
              </p>
              <p className="text-xs text-secondary-c mt-0.5">
                Date: <span className="font-medium text-primary-c">{activeSchedule.scheduled_date}</span> · Status: <span className="font-semibold text-emerald-500 capitalize">{activeSchedule.status}</span>
              </p>
            </div>

            <button
              onClick={async () => {
                if (confirm('Cancel this scheduled pickup?')) {
                  await cancelSchedule(activeSchedule.id);
                  loadSchedule();
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-500 text-xs font-bold hover:bg-rose-500/25 transition flex items-center justify-center gap-1"
            >
              <XCircle size={12} /> Cancel Pickup
            </button>
          </div>
        </div>
      )}

      {/* Today status */}
      <div className="glass-card p-5 animate-fade-up">
        <SectionTitle title="Today's Collection Status" subtitle="Live updates from your sector" />
        <div className={`flex items-center gap-4 p-4 rounded-2xl border ${
          isCollectedToday 
            ? 'bg-emerald-500/10 border-emerald-400/20' 
            : 'bg-amber-500/10 border-amber-400/20'
        }`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
            isCollectedToday ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
          }`}>
            <Truck size={26} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-primary-c">{house?.collection_status || 'Pending'}</p>
              <Badge status={house?.collection_status || 'Pending'} />
            </div>
            <p className="text-xs text-secondary-c mt-0.5 truncate">
              {isCollectedToday 
                ? `Last collected: ${house?.last_collected ? new Date(house.last_collected).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Today'}`
                : 'Collection scheduled for today'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Compact Property Location Map */}
      {house && (
        <div className="glass-card p-5 animate-fade-up space-y-3">
          <SectionTitle
            title="Property Location"
            subtitle={house.address}
            action={
              house.latitude && house.longitude ? (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${house.latitude},${house.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 hover:underline bg-emerald-500/10 px-3 py-1.5 rounded-xl"
                >
                  <Navigation size={13} /> Open Directions
                </a>
              ) : null
            }
          />
          <MapView
            houses={[house as any]}
            selectedHouseId={house.id}
            height="h-[200px]"
            compact={true}
          />
        </div>
      )}

      {/* Collection history & complaints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collection history */}
        <div className="glass-card p-5 animate-fade-up">
          <SectionTitle title="Collection History" />
          {logs.length === 0 ? (
            <EmptyState icon={<Clock size={20} />} title="No Collection Logs" subtitle="No waste collection records found for this property." />
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-emerald-500 bg-emerald-500/15">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary-c">Garbage Collected</p>
                    <p className="text-xs text-muted-c">
                      {new Date(log.collected_at).toLocaleDateString()} at {new Date(log.collected_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Complaints */}
        <div className="glass-card p-5 animate-fade-up">
          <SectionTitle title="Property Complaints" />
          {complaints.length === 0 ? (
            <EmptyState icon={<ClipboardList size={20} />} title="No Complaints Filed" subtitle="Your property has not reported any active garbage issues." />
          ) : (
            <div className="space-y-3">
              {complaints.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-2xl bg-input-c border border-soft-c">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-c truncate max-w-[80px]">CMP-{c.id.substring(0,4)}</span>
                      <Badge status={c.priority} />
                    </div>
                    <p className="text-sm text-primary-c mt-0.5 truncate">{c.waste_type}</p>
                    <p className="text-xs text-muted-c mt-0.5 truncate">{c.address}</p>
                  </div>
                  <Badge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="glass-card p-5 animate-fade-up">
        <SectionTitle title="Notifications" />
        {notifications.length === 0 ? (
          <EmptyState icon={<Bell size={20} />} title="No Notifications" subtitle="You are all caught up." />
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div key={n.id} className="p-3 rounded-2xl bg-input-c border border-soft-c">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-primary-c">{n.title}</p>
                  <span className="text-[10px] text-muted-c shrink-0">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-secondary-c mt-1">{n.message || n.body || ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {reportOpen && <ReportIssue onClose={() => { setReportOpen(false); fetchData(); }} />}
      {house && (
        <PickupSchedulerModal
          house={house as any}
          residentId={user?.id}
          isOpen={scheduleModalOpen}
          onClose={() => {
            setScheduleModalOpen(false);
            loadSchedule();
          }}
        />
      )}
    </div>
  );
}
