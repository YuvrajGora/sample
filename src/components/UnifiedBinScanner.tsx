import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useQRScanner } from '@/hooks/useQRScanner';
import { ScannerModal } from '@/components/LiveQRScanner';
import {
  QrCode, X, MapPin, CheckCircle2, ArrowRight,
  RefreshCw, Clock, ShieldCheck, Keyboard, Search, AlertTriangle,
} from '@/lib/icons';

export default function UnifiedBinScanner({
  role,
  onClose,
}: {
  role: 'citizen' | 'worker';
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [manualEntry, setManualEntry] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const processScannedCode = async (rawData: string): Promise<boolean> => {
    const trimmed = rawData.trim();
    
    // 1. Direct Regex match for standard format (H001-H020, /scan/H001-H020, or domain/scan/H001-H020)
    const match = trimmed.match(/\/scan\/(H\d+)/i) || trimmed.match(/^(H\d+)$/i);
    if (match && match[1]) {
      const rawId = match[1].toUpperCase();
      const num = parseInt(rawId.substring(1), 10);
      if (num >= 1 && num <= 20) {
        const houseId = `H${String(num).padStart(3, '0')}`;
        scanner.stop();
        navigate(`/scan/${houseId}`);
        return true;
      }
    }

    // 2. Exact match check against registered qr_url
    try {
      const { data: exactHouse } = await supabase
        .from('houses')
        .select('id')
        .eq('qr_url', trimmed)
        .maybeSingle();

      if (exactHouse) {
        scanner.stop();
        navigate(`/scan/${exactHouse.id}`);
        return true;
      }
    } catch (e) {
      console.error('Error in exact qr_url lookup:', e);
    }

    // 3. Normalized Google Maps URL short-code token extraction & precise matching
    // Handles trailing slashes (/), query parameters (?g_st=aw, ?g_st=ic), etc.
    const mapsTokenMatch = trimmed.match(/(?:maps\.app\.goo\.gl\/|goo\.gl\/maps\/)([a-zA-Z0-9_-]+)/i);
    if (mapsTokenMatch && mapsTokenMatch[1]) {
      const token = mapsTokenMatch[1];
      try {
        const { data: tokenHouses } = await supabase
          .from('houses')
          .select('id, qr_url')
          .ilike('qr_url', `%/${token}%`);

        if (tokenHouses && tokenHouses.length > 0) {
          // Precise token match check to ensure exact short-code equality
          const matchedHouse = tokenHouses.find(h => {
            const hTokenMatch = h.qr_url.match(/(?:maps\.app\.goo\.gl\/|goo\.gl\/maps\/)([a-zA-Z0-9_-]+)/i);
            return hTokenMatch && hTokenMatch[1] === token;
          }) || tokenHouses[0];

          scanner.stop();
          navigate(`/scan/${matchedHouse.id}`);
          return true;
        }
      } catch (e) {
        console.error('Error in normalized maps token lookup:', e);
      }
    }

    return false;
  };

  const handleScan = async (data: string) => {
    const success = await processScannedCode(data);
    if (!success) {
      scanner.stop();
      setScanError("This QR code is not a registered CleanOS house QR. Please scan the QR sticker assigned to a CleanOS house.");
    }
  };

  const scanner = useQRScanner(handleScan);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEntry.trim()) return;
    
    const success = await processScannedCode(manualEntry);
    if (!success) {
      setScanError("This is not a registered CleanOS house. Please enter a valid house ID (e.g., H001 to H020).");
    }
  };

  const handleClose = () => {
    scanner.stop();
    onClose();
  };

  const showOverlay = scanner.state !== 'error' && !scanner.error && !scanError;

  return (
    <ScannerModal
      title="Scan House QR"
      subtitle="Scan a house QR code to verify & record collection"
      onClose={handleClose}
      phase="scanning"
      isScanning={showOverlay}
      scanner={scanner}
    >
      {showOverlay && !showManual && (
        <div className="text-center mt-4">
          <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold">Align the House QR within the frame</p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Scanning automatically — hold steady</p>
        </div>
      )}

      {scanError && (
        <div className="space-y-4 py-3 text-center animate-fade-up">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-slate-900 dark:text-white text-base">Invalid QR Code</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              {scanError}
            </p>
          </div>
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={() => {
                setScanError(null);
                scanner.start();
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-2 transition shadow-md shadow-emerald-600/15"
            >
              <RefreshCw size={15} /> Scan again
            </button>
            <button
              onClick={() => {
                setScanError(null);
                setShowManual(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white text-sm font-semibold flex items-center gap-2 transition"
            >
              <Keyboard size={15} /> Enter manually
            </button>
          </div>
        </div>
      )}

      {!scanError && (scanner.error || showManual) && (
        <div className="space-y-3 py-2">
          {scanner.error && !showManual && (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-slate-650 dark:text-slate-400 text-sm max-w-xs leading-relaxed">{scanner.error}</p>
              <div className="flex gap-2">
                <button
                  onClick={scanner.start}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-2 transition shadow-md shadow-emerald-600/25"
                >
                  <RefreshCw size={16} /> Retry camera
                </button>
                <button
                  onClick={() => setShowManual(true)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white text-sm font-semibold flex items-center gap-2 transition"
                >
                  <Keyboard size={16} /> Enter manually
                </button>
              </div>
            </div>
          )}

          {showManual && (
            <form onSubmit={handleManualSubmit} className="space-y-4 animate-fade-up">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 text-sm font-semibold">
                <Keyboard size={16} className="text-emerald-500" /> Enter House ID manually
              </div>
              <div className="flex gap-2">
                <input
                  value={manualEntry}
                  onChange={(e) => setManualEntry(e.target.value)}
                  placeholder="e.g. H001"
                  autoFocus
                  className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white text-sm font-mono outline-none focus:border-emerald-500 transition"
                />
                <button
                  type="submit"
                  disabled={!manualEntry.trim()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40 transition shadow-md shadow-emerald-600/15"
                >
                  <Search size={16} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-slate-500 dark:text-slate-400 text-xs">Enter a valid CleanOS House ID (H001 to H020)</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowManual(false);
                    scanner.start();
                  }}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Back to Camera
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {!scanError && !showManual && !scanner.error && (
        <div className="space-y-3 pt-3">
          <button
            onClick={() => {
              scanner.stop();
              setShowManual(true);
            }}
            className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-white/80 text-sm font-semibold flex items-center justify-center gap-2 transition border border-slate-200 dark:border-white/10"
          >
            <Keyboard size={16} /> Enter House ID manually
          </button>

          {/* Quick Demo Selector */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-2 text-center font-medium">Demo — try a registered House ID:</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {['H001', 'H003', 'H007', 'H012', 'H020'].map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    scanner.stop();
                    navigate(`/scan/${id}`);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-300 text-xs font-mono transition"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </ScannerModal>
  );
}
