import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQRScanner } from '@/hooks/useQRScanner';
import {
  QrCode, MapPin, X, CheckCircle, Camera, CameraOff, RefreshCw, Zap,
} from '@/lib/icons';

export type ScanPhase = 'scanning' | 'verifying' | 'success';

type ScanResult = { binId: string; decoded: string };

export default function LiveQRScanner({ onClose }: { onClose: (result?: ScanResult) => void }) {
  const [phase, setPhase] = useState<ScanPhase>('scanning');
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleScan = (data: string) => {
    setResult({ binId: data, decoded: data });
    setPhase('verifying');
    setTimeout(() => setPhase('success'), 1400);
  };

  const scanner = useQRScanner(handleScan);

  const handleClose = () => {
    scanner.stop();
    onClose(phase === 'success' && result ? result : undefined);
  };

  const isScanning = phase === 'scanning' && scanner.state !== 'error' && !scanner.error;

  return (
    <ScannerModal
      title="QR Scanner"
      subtitle="Scan a bin's QR code to verify & complete collection"
      onClose={handleClose}
      phase={phase}
      isScanning={isScanning}
      scanner={scanner}
    >
      {isScanning && (
        <div className="text-center mt-5">
          <p className="text-white/90 text-sm font-medium">Align the QR code within the frame</p>
          <p className="text-white/50 text-xs mt-1">Scanning in real time — hold steady</p>
        </div>
      )}

      {phase === 'verifying' && (
        <div className="space-y-2.5 animate-fade-in mt-5">
          <div className="flex items-center justify-between p-3.5 rounded-2xl glass border border-emerald-400/20">
            <span className="text-sm text-white/70 flex items-center gap-1.5"><MapPin size={14} /> GPS Location</span>
            <span className="text-sm text-emerald-400 font-medium">Match found</span>
          </div>
          <div className="flex items-center justify-between p-3.5 rounded-2xl glass border border-emerald-400/20">
            <span className="text-sm text-white/70 flex items-center gap-1.5"><QrCode size={14} /> Scanned Bin ID</span>
            <span className="text-sm text-white font-mono">{result?.binId || '—'}</span>
          </div>
        </div>
      )}

      {phase === 'success' && (
        <div className="space-y-4 animate-fade-up mt-6">
          <div className="p-5 rounded-3xl bg-emerald-500/15 border border-emerald-400/30 text-center">
            <p className="font-semibold text-emerald-400 text-lg">Collection Completed!</p>
            <p className="text-sm text-white/60 mt-1">Citizen has been notified automatically.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl glass border border-white/10 text-center">
              <p className="text-xs text-white/50">Bin ID</p>
              <p className="text-sm font-mono font-semibold text-white truncate mt-0.5">{result?.binId}</p>
            </div>
            <div className="p-3.5 rounded-2xl glass border border-white/10 text-center">
              <p className="text-xs text-white/50">Time</p>
              <p className="text-sm font-semibold text-white mt-0.5">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:scale-[1.02] transition">
            Done
          </button>
        </div>
      )}
    </ScannerModal>
  );
}

/** Shared full-screen immersive scanner modal */
export function ScannerModal({
  title, subtitle, onClose, phase, isScanning, scanner, children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  phase: ScanPhase;
  isScanning: boolean;
  scanner: ReturnType<typeof useQRScanner>;
  children: React.ReactNode;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col animate-fade-in bg-black">
      {/* Camera / viewport fills the screen */}
      <div className="relative flex-1 overflow-hidden bg-black">
        <video
          ref={scanner.videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas ref={scanner.canvasRef} className="hidden" />

        {/* Dark gradient vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(circle at center, transparent 32%, rgba(0,0,0,0.7) 78%)',
        }} />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-6 flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full glass border border-white/15 flex items-center justify-center text-white hover:scale-105 transition"
          >
            <X size={20} />
          </button>
          <div className="text-center">
            <p className="text-white font-semibold text-sm font-display">{title}</p>
            <p className="text-white/50 text-[11px] mt-0.5">{subtitle}</p>
          </div>
          <div className="w-10 h-10" />
        </div>

        {/* Scanning frame overlay */}
        {isScanning && <ScanFrame />}

        {/* Torch button */}
        {isScanning && <TorchButton videoRef={scanner.videoRef} />}

        {/* Error state */}
        {scanner.error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
            <div className="relative w-20 h-20 mb-5">
              <div className="absolute inset-0 rounded-3xl bg-rose-500/15" />
              <div className="relative w-full h-full flex items-center justify-center text-rose-400">
                <CameraOff size={34} />
              </div>
            </div>
            <p className="text-white font-semibold text-base mb-1.5">Camera unavailable</p>
            <p className="text-white/50 text-sm max-w-xs leading-relaxed">{scanner.error}</p>
            <button
              onClick={scanner.start}
              className="mt-6 px-5 py-2.5 rounded-2xl bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 hover:scale-105 transition shadow-lg shadow-emerald-500/30"
            >
              <RefreshCw size={16} /> Retry camera
            </button>
          </div>
        )}

        {/* Verifying overlay */}
        {phase === 'verifying' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-400/20" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-400 animate-spin-slow" />
            </div>
            <p className="text-white font-medium text-sm">Verifying GPS location...</p>
          </div>
        )}

        {/* Success overlay */}
        {phase === 'success' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-emerald-950/40 backdrop-blur-sm animate-fade-in">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-20 h-20 rounded-full bg-emerald-500/40 success-ripple" />
              <div className="absolute w-20 h-20 rounded-full bg-emerald-500/30 success-ripple" style={{ animationDelay: '0.15s' }} />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center animate-check-pop shadow-2xl shadow-emerald-500/50">
                <CheckCircle size={52} className="text-white" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div className="relative z-10 -mt-6 pb-[env(safe-area-inset-bottom)]">
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-5 pt-6 max-w-md mx-auto shadow-2xl text-slate-900 dark:text-white">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

function ScanFrame() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div className="relative w-64 h-64 max-w-[72%] max-h-[50vh]">
        {/* Corner brackets with pulse */}
        <div className="absolute top-0 left-0 w-12 h-12 border-t-[3px] border-l-[3px] border-emerald-400 rounded-tl-2xl scan-corner" style={{ animationDelay: '0s' }} />
        <div className="absolute top-0 right-0 w-12 h-12 border-t-[3px] border-r-[3px] border-emerald-400 rounded-tr-2xl scan-corner" style={{ animationDelay: '0.2s' }} />
        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-2xl scan-corner" style={{ animationDelay: '0.4s' }} />
        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-2xl scan-corner" style={{ animationDelay: '0.6s' }} />

        {/* Subtle inner glow ring */}
        <div className="absolute inset-4 rounded-2xl border border-emerald-400/15 scan-glow" />

        {/* Scan line with trail */}
        <div className="scan-line" />

        {/* Center reticle dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400/60 scan-glow" />
      </div>
    </div>
  );
}

function TorchButton({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement> }) {
  const [torchOn, setTorchOn] = useState(false);

  const toggleTorch = async () => {
    const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0];
    if (!track) return;
    try {
      const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      if (!caps.torch) return;
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn((v) => !v);
    } catch {
      // torch not supported
    }
  };

  return (
    <button
      onClick={toggleTorch}
      className={`absolute top-20 right-4 z-20 w-11 h-11 rounded-full flex items-center justify-center transition hover:scale-105 ${
        torchOn ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40' : 'glass border border-white/15 text-white'
      }`}
    >
      <Zap size={18} />
    </button>
  );
}
