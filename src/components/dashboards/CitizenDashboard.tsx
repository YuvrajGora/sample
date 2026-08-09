import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { StatCard, SectionTitle, Badge, EmptyState } from '@/components/ui/Primitives';
import ReportIssue from '@/components/ReportIssue';
import {
  Leaf, Plus, Truck, Award, Activity, Bell, Clock, MapPin, CheckCircle2,
  Star, AlertTriangle, Recycle, Sparkles, ChevronRight, TrendingUp, QrCode,
} from '@/lib/icons';
import { complaints as allComplaints, recentActivity, citizenStats } from '@/lib/mockData';

export default function CitizenDashboard({ onOpenAI }: { onOpenAI: () => void }) {
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const myComplaints = allComplaints.slice(0, 3);
  const s = citizenStats;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="glass-card p-5 sm:p-6 relative overflow-hidden animate-fade-up">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-secondary-c">Good morning,</p>
            <h1 className="text-2xl font-bold font-display text-primary-c mt-0.5">{user?.name} 👋</h1>
            <p className="text-xs text-muted-c mt-1 flex items-center gap-1"><MapPin size={12} /> {s.pickupZone}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
            {user?.avatar}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <button onClick={() => setReportOpen(true)} className="glass-card p-4 flex flex-col items-start gap-2 hover:scale-[1.02] transition group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition">
            <Plus size={18} />
          </div>
          <span className="text-sm font-semibold text-primary-c">Report Garbage</span>
        </button>
        <button onClick={onOpenAI} className="glass-card p-4 flex flex-col items-start gap-2 hover:scale-[1.02] transition group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition">
            <Sparkles size={18} />
          </div>
          <span className="text-sm font-semibold text-primary-c">Ask AI</span>
        </button>
        <button className="glass-card p-4 flex flex-col items-start gap-2 hover:scale-[1.02] transition group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition">
            <Bell size={18} />
          </div>
          <span className="text-sm font-semibold text-primary-c">Notifications</span>
        </button>
        <button className="glass-card p-4 flex flex-col items-start gap-2 hover:scale-[1.02] transition group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition">
            <Recycle size={18} />
          </div>
          <span className="text-sm font-semibold text-primary-c">Recycle Tips</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <StatCard label="Green Points" value={s.greenPoints} icon={<Award size={20} />} accent="amber" delay={0.04} />
        <StatCard label="Reports Filed" value={s.reportsFiled} icon={<AlertTriangle size={20} />} accent="blue" delay={0.08} />
        <StatCard label="Recycling Streak" value={s.recyclingStreak} suffix=" days" icon={<Leaf size={20} />} accent="emerald" delay={0.12} />
        <StatCard label="Rank" value={0} suffix="" icon={<TrendingUp size={20} />} accent="cyan" delay={0.16} />
      </div>
      {/* Rank override card */}
      <div className="hidden" />

      {/* Today status + Next pickup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-5 animate-fade-up">
          <SectionTitle title="Today's Collection Status" subtitle="Live updates from your zone" />
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-400/20">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <Truck size={26} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-primary-c">Scheduled</p>
                <Badge status="Assigned" />
              </div>
              <p className="text-xs text-secondary-c mt-0.5">Truck arriving in your zone soon</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-display text-emerald-500">7:30</p>
              <p className="text-[10px] text-muted-c">AM Today</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-secondary-c">
            <Clock size={13} /> Worker Ravi Kumar (SW-2041) assigned to your route
          </div>
        </div>

        <div className="glass-card p-5 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <SectionTitle title="Next Pickup" />
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-24 h-24 mb-3">
              <div className="absolute inset-0 rounded-full bg-blue-500/10" />
              <div className="absolute inset-2 rounded-full bg-blue-500/15 flex items-center justify-center">
                <Truck className="text-blue-500" size={32} />
              </div>
            </div>
            <p className="text-lg font-bold font-display text-primary-c">{s.nextPickup}</p>
            <p className="text-xs text-secondary-c mt-1">{s.pickupZone}</p>
            <div className="mt-3 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              {s.housesOnRoute} houses on route
            </div>
          </div>
        </div>
      </div>

      {/* Green points card */}
      <div className="glass-card p-5 animate-fade-up relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-xl shadow-amber-500/30">
              <Award size={30} />
            </div>
            <div>
              <p className="text-xs text-muted-c uppercase tracking-wider">Your Green Points</p>
              <p className="text-3xl font-bold font-display text-primary-c">{s.greenPoints.toLocaleString()}</p>
              <p className="text-xs text-amber-500 font-medium mt-0.5 flex items-center gap-1"><Star size={12} /> {s.rank}</p>
            </div>
          </div>
          <div className="flex gap-3 text-center">
            <div className="px-4 py-2 rounded-2xl bg-input-c border border-soft-c">
              <p className="text-xl font-bold text-primary-c font-display">7</p>
              <p className="text-[10px] text-muted-c">Reports</p>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-input-c border border-soft-c">
              <p className="text-xl font-bold text-primary-c font-display">12</p>
              <p className="text-[10px] text-muted-c">Day Streak</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity + Recent complaints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5 animate-fade-up">
          <SectionTitle title="Recent Activity" />
          <div className="space-y-3">
            {recentActivity.map((a, i) => {
              const Icon = a.icon === 'check' ? CheckCircle2 : a.icon === 'star' ? Star : a.icon === 'alert' ? AlertTriangle : Leaf;
              const accentClass = a.accent === 'emerald' ? 'text-emerald-500 bg-emerald-500/15' : a.accent === 'amber' ? 'text-amber-500 bg-amber-500/15' : 'text-blue-500 bg-blue-500/15';
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accentClass}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary-c truncate">{a.title}</p>
                    <p className="text-xs text-muted-c">{a.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-5 animate-fade-up" style={{ animationDelay: '0.05s' }}>
          <SectionTitle title="My Complaints" action={<button className="text-xs text-emerald-500 font-medium flex items-center gap-0.5">View all <ChevronRight size={14} /></button>} />
          <div className="space-y-2.5">
            {myComplaints.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-2xl bg-input-c border border-soft-c">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-c">{c.id}</span>
                    <Badge status={c.priority} />
                  </div>
                  <p className="text-sm text-primary-c mt-0.5 truncate">{c.type}</p>
                  <p className="text-xs text-muted-c flex items-center gap-1 mt-0.5"><MapPin size={10} /> {c.location}</p>
                </div>
                <Badge status={c.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {reportOpen && <ReportIssue onClose={() => setReportOpen(false)} />}
    </div>
  );
}
