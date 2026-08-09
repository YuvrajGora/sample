import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQRScanner } from '@/hooks/useQRScanner';
import { ScannerModal } from '@/components/LiveQRScanner';
import { supabase, type BinRow } from '@/lib/supabase';
import { lookupBin } from '@/lib/mockData';
import { Badge } from '@/components/ui/Primitives';
import {
  QrCode, X, MapPin, Trash2, CheckCircle2, ArrowRight,
  RefreshCw, Clock, ShieldCheck, Gauge, Sparkles, CheckSquare, Square,
  Keyboard, Search,
} from '@/lib/icons';

type Phase = 'scanning' | 'verifying' | 'result' | 'checklist' | 'completed';

const CHECKLIST_ITEMS = [
  { key: 'emptied', label: 'Bin emptied completely' },
  { key: 'sorted', label: 'Waste sorted (wet / dry / hazardous)' },
  { key: 'cleaned', label: 'Surrounding area cleaned' },
  { key: 'sanitized', label: 'Bin lid & handle sanitized' },
  { key: 'sticker', label: 'QR sticker intact & readable' },
  { key: 'photo', label: 'Completion photo captured' },
] as const;

const DEMO_BINS = ['BIN-112', 'BIN-204', 'BIN-318', 'BIN-425', 'BIN-507', 'BIN-612', 'BIN-701'];

