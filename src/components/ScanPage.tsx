import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, type House } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import {
  Leaf, MapPin, CheckCircle2, Clock, Navigation, AlertTriangle,
  ArrowLeft, Loader2, CheckCircle, Home as HomeIcon,
} from '@/lib/icons';

type Status = 'loading' | 'not-found' | 'ready' | 'submitting' | 'success' | 'error';

export default function ScanPage() {
  const { houseId } = useParams<{ houseId: string }>();
  const { theme } = useTheme();
  const [house, setHouse] = useState<House | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'granted' | 'denied' | 'unavailable'>('idle');

  useEffect(() => {
    if (!houseId) {
      setStatus('not-found');
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('houses')
        .select('*')
        .eq('id', houseId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setStatus('error');
        setErrorMsg(error.message);
        return;
      }
      if (!data) {
        setStatus('not-found');
        return;
      }
      setHouse(data as House);
      setStatus('ready');
    })();
    return () => { cancelled = true; };
  }, [houseId]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('granted');
      },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const alreadyCollected = house?.collection_status === 'Collected';

  const markCollected = useCallback(async () => {
    if (!house || status === 'submitting' || alreadyCollected) return;
    setStatus('submitting');
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('houses')
      .update({ collection_status: 'Collected', last_collected: now })
      .eq('id', house.id);

    if (updateError) {
      setStatus('error');
      setErrorMsg(updateError.message);
      return;
    }

    const { error: logError } = await supabase.from('collection_logs').insert({
      house_id: house.id,
      collected_at: now,
      worker_id: null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
    });

    if (logError) {
      setStatus('error');
      setErrorMsg(logError.message);
      return;
    }

    setHouse({ ...house, collection_status: 'Collected', last_collected: now });
    setStatus('success');
  }, [house, status, alreadyCollected, coords]);

  return (
    <div className="min-h-screen app-bg flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Theme-agnostic floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-emerald-400/20 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-blue-400/20 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

      <div className="relative w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-br from-emerald-400 to-blue-600 shadow-xl shadow-emerald-500/30 mb-3">
            <Leaf className="text-white" size={26} />
          </div>
          <h1 className="text-xl font-bold font-display gradient-text">CleanOS</h1>
          <p className="text-xs text-secondary-c mt-1">Waste Collection Verification</p>
        </div>

        {status === 'loading' && (
          <div className="glass-card p-8 flex flex-col items-center gap-4">
            <Loader2 size={32} className="animate-spin text-emerald-500" />
            <p className="text-sm text-secondary-c">Loading house details…</p>
          </div>
        )}

        {status === 'not-found' && (
          <div className="glass-card p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/15 flex items-center justify-center text-rose-500">
              <AlertTriangle size={30} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary-c">House not found</h2>
              <p className="text-sm text-secondary-c mt-1">
                No house matches ID <span className="font-mono font-semibold">{houseId}</span>.
                Please check the QR code and try again.
              </p>
            </div>
            <Link to="/" className="mt-2 flex items-center gap-2 text-sm font-medium text-emerald-500 hover:underline">
              <ArrowLeft size={16} /> Back to dashboard
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="glass-card p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/15 flex items-center justify-center text-rose-500">
              <AlertTriangle size={30} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary-c">Something went wrong</h2>
              <p className="text-sm text-secondary-c mt-1">{errorMsg}</p>
            </div>
            <button onClick={() => window.location.reload()} className="mt-2 text-sm font-medium text-emerald-500 hover:underline">
              Try again
            </button>
          </div>
        )}

        {(status === 'ready' || status === 'submitting' || status === 'success') && house && (
          <>
            {/* House info card */}
            <div className="glass-card p-6 mb-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-c uppercase tracking-wider">House</p>
                  <h2 className="text-2xl font-bold font-display text-primary-c mt-0.5">{house.house_number}</h2>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  house.collection_status === 'Collected'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                }`}>
                  {house.collection_status}
                </div>
              </div>

              <div className="space-y-3">
                <InfoRow icon={<HomeIcon size={16} />} label="Lane" value={house.lane} />
                <InfoRow icon={<MapPin size={16} />} label="Address" value={house.address} />
                <InfoRow
                  icon={<Clock size={16} />}
                  label="Last collected"
                  value={house.last_collected ? new Date(house.last_collected).toLocaleString() : 'Never'}
                />
              </div>
            </div>

            {/* GPS status */}
            <div className="glass-card p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  geoStatus === 'granted' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-slate-400/10 text-muted-c'
                }`}>
                  <Navigation size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary-c">GPS Location</p>
                  <p className="text-xs text-muted-c mt-0.5">
                    {geoStatus === 'granted' && coords
                      ? `${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°`
                      : geoStatus === 'denied'
                        ? 'Permission denied — collection will log without GPS'
                        : geoStatus === 'unavailable'
                          ? 'Geolocation unavailable on this device'
                          : 'Requesting permission…'}
                  </p>
                </div>
                {geoStatus === 'granted' && <CheckCircle2 size={18} className="text-emerald-500" />}
              </div>
            </div>

            {/* Action button / success state */}
            {status === 'success' ? (
              <div className="glass-card p-8 flex flex-col items-center gap-4 text-center animate-fade-up">
                <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 animate-scale-in">
                  <CheckCircle size={40} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-primary-c">Collection recorded</h2>
                  <p className="text-sm text-secondary-c mt-1">
                    House {house.house_number} marked as collected just now.
                  </p>
                </div>
                <Link to="/" className="mt-2 flex items-center gap-2 text-sm font-medium text-emerald-500 hover:underline">
                  <ArrowLeft size={16} /> Back to dashboard
                </Link>
              </div>
            ) : alreadyCollected ? (
              <div className="glass-card p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="font-semibold text-primary-c">Already collected</p>
                  <p className="text-xs text-secondary-c mt-0.5">
                    This house was already marked as collected. Duplicate submissions are blocked.
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={markCollected}
                disabled={status === 'submitting'}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> Recording collection…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={20} /> Mark as Collected
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-input-c flex items-center justify-center text-muted-c shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-c uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-primary-c truncate">{value}</p>
      </div>
    </div>
  );
}
