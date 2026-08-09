import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { House } from '@/lib/supabase';
import { MapPin, Navigation, CheckCircle2, Clock } from '@/lib/icons';

export interface MapViewProps {
  houses: House[];
  selectedHouseId?: string;
  showWorkerLocation?: boolean;
  height?: string;
  onSelectHouse?: (house: House) => void;
  compact?: boolean;
}

export default function MapView({
  houses,
  selectedHouseId,
  showWorkerLocation = false,
  height = 'h-[420px]',
  onSelectHouse,
  compact = false,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const workerMarkerRef = useRef<L.Marker | null>(null);

  const [workerCoords, setWorkerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'granted' | 'denied' | 'unavailable'>('idle');

  // Filter houses with valid numerical coordinates
  const validHouses = houses.filter(
    (h) =>
      h.latitude !== null &&
      h.longitude !== null &&
      !isNaN(Number(h.latitude)) &&
      !isNaN(Number(h.longitude)),
  );

  // Request worker location if requested
  useEffect(() => {
    if (!showWorkerLocation) return;
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setWorkerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('granted');
      },
      (err) => {
        console.warn('[MapView] GPS location unavailable/denied:', err.message);
        setGeoStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [showWorkerLocation]);

  // Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Determine initial center
      let initialLat = 28.6139;
      let initialLng = 77.209;

      if (validHouses.length > 0) {
        const sumLat = validHouses.reduce((acc, h) => acc + Number(h.latitude!), 0);
        const sumLng = validHouses.reduce((acc, h) => acc + Number(h.longitude!), 0);
        initialLat = sumLat / validHouses.length;
        initialLng = sumLng / validHouses.length;
      }

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: true,
        scrollWheelZoom: false, // Prevent page scroll hijack
      });

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when validHouses or selectedHouseId changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const bounds: L.LatLngExpression[] = [];

    validHouses.forEach((house) => {
      const lat = Number(house.latitude);
      const lng = Number(house.longitude);
      const isCollected = house.collection_status === 'Collected';
      const isSelected = house.id === selectedHouseId;

      bounds.push([lat, lng]);

      // Create Custom SVG Icon for Marker
      const pinColor = isCollected ? '#10b981' : '#f59e0b';
      const pinBgClass = isCollected ? 'bg-emerald-500' : 'bg-amber-500';
      const badgeText = house.house_number || house.id;

      const customIcon = L.divIcon({
        className: 'cleanos-map-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
            <div style="
              background: ${pinColor};
              color: white;
              font-size: 11px;
              font-weight: 700;
              padding: 4px 8px;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.25);
              border: 2px solid white;
              white-space: nowrap;
              display: flex;
              align-items: center;
              gap: 4px;
              transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
              transition: transform 0.2s ease;
            ">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: white;"></span>
              ${badgeText}
            </div>
            <div style="
              width: 0; 
              height: 0; 
              border-left: 5px solid transparent; 
              border-right: 5px solid transparent; 
              border-top: 6px solid ${pinColor};
              margin-top: -1px;
            "></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Popup Content HTML
      const lastCollectedText = house.last_collected
        ? new Date(house.last_collected).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
        : 'Not yet collected today';

      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      const popupHtml = `
        <div style="min-width: 220px; font-family: system-ui, sans-serif; padding: 4px;">
          <div style="display: flex; items-center; justify-content: space-between; gap: 8px; border-bottom: 1px solid rgba(148,163,184,0.2); padding-bottom: 8px; margin-bottom: 8px;">
            <div>
              <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">${house.id} · ${house.lane || 'Sector'}</div>
              <div style="font-size: 15px; font-weight: 700; color: var(--text-primary, #0f172a); margin-top: 2px;">${house.house_number}</div>
            </div>
            <span style="
              font-size: 11px; 
              font-weight: 700; 
              padding: 3px 8px; 
              border-radius: 9999px; 
              background: ${isCollected ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}; 
              color: ${isCollected ? '#059669' : '#d97706'};
              height: fit-content;
            ">
              ${house.collection_status || 'Pending'}
            </span>
          </div>

          <div style="font-size: 12px; color: var(--text-secondary, #475569); line-height: 1.4; margin-bottom: 8px;">
            📍 ${house.address}
          </div>

          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 12px;">
            🕒 Last: ${lastCollectedText}
          </div>

          <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 6px; 
            width: 100%; 
            padding: 8px 12px; 
            background: linear-gradient(135deg, #10b981, #3b82f6); 
            color: white; 
            font-size: 12px; 
            font-weight: 700; 
            border-radius: 10px; 
            text-decoration: none; 
            box-shadow: 0 4px 12px rgba(16,185,129,0.3);
            box-sizing: border-box;
          ">
            <span>🗺️</span> Get Directions in Google Maps
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        if (onSelectHouse) {
          onSelectHouse(house);
        }
      });

      markersGroup.addLayer(marker);
    });

    // Handle Selected House focus
    if (selectedHouseId) {
      const selected = validHouses.find((h) => h.id === selectedHouseId);
      if (selected && selected.latitude && selected.longitude) {
        map.setView([Number(selected.latitude), Number(selected.longitude)], 17, { animate: true });
      }
    } else if (bounds.length > 0 && !selectedHouseId) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: 17 });
    }
  }, [validHouses, selectedHouseId, onSelectHouse]);

  // Handle Worker Position Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !workerCoords) return;

    if (workerMarkerRef.current) {
      workerMarkerRef.current.remove();
    }

    const workerIcon = L.divIcon({
      className: 'worker-gps-marker',
      html: `
        <div style="position: relative; display: flex; items-center; justify-content: center; transform: translate(-50%, -50%);">
          <div style="
            position: absolute; 
            width: 32px; 
            height: 32px; 
            border-radius: 50%; 
            background: rgba(59, 130, 246, 0.3); 
            animation: pulseRing 2s infinite ease-out;
          "></div>
          <div style="
            width: 16px; 
            height: 16px; 
            border-radius: 50%; 
            background: #3b82f6; 
            border: 3px solid white; 
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          "></div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    const wMarker = L.marker([workerCoords.lat, workerCoords.lng], { icon: workerIcon });
    wMarker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; font-size: 12px; font-weight: 700; color: #3b82f6;">
        🔵 Your Current GPS Location
      </div>
    `);
    wMarker.addTo(map);
    workerMarkerRef.current = wMarker;
  }, [workerCoords]);

  const handleCenterWorker = () => {
    if (workerCoords && mapInstanceRef.current) {
      mapInstanceRef.current.setView([workerCoords.lat, workerCoords.lng], 17, { animate: true });
    }
  };

  const collectedCount = validHouses.filter((h) => h.collection_status === 'Collected').length;
  const pendingCount = validHouses.length - collectedCount;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden glass-card border border-soft-c shadow-xl">
      {/* Map Container Header / Controls bar */}
      {!compact && (
        <div className="p-3 sm:p-4 border-b border-soft-c flex flex-wrap items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-emerald-500" />
            <span className="text-xs font-bold text-primary-c">Sector Interactive Map</span>
            <span className="text-[10px] text-muted-c">({validHouses.length} houses registered)</span>
          </div>

          {/* Map Legend */}
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {collectedCount} Collected
            </span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> {pendingCount} Pending
            </span>
            {showWorkerLocation && workerCoords && (
              <button
                onClick={handleCenterWorker}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" /> My Location
              </button>
            )}
          </div>
        </div>
      )}

      {/* Leaflet Container */}
      <div ref={mapContainerRef} className={`w-full ${height} z-10`} />

      {/* Mobile touch helper hint overlay */}
      <div className="absolute bottom-2 left-2 z-20 pointer-events-none px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] text-white/80">
        Tap marker for house details & directions
      </div>
    </div>
  );
}