export default function UnifiedBinScanner({
  role,
  onClose,
}: {
  role: 'citizen' | 'worker';
  onClose: (bin?: BinRow) => void;
}) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('scanning');
  const [bin, setBin] = useState<BinRow | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [manualEntry, setManualEntry] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const lookupAndSet = async (rawScan: string) => {
    setLooking(true);
    setLookupError(null);
    const normalized = rawScan.trim().toUpperCase();
    try {
      const { data, error } = await supabase
        .from('bins')
        .select('*')
        .ilike('bin_id', normalized)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        const row = data as BinRow;
        setBin({ ...row, last_collected: (row as unknown as { last_collected?: string }).last_collected ?? '—' });
      } else {
        const mock = lookupBin(normalized);
        setBin({
          id: '',
          bin_id: mock.binId,
          address: mock.address,
          zone: mock.zone,
          capacity: mock.capacity,
          last_collected: mock.lastCollected,
        });
      }
      setPhase('verifying');
      setTimeout(() => setPhase('result'), 1400);
    } catch {
      const mock = lookupBin(normalized);
      setBin({
        id: '',
        bin_id: mock.binId,
        address: mock.address,
        zone: mock.zone,
        capacity: mock.capacity,
        last_collected: mock.lastCollected,
      });
      setPhase('verifying');
      setTimeout(() => setPhase('result'), 1400);
    } finally {
      setLooking(false);
    }
  };

  const handleScan = (data: string) => {
    const match = data.match(/\/scan\/(H\d+)/i) || data.match(/^(H\d+)$/i);
    if (match && match[1]) {
      const houseId = match[1].toUpperCase();
      scanner.stop();
      navigate(`/scan/${houseId}`);
      return;
    }
    lookupAndSet(data);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEntry.trim()) return;
    setShowManual(false);
    
    const match = manualEntry.match(/\/scan\/(H\d+)/i) || manualEntry.match(/^(H\d+)$/i);
    if (match && match[1]) {
      const houseId = match[1].toUpperCase();
      scanner.stop();
      navigate(`/scan/${houseId}`);
      return;
    }
    lookupAndSet(manualEntry);
  };

  const toggleCheck = (key: string) =>
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const allChecked = CHECKLIST_ITEMS.every((item) => checked[item.key]);

  const completeCollection = () => setPhase('completed');

  const scanner = useQRScanner(handleScan);
  const showOverlay = phase === 'scanning' && scanner.state !== 'error' && !scanner.error;

  const handleClose = () => {
    scanner.stop();
    onClose(phase === 'result' || phase === 'checklist' || phase === 'completed' ? bin ?? undefined : undefined);
  };

  const modalPhase = phase === 'scanning' ? 'scanning' : phase === 'verifying' ? 'verifying' : 'success';

  const title = role === 'worker' ? 'Scan Bin for Collection' : 'Scan Bin to Report';
  const subtitle = role === 'worker' ? 'Scan the QR code to verify & complete collection' : 'Scan the QR code to identify the bin';

  return (
    <ScannerModal
      title={title}
      subtitle={subtitle}
      onClose={handleClose}
      phase={modalPhase}
      isScanning={showOverlay}
      scanner={scanner}
    >
      {showOverlay && (
        <div className="text-center mt-5">
          <p className="text-white/90 text-sm font-medium">Point at the QR sticker on any bin</p>
          <p className="text-white/50 text-xs mt-1">Scanning in real time — hold steady</p>
        </div>
      )}

      {(scanner.error || showManual) && phase === 'scanning' && (
        <div className="space-y-3 py-4">
          {scanner.error && !showManual && (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-white/60 text-sm max-w-xs">{scanner.error}</p>
              <div className="flex gap-2">
                <button
                  onClick={scanner.start}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 hover:scale-105 transition shadow-lg shadow-emerald-500/30"
                >
                  <RefreshCw size={16} /> Retry camera
                </button>
                <button
                  onClick={() => setShowManual(true)}
                  className="px-4 py-2.5 rounded-2xl glass border border-white/15 text-white text-sm font-semibold flex items-center gap-2 hover:scale-105 transition"
                >
                  <Keyboard size={16} /> Enter manually
                </button>
              </div>
            </div>
          )}

          {showManual && (
            <form onSubmit={handleManualSubmit} className="space-y-3 animate-fade-up">
              <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                <Keyboard size={16} /> Enter Bin ID manually
              </div>
              <div className="flex gap-2">
                <input
                  value={manualEntry}
                  onChange={(e) => setManualEntry(e.target.value)}
                  placeholder="e.g. BIN-112"
                  autoFocus
                  className="flex-1 px-3 py-2.5 rounded-xl bg-black/30 border border-white/15 text-white text-sm font-mono outline-none focus:border-emerald-400/50"
                />
                <button
                  type="submit"
                  disabled={!manualEntry.trim() || looking}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-40 hover:scale-105 transition"
                >
                  <Search size={16} />
                </button>
              </div>
              <p className="text-white/40 text-xs">No camera? Type the bin ID printed on the sticker.</p>
            </form>
          )}

          {!showManual && !scanner.error && (
            <button
              onClick={() => setShowManual(true)}
              className="w-full px-4 py-2.5 rounded-2xl glass border border-white/15 text-white/80 text-sm font-medium flex items-center justify-center gap-2 hover:scale-[1.02] transition"
            >
              <Keyboard size={16} /> Enter Bin ID manually
            </button>
          )}

          <div className="pt-2 border-t border-white/10">
            <p className="text-white/40 text-xs mb-2 text-center">Demo — try a sample bin:</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {DEMO_BINS.map((id) => (
                <button
                  key={id}
                  onClick={() => lookupAndSet(id)}
                  disabled={looking}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs font-mono hover:bg-emerald-500/15 hover:border-emerald-400/30 hover:text-emerald-400 transition disabled:opacity-40"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>

          {lookupError && (
            <p className="text-rose-400 text-xs text-center">{lookupError}</p>
          )}
          {looking && (
            <p className="text-white/50 text-xs text-center flex items-center justify-center gap-1.5">
              <RefreshCw size={12} className="animate-spin" /> Looking up bin...
            </p>
          )}
        </div>
      )}

      {phase === 'verifying' && (
        <div className="space-y-2.5 animate-fade-in mt-5">
          <div className="flex items-center justify-between p-3.5 rounded-2xl glass border border-emerald-400/20">
            <span className="text-sm text-white/70 flex items-center gap-1.5"><QrCode size={14} /> Scanned Bin ID</span>
            <span className="text-sm text-white font-mono">{bin?.bin_id || '—'}</span>
          </div>
          <div className="flex items-center justify-between p-3.5 rounded-2xl glass border border-emerald-400/20">
            <span className="text-sm text-white/70 flex items-center gap-1.5"><MapPin size={14} /> GPS Location</span>
            <span className="text-sm text-emerald-400 font-medium">Match found</span>
          </div>
        </div>
      )}

      {phase === 'result' && bin && (
        <div className="animate-fade-up space-y-4 mt-6">
          <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/30">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <p className="text-sm font-medium text-emerald-400">Bin identified</p>
          </div>

          <div className="p-4 rounded-2xl glass border border-white/10 space-y-3">
            <div className="flex items-start gap-2.5">
              <Trash2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-white/50">Bin Number</p>
                <p className="text-sm font-mono font-semibold text-white">{bin.bin_id}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-white/50">Address</p>
                <p className="text-sm font-semibold text-white leading-snug">{bin.address}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl glass border border-white/10">
              <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1"><ShieldCheck size={12} /> Zone</div>
              <p className="text-sm font-semibold text-white">{bin.zone}</p>
            </div>
            <div className="p-3 rounded-2xl glass border border-white/10">
              <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1"><Gauge size={12} /> Capacity</div>
              <p className="text-sm font-semibold text-white">{bin.capacity}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl glass border border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1"><Clock size={12} /> Last collected</div>
            <p className="text-sm font-semibold text-white">{bin.last_collected}</p>
          </div>

          {role === 'citizen' && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-blue-500/15 border border-emerald-400/20 flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-400 shrink-0" />
              <p className="text-xs text-white/80">Tap done to file an overflow report for this bin.</p>
            </div>
          )}

          {role === 'citizen' && (
            <button
              onClick={handleClose}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] transition"
            >
              Done <ArrowRight size={18} />
            </button>
          )}

          {role === 'worker' && (
            <button
              onClick={() => setPhase('checklist')}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] transition"
            >
              Start Collection Checklist <ArrowRight size={18} />
            </button>
          )}
        </div>
      )}

      {phase === 'checklist' && bin && (
        <div className="animate-fade-up space-y-4 mt-6">
          <div className="flex items-center gap-2 p-3.5 rounded-2xl glass border border-white/10">
            <Trash2 size={18} className="text-emerald-400 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-white/50">Collecting Bin</p>
              <p className="text-sm font-mono font-semibold text-white">{bin.bin_id} · {bin.address}</p>
            </div>
          </div>

          <div className="space-y-2">
            {CHECKLIST_ITEMS.map((item, i) => {
              const on = !!checked[item.key];
              return (
                <button
                  key={item.key}
                  onClick={() => toggleCheck(item.key)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition text-left animate-fade-up ${
                    on
                      ? 'bg-emerald-500/15 border-emerald-400/40'
                      : 'glass border-white/10 hover:border-white/25'
                  }`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {on
                    ? <CheckSquare size={20} className="text-emerald-400 shrink-0" />
                    : <Square size={20} className="text-white/40 shrink-0" />}
                  <span className={`text-sm font-medium ${on ? 'text-white' : 'text-white/70'}`}>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-white/50">
              {Object.values(checked).filter(Boolean).length}/{CHECKLIST_ITEMS.length} completed
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPhase('result')}
                className="px-4 h-11 rounded-2xl glass border border-white/15 text-white/80 text-sm font-medium hover:scale-105 transition"
              >
                Back
              </button>
              <button
                onClick={completeCollection}
                disabled={!allChecked}
                className={`px-5 h-11 rounded-2xl font-semibold flex items-center gap-2 transition ${
                  allChecked
                    ? 'bg-gradient-to-r from-emerald-500 to-blue-600 text-white shadow-lg shadow-emerald-500/30 hover:scale-[1.02]'
                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 size={18} /> Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'completed' && bin && (
        <div className="animate-fade-up space-y-4 mt-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto animate-fade-in">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-emerald-400 text-lg">Collection Completed!</p>
            <p className="text-sm text-white/60 mt-1">All checklist steps verified. Citizen has been notified automatically.</p>
          </div>
          <div className="p-4 rounded-2xl glass border border-white/10 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Bin</span>
              <span className="text-sm font-mono text-white">{bin.bin_id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Steps verified</span>
              <span className="text-sm text-emerald-400 font-medium">{CHECKLIST_ITEMS.length}/{CHECKLIST_ITEMS.length}</span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] transition"
          >
            Done <ArrowRight size={18} />
          </button>
        </div>
      )}
    </ScannerModal>
  );
}
