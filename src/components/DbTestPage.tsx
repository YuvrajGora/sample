import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Leaf, Loader2, CheckCircle2, AlertTriangle, Database } from '@/lib/icons';

type State = 'loading' | 'success' | 'error';

type HouseRow = {
  id: string;
  lane: string;
  house_number: string;
  address: string;
  collection_status: string;
};

export default function DbTestPage() {
  const [state, setState] = useState<State>('loading');
  const [count, setCount] = useState<number | null>(null);
  const [rows, setRows] = useState<HouseRow[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('houses')
        .select('id, lane, house_number, address, collection_status')
        .order('id');

      if (error) {
        setState('error');
        setErrorMsg(error.message);
        return;
      }

      setRows((data as HouseRow[]) ?? []);
      setCount(data?.length ?? 0);
      setState('success');
    })();
  }, []);

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-emerald-400/20 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-blue-400/20 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

      <div className="relative w-full max-w-2xl animate-scale-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-br from-emerald-400 to-blue-600 shadow-xl shadow-emerald-500/30 mb-3">
            <Leaf className="text-white" size={26} />
          </div>
          <h1 className="text-xl font-bold font-display gradient-text">CleanOS</h1>
          <p className="text-xs text-secondary-c mt-1">Database Connection Test</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-soft-c">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-500">
              <Database size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-c">Query</p>
              <p className="text-xs text-muted-c font-mono mt-0.5">SELECT id, lane, house_number, address, collection_status FROM public.houses ORDER BY id</p>
            </div>
          </div>

          {state === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 size={32} className="animate-spin text-emerald-500" />
              <p className="text-sm text-secondary-c">Testing connection…</p>
            </div>
          )}

          {state === 'success' && (
            <div className="animate-fade-up">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 animate-scale-in">
                  <CheckCircle2 size={32} />
                </div>
                <p className="text-lg font-bold text-emerald-500 font-display">SUPABASE CONNECTED</p>
                <p className="text-sm text-secondary-c">
                  Houses returned: <span className="font-bold text-primary-c">{count}</span>
                </p>
              </div>

              {rows.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-c border-b border-soft-c">
                        <th className="pb-2 pr-3 font-medium">ID</th>
                        <th className="pb-2 pr-3 font-medium">Lane</th>
                        <th className="pb-2 pr-3 font-medium">House #</th>
                        <th className="pb-2 pr-3 font-medium">Address</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id} className="border-b border-soft-c/50">
                          <td className="py-2 pr-3 font-mono text-primary-c">{row.id}</td>
                          <td className="py-2 pr-3 text-secondary-c">{row.lane}</td>
                          <td className="py-2 pr-3 text-secondary-c">{row.house_number}</td>
                          <td className="py-2 pr-3 text-secondary-c">{row.address}</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              row.collection_status === 'Collected'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                            }`}>
                              {row.collection_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center gap-4 py-6 animate-fade-up">
              <div className="w-20 h-20 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-500 animate-scale-in">
                <AlertTriangle size={40} />
              </div>
              <div className="text-center w-full">
                <p className="text-lg font-bold text-rose-500 font-display">CONNECTION FAILED</p>
                <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-left">
                  <p className="text-xs text-rose-400 font-mono break-all">{errorMsg}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-soft-c">
            <p className="text-[11px] text-muted-c">
              Project: <span className="font-mono">talgjcwmwaczvemkrurc.supabase.co</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
