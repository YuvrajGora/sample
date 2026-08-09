import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { SectionTitle, Badge, EmptyState } from '@/components/ui/Primitives';
import { complaints as initialComplaints, collectionHistory, type Complaint } from '@/lib/mockData';
import {
  ClipboardList, MapPin, Search, AlertTriangle, Truck, CheckCircle2,
  X, Send, MessageSquare, UserIcon, Clock, ChevronRight,
} from '@/lib/icons';

type Reply = { text: string; at: string; author: string };

export default function ComplaintsView() {
  const { user } = useAuth();
  const role = user!.role;
  const [filter, setFilter] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [list, setList] = useState<Complaint[]>(initialComplaints);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [replyText, setReplyText] = useState('');

  const filters = ['All', 'Pending', 'In Progress', 'Assigned', 'Resolved'];

  const filtered = list.filter((c) => {
    const matchFilter = filter === 'All' || c.status === filter;
    const matchQuery = !query || c.id.toLowerCase().includes(query.toLowerCase()) || c.location.toLowerCase().includes(query.toLowerCase()) || c.type.toLowerCase().includes(query.toLowerCase());
    return matchFilter && matchQuery;
  });

  const sendReply = () => {
    if (!selected || !replyText.trim()) return;
    const reply: Reply = {
      text: replyText.trim(),
      at: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      author: user!.name,
    };
    setReplies((prev) => ({ ...prev, [selected.id]: [...(prev[selected.id] || []), reply] }));
    setReplyText('');
  };

  const markResolved = () => {
    if (!selected) return;
    setList((prev) => prev.map((c) => (c.id === selected.id ? { ...c, status: 'Resolved' as const } : c)));
    setSelected((prev) => (prev ? { ...prev, status: 'Resolved' as const } : prev));
  };

  const closeDetail = () => { setSelected(null); setReplyText(''); };

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold font-display text-primary-c">
          {role === 'worker' ? 'Collection History' : 'Complaints'}
        </h1>
        <p className="text-sm text-secondary-c mt-0.5">
          {role === 'worker' ? 'Your completed collections and assigned tasks' : 'Track and manage all reported issues'}
        </p>
      </div>

      {/* Search + filter */}
      <div className="glass-card p-3 flex items-center gap-2 animate-fade-up">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-input-c border border-soft-c">
          <Search size={16} className="text-muted-c" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, location, or type..."
            className="flex-1 bg-transparent outline-none text-sm text-primary-c placeholder:text-muted-c"
          />
        </div>
      </div>

      {role !== 'worker' && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 animate-fade-up">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                filter === f ? 'bg-gradient-to-r from-emerald-500 to-blue-600 text-white' : 'glass text-secondary-c'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {role === 'worker' ? (
        <div className="space-y-2.5 stagger">
          {collectionHistory.map((c) => (
            <div key={c.id} className="glass-card p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
                <Truck size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary-c truncate">{c.location}</p>
                <p className="text-xs text-muted-c mt-0.5">{c.date} · {c.time} · {c.wasteType}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-muted-c">{c.id}</span>
                <div className="mt-1"><Badge status="Completed" /></div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2.5 stagger">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="glass-card p-4 w-full text-left hover:scale-[1.01] transition"
            >
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  c.priority === 'High' ? 'bg-rose-500/15 text-rose-500' : c.priority === 'Medium' ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'
                }`}>
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-c">{c.id}</span>
                    <Badge status={c.priority} />
                    <Badge status={c.status} />
                  </div>
                  <p className="text-sm font-semibold text-primary-c mt-1">{c.type}</p>
                  <p className="text-xs text-secondary-c mt-0.5 flex items-center gap-1"><MapPin size={11} /> {c.location}</p>
                  <p className="text-xs text-muted-c mt-1">{c.reportedAt}</p>
                  {c.assignedTo && <p className="text-xs text-blue-500 mt-1">Assigned: {c.assignedTo}</p>}
                  {replies[c.id]?.length > 0 && (
                    <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                      <MessageSquare size={11} /> {replies[c.id].length} {replies[c.id].length === 1 ? 'reply' : 'replies'}
                    </p>
                  )}
                </div>
                <ChevronRight size={18} className="text-muted-c shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ClipboardList size={28} />}
          title="No complaints found"
          subtitle="Try changing the filter or search query."
        />
      )}

      {/* Detail + reply drawer for admin */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDetail} />
          <div className="relative w-full max-w-lg glass-card rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-y-auto no-scrollbar animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  selected.priority === 'High' ? 'bg-rose-500/15 text-rose-500' : selected.priority === 'Medium' ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'
                }`}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="font-semibold text-primary-c text-sm">{selected.id}</p>
                  <p className="text-xs text-muted-c">{selected.type}</p>
                </div>
              </div>
              <button onClick={closeDetail} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-c hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Badge status={selected.priority} />
              <Badge status={selected.status} />
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-input-c border border-soft-c">
                <MapPin size={16} className="text-muted-c shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-c">Location</p>
                  <p className="text-sm text-primary-c font-medium">{selected.location}</p>
                </div>
              </div>
              {selected.assignedTo && (
                <div className="flex items-start gap-2 p-3 rounded-2xl bg-input-c border border-soft-c">
                  <UserIcon size={16} className="text-muted-c shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-c">Assigned to</p>
                    <p className="text-sm text-primary-c font-medium">{selected.assignedTo}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-input-c border border-soft-c">
                <Clock size={16} className="text-muted-c shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-c">Reported at</p>
                  <p className="text-sm text-primary-c font-medium">{selected.reportedAt}</p>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-input-c border border-soft-c">
                <p className="text-xs text-muted-c mb-1">Summary</p>
                <p className="text-sm text-secondary-c leading-relaxed">{selected.summary}</p>
              </div>
            </div>

            {/* Reply thread */}
            {replies[selected.id]?.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-xs font-medium text-muted-c uppercase tracking-wider">Reply history</p>
                {replies[selected.id].map((r, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{r.author}</span>
                      <span className="text-xs text-muted-c">{r.at}</span>
                    </div>
                    <p className="text-sm text-secondary-c">{r.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Admin reply box */}
            {role === 'admin' && (
              <div className="space-y-3">
                {selected.status !== 'Resolved' && (
                  <div>
                    <label className="text-xs font-medium text-muted-c uppercase tracking-wider mb-1.5 block">
                      Reply to complaint
                    </label>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a response to the citizen — e.g. 'Issue resolved, bin has been replaced.'"
                      rows={3}
                      className="w-full px-3.5 py-3 rounded-2xl bg-input-c border border-soft-c outline-none text-sm text-primary-c placeholder:text-muted-c resize-none focus:border-emerald-400/50 transition"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={sendReply}
                        disabled={!replyText.trim()}
                        className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        <Send size={16} /> Send Reply
                      </button>
                      <button
                        onClick={markResolved}
                        className="h-11 px-4 rounded-2xl glass border border-emerald-400/40 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-2 hover:bg-emerald-500/10 transition"
                      >
                        <CheckCircle2 size={16} /> Mark Solved
                      </button>
                    </div>
                  </div>
                )}
                {selected.status === 'Resolved' && (
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/30">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">This complaint has been resolved</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
