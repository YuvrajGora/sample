import { useState, useEffect } from 'react';
import { supabase, type House } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import MapView from '@/components/ui/MapView';
import { SectionTitle, Badge, EmptyState } from '@/components/ui/Primitives';
import { MapPin, Navigation, RefreshCw, CheckCircle2, Clock, Loader2, Home as HomeIcon } from '@/lib/icons';

export default function FullMapView() {
  const { user } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHouses = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.from('houses').select('*').order('id');
    if (error) {
      setError(error.message);
    } else {
      setHouses((data as House[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHouses();
  }, []);

  const collected = houses.filter((h) => h.collection_status === 'Collected').length;
  const pending = houses.length - collected;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-5 sm:p-6 relative overflow-hidden animate-fade-up">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="text-emerald-500" size={20} />
              <h1 className="text-2xl font-bold font-display text-primary-c">Sector Navigation & Map</h1>
            </div>
            <p className="text-xs text-secondary-c mt-1">
              Live geographic locations of all registered sector properties and worker GPS position.
            </p>
          </div>
          <button
            onClick={fetchHouses}
            className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-input-c border border-soft-c text-primary-c hover:bg-white/10 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Map Data
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-12 flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
          <p className="text-sm text-secondary-c">Loading interactive map data…</p>
        </div>
      ) : error ? (
        <div className="glass-card p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-rose-500">{error}</p>
          <button onClick={fetchHouses} className="text-xs text-emerald-500 font-semibold hover:underline">
            Retry Loading
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Map View */}
          <div className="lg:col-span-2 space-y-4">
            <MapView
              houses={houses}
              selectedHouseId={selectedHouseId}
              showWorkerLocation={user?.role === 'worker'}
              height="h-[520px]"
              onSelectHouse={(h) => setSelectedHouseId(h.id)}
            />
          </div>

          {/* Interactive House Selector List */}
          <div className="glass-card p-5 space-y-4 max-h-[580px] flex flex-col">
            <SectionTitle
              title="Registered Properties"
              subtitle={`${pending} pending · ${collected} collected`}
            />

            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
              {houses.map((house) => {
                const isSelected = house.id === selectedHouseId;
                const isCollected = house.collection_status === 'Collected';
                const lat = Number(house.latitude);
                const lng = Number(house.longitude);
                const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

                return (
                  <div
                    key={house.id}
                    onClick={() => setSelectedHouseId(house.id)}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-md'
                        : 'border-soft-c bg-input-c hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary-c">{house.house_number}</span>
                        <span className="text-[10px] text-muted-c font-mono">({house.id})</span>
                      </div>
                      <Badge status={isCollected ? 'Completed' : 'Pending'} />
                    </div>

                    <p className="text-xs text-secondary-c truncate">{house.address}</p>

                    <div className="flex items-center justify-between pt-1 border-t border-soft-c/50 text-[11px]">
                      <span className="text-muted-c font-mono">{house.lane}</span>
                      <a
                        href={dirUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-emerald-500 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Navigation size={12} /> Directions
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
