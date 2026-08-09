import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, type House } from '@/lib/supabase';
import {
  Leaf, MapPin, CheckCircle2, Clock, Navigation, AlertTriangle,
  ArrowLeft, Loader2, CheckCircle, Home as HomeIcon,
} from '@/lib/icons';

type Status = 'loading' | 'not-found' | 'ready' | 'submitting' | 'success' | 'error';

import { completeScheduleForHouse } from '@/lib/pickupScheduleService';

const ALLOWED_RADIUS_METERS = 50; // Configurable verification radius

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

export default function ScanPage() {
  const { houseId } = useParams<{ houseId: string }>();
  const [house, setHouse] = useState<House | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'granted' | 'denied' | 'unavailable'>('idle');

  // Fetch house details
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
        .eq('id', houseId.toUpperCase())
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

  // Request worker GPS location
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
      () => {
        setGeoStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const alreadyCollected = house?.collection_status === 'Collected';

  // Distance verification calculations
  const hasCoordinates = house?.latitude !== null && house?.longitude !== null;
  const distance = coords && house?.latitude !== null && house?.latitude !== undefined && house?.longitude !== null && house?.longitude !== undefined
    ? getDistanceInMeters(coords.lat, coords.lng, house.latitude, house.longitude)
    : null;
  const isWithinRadius = distance !== null ? distance <= ALLOWED_RADIUS_METERS : null;

  let verificationStatus = 'Not verified (GPS missing)';
  if (geoStatus === 'denied') {
    verificationStatus = 'Worker location unavailable (GPS bypassed)';
  } else if (geoStatus === 'unavailable') {
    verificationStatus = 'Geolocation unavailable on device';
  } else if (!hasCoordinates) {
    verificationStatus = 'House coordinates not registered (GPS bypassed)';
  } else if (distance !== null) {
    verificationStatus = isWithinRadius
      ? `Verified: Within ${ALLOWED_RADIUS_METERS}m range (${distance.toFixed(1)}m)`
      : `Warning: Out of range (${distance.toFixed(1)}m, limit ${ALLOWED_RADIUS_METERS}m)`;
  }

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
    await completeScheduleForHouse(house.id);
    setStatus('success');
  }, [house, status, alreadyCollected, coords]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-900 dark:text-white">
      {/* Decorative background gradients */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md animate-scale-in">
        {/* Header Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-br from-emerald-500 to-blue-600 shadow-xl shadow-emerald-500/25 mb-3">
            <Leaf className="text-white" size={26} />
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">House Collection</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">CleanOS Waste Collection Verification</p>
        </div>

        {status === 'loading' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl flex flex-col items-center gap-4 shadow-xl">
            <Loader2 size={32} className="animate-spin text-emerald-500" />
            <p className="text-sm text-slate-650 dark:text-slate-350">Loading house details…</p>
          </div>
        )}

        {status === 'not-found' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl flex flex-col items-center gap-4 text-center shadow-xl">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle size={30} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">House not registered</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                The identifier <span className="font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded">{houseId}</span> is not registered in the CleanOS database.
              </p>
            </div>
            <Link to="/" className="mt-2 flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
              <ArrowLeft size={16} /> Back to dashboard
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl flex flex-col items-center gap-4 text-center shadow-xl">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle size={30} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Database Error</h2>
              <p className="text-sm text-slate-550 dark:text-slate-400 mt-2 leading-relaxed">{errorMsg}</p>
            </div>
            <button onClick={() => window.location.reload()} className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
              Try again
            </button>
          </div>
        )}

        {(status === 'ready' || status === 'submitting' || status === 'success') && house && (
          <>
            {status === 'success' ? (
              /* Collection Completed Success State */
              <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 p-6 rounded-3xl shadow-xl space-y-5 animate-fade-up">
                <div className="flex flex-col items-center gap-3 text-center border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={36} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Collection Completed</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Record successfully uploaded to database</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <DetailRow label="Collection Time" value={new Date(house.last_collected || '').toLocaleString()} />
                  <DetailRow label="House ID" value={house.id} />
                  <DetailRow label="House Number" value={house.house_number} />
                  <DetailRow label="Lane" value={house.lane} />
                  <DetailRow label="Address" value={house.address} />
                  
                  <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Verification Status</p>
                    <div className="flex items-start gap-2 mt-1.5">
                      <div className={`mt-0.5 shrink-0 ${isWithinRadius ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {isWithinRadius ? <CheckCircle2 size={15} /> : <Navigation size={15} />}
                      </div>
                      <p className={`text-xs font-semibold leading-relaxed ${isWithinRadius ? 'text-emerald-600 dark:text-emerald-450' : 'text-amber-600 dark:text-amber-450'}`}>
                        {verificationStatus}
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  to="/"
                  className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/15 transition mt-4"
                >
                  <ArrowLeft size={16} /> Back to Dashboard
                </Link>
              </div>
            ) : (
              /* Ready / Submitting State */
              <>
                {/* House Info Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xl mb-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">House ID</p>
                      <h2 className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">{house.id}</h2>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                      alreadyCollected
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-750 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'
                        : 'bg-amber-50 border-amber-200 text-amber-750 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400'
                    }`}>
                      {house.collection_status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow icon={<HomeIcon size={16} />} label="House Number" value={house.house_number} />
                    <InfoRow icon={<Navigation size={16} />} label="Lane" value={house.lane} />
                  </div>
                  <InfoRow icon={<MapPin size={16} />} label="Address" value={house.address} />
                  <InfoRow
                    icon={<Clock size={16} />}
                    label="Last Collected"
                    value={house.last_collected ? new Date(house.last_collected).toLocaleString() : 'Never'}
                  />
                </div>

                {/* GPS Verification Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xl mb-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      geoStatus === 'granted'
                        ? isWithinRadius
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-450'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      <Navigation size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Location Verification</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed truncate">
                        {verificationStatus}
                      </p>
                    </div>
                    {geoStatus === 'granted' && isWithinRadius && (
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    )}
                  </div>

                  {/* Range warning indicator */}
                  {geoStatus === 'granted' && distance !== null && !isWithinRadius && (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/50 dark:bg-amber-500/5 dark:border-amber-500/10 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        You appear to be {distance.toFixed(0)}m away. Ensure you are at the correct property location.
                      </p>
                    </div>
                  )}

                  {geoStatus === 'denied' && (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 dark:bg-slate-950/20 dark:border-slate-800 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-450">
                      <Navigation size={15} className="shrink-0 mt-0.5 text-slate-500" />
                      <p className="leading-relaxed">
                        Worker GPS is bypassed. Manual override allowed.
                      </p>
                    </div>
                  )}

                  {/* Open Directions Action */}
                  {hasCoordinates && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${house.latitude},${house.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
                      >
                        <Navigation size={14} className="text-emerald-500" /> Open Directions in Google Maps
                      </a>
                    </div>
                  )}
                </div>

                {/* Submit button / already completed panel */}
                {alreadyCollected ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xl flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900 dark:text-white text-base">Already Collected</p>
                      <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">
                        This house has already been completed today. Duplicate collections are blocked to prevent logging conflicts.
                      </p>
                      <div className="pt-2">
                        <Link to="/" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                          <ArrowLeft size={12} /> Back to dashboard
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={markCollected}
                    disabled={status === 'submitting'}
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/35 transition disabled:opacity-60 disabled:cursor-not-allowed"
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
          </>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-950 dark:border-slate-800/60 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-855 dark:text-slate-205 truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4 border-b border-slate-50 dark:border-slate-800/40 pb-2">
      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 text-right max-w-[70%] break-words">{value}</span>
    </div>
  );
}
