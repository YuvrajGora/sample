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

  const [debugState, setDebugState] = useState<{
    raw: string;
    len: number;
    charCodes: string;
    token: string;
    dbTokens: string[];
    matchedHouseId: string | null;
    dbMatch: boolean;
    callbackFired: boolean;
  } | null>(null);

  const getMapsToken = (urlStr: string): string => {
    if (!urlStr) return '';
    const clean = urlStr.trim().split('?')[0].split('#')[0];
    const segments = clean.split('/').filter(Boolean);
    return (segments[segments.length - 1] || '').trim();
  };

  const processScannedCode = async (rawData: string): Promise<boolean> => {
    const trimmed = rawData.trim();
    console.log('[QR Scanner] Raw scanned value:', trimmed);
    
    // 1. Direct Regex match for standard format (H001-H020, /scan/H001-H020, or domain/scan/H001-H020)
    const match = trimmed.match(/\/scan\/(H\d+)/i) || trimmed.match(/^(H\d+)$/i);
    if (match && match[1]) {
      const rawId = match[1].toUpperCase();
      const num = parseInt(rawId.substring(1), 10);
      if (num >= 1 && num <= 20) {
        const houseId = `H${String(num).padStart(3, '0')}`;
        console.log('[QR Scanner] Direct regex match:', houseId);
        scanner.stop();
        navigate(`/scan/${houseId}`);
        return true;
      }
    }

    const scannedToken = getMapsToken(trimmed);
    console.log('[QR Scanner] Extracted token:', scannedToken);

    // 2. Client-side token and URL matching against registered houses
    try {
      const { data: houseList, error: houseErr } = await supabase
        .from('houses')
        .select('id, qr_url');

      console.log('[QR Scanner] DB fetch count:', houseList?.length, 'error:', houseErr);

      if (houseList && houseList.length > 0) {
        const matchedHouse = houseList.find(h => {
          if (!h.qr_url) return false;
          // Direct exact match
          if (h.qr_url.trim() === trimmed) return true;
          // Google Maps short-code token match
          const dbToken = getMapsToken(h.qr_url);
          return Boolean(scannedToken && dbToken && scannedToken === dbToken);
        });

        if (matchedHouse) {
          console.log('[QR Scanner] Matched house:', matchedHouse.id);
          scanner.stop();
          navigate(`/scan/${matchedHouse.id}`);
          return true;
        }
      }
    } catch (e) {
      console.error('[QR Scanner] Error during house lookup:', e);
    }

    console.log('[QR Scanner] Lookup failed, returning false');
    return false;
  };

  const handleScan = async (data: string) => {
    console.log('==== [QR DECODER CALLBACK FIRED] ====');
    console.log('1. Raw decoded QR value:', JSON.stringify(data));
    console.log('2. Decoded value length:', data ? data.length : 0);
    console.log('3. Character codes:', data ? Array.from(data).map(c => c.charCodeAt(0)).join(',') : '');
    console.log('4. Decoder callback firing confirmation: TRUE');

    const trimmed = (data || '').trim();
    const scannedToken = getMapsToken(trimmed);
    console.log('5. Extracted Google Maps token:', scannedToken);

    let houseList: { id: string; qr_url: string }[] = [];
    let dbTokens: string[] = [];
    try {
      const { data: res } = await supabase.from('houses').select('id, qr_url');
      if (res) {
        houseList = res;
        dbTokens = res.map(h => `${h.id}:${getMapsToken(h.qr_url)}`);
        console.log('6. All database QR tokens:', dbTokens);
      }
    } catch (e) {
      console.error('Failed to fetch DB tokens:', e);
    }

    const matchedHouse = houseList.find(h => {
      if (!h.qr_url) return false;
      if (h.qr_url.trim() === trimmed) return true;
      const dbToken = getMapsToken(h.qr_url);
      return Boolean(scannedToken && dbToken && scannedToken === dbToken);
    });

    const finalHouseId = matchedHouse ? matchedHouse.id : (
      (trimmed.match(/\/scan\/(H\d+)/i) || trimmed.match(/^(H\d+)$/i))?.[1]?.toUpperCase() || null
    );

    console.log('7. Final matched house ID:', finalHouseId);

    setDebugState({
      raw: data,
      len: data.length,
      charCodes: Array.from(data).map(c => c.charCodeAt(0)).join(','),
      token: scannedToken,
      dbTokens,
      matchedHouseId: finalHouseId,
      dbMatch: Boolean(finalHouseId),
      callbackFired: true,
    });

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
      {/* Temporary Visible Debug Panel */}
      {debugState && (
        <div className="mt-3 p-3 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono border border-slate-700 space-y-1 text-left">
          <div className="font-bold text-amber-400 border-b border-slate-800 pb-1">⚡ RUNTIME DEBUG PANEL</div>
          <div><span className="text-slate-400">RAW QR VALUE:</span> {debugState.raw || '(none)'}</div>
          <div><span className="text-slate-400">EXTRACTED TOKEN:</span> {debugState.token || '(none)'}</div>
          <div><span className="text-slate-400">DB MATCH:</span> {debugState.dbMatch ? '✅ TRUE' : '❌ FALSE'}</div>
          <div><span className="text-slate-400">HOUSE:</span> {debugState.matchedHouseId || 'NONE'}</div>
        </div>
      )}

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
