import type { ReactNode } from 'react';
import { useCountUp } from '@/hooks/useCountUp';

export function StatCard({
  label, value, suffix, icon, accent, trend, delay = 0,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: ReactNode;
  accent: 'emerald' | 'blue' | 'amber' | 'rose' | 'violet' | 'cyan';
  trend?: { dir: 'up' | 'down'; text: string };
  delay?: number;
}) {
  const v = useCountUp(value);
  const accents: Record<string, string> = {
    emerald: 'from-emerald-400 to-emerald-600',
    blue: 'from-blue-400 to-blue-600',
    amber: 'from-amber-400 to-orange-500',
    rose: 'from-rose-400 to-rose-600',
    violet: 'from-violet-400 to-purple-600',
    cyan: 'from-cyan-400 to-blue-500',
  };
  return (
    <div
      className="glass-card p-5 relative overflow-hidden animate-fade-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-secondary-c uppercase tracking-wider">{label}</p>
          <p className="mt-2 text-3xl font-bold text-primary-c font-display">
            {v.toLocaleString()}<span className="text-xl">{suffix}</span>
          </p>
        </div>
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${accents[accent]} flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span className={trend.dir === 'up' ? 'text-emerald-500' : 'text-rose-500'}>
            {trend.dir === 'up' ? '▲' : '▼'} {trend.text}
          </span>
          <span className="text-muted-c">vs yesterday</span>
        </div>
      )}
    </div>
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-lg font-bold text-primary-c font-display">{title}</h2>
        {subtitle && <p className="text-sm text-secondary-c mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    Resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    Assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    High: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
    Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    Low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    Online: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    Offline: 'bg-slate-200 text-slate-600 dark:bg-slate-600/20 dark:text-slate-400',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

export function EmptyState({ icon, title, subtitle, action }: { icon: ReactNode; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400/20 to-blue-500/20 flex items-center justify-center text-emerald-500 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-primary-c">{title}</h3>
      {subtitle && <p className="text-sm text-secondary-c mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
