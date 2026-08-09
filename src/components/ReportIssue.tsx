import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera, X, Sparkles, Trash2, Gauge, AlertTriangle, FileText,
  CheckCircle2, ArrowRight, MapPin, RefreshCw, Image, Send,
} from '@/lib/icons';
import { Badge } from '@/components/ui/Primitives';

type Phase = 'capture' | 'form' | 'processing' | 'result';

const sampleResult = {
  wasteType: 'Mixed Municipal Waste',
  overflow: 92,
  priority: 'High' as const,
  complaintId: 'CMP-4821',
  status: 'Pending' as const,
  summary: 'Public bin overflowing with mixed waste. Strong odour reported by nearby residents. Requires immediate collection.',
  detectedItems: ['Food packaging', 'Plastic bottles', 'Organic waste', 'Paper scraps'],
};

export default function ReportIssue({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('capture');
  const [progress, setProgress] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [binNumber, setBinNumber] = useState('');
  const [description, setDescription] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      // Wait for next tick so videoRef is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play();
        }
      }, 50);
    } catch (e) {
      const err = e as Error;
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please allow camera permissions or upload from gallery.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device. Try uploading from gallery instead.');
      } else {
        setCameraError('Could not start camera. You can upload from gallery instead.');
      }
    }
  }, []);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.85));
    stopCamera();
    setPhase('form');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      setPhase('form');
    };
    reader.readAsDataURL(file);
  };

  const startProcessing = () => {
    setPhase('processing');
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => setPhase('result'), 400);
          return 100;
        }
        return p + 4;
      });
    }, 50);
  };

  const steps = [
    { at: 25, label: 'Analyzing image...' },
    { at: 50, label: 'Detecting waste type...' },
    { at: 75, label: 'Calculating overflow...' },
    { at: 95, label: 'Generating complaint...' },
  ];
  const currentStep = steps.filter((s) => progress >= s.at).pop();

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { stopCamera(); onClose(); }} />
      <div className="relative w-full max-w-lg glass-card p-6 animate-scale-in max-h-[92vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <h2 className="font-semibold text-primary-c">Report Garbage</h2>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-c hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        {/* Capture phase */}
        {phase === 'capture' && (
          <div className="animate-fade-in space-y-4">
            {!cameraActive && !cameraError && (
              <>
                <button
                  onClick={startCamera}
                  className="w-full aspect-video rounded-2xl border-2 border-dashed border-emerald-400/40 flex flex-col items-center justify-center gap-3 hover:bg-emerald-500/5 transition group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-blue-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition">
                    <Camera size={28} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-primary-c">Take a photo</p>
                    <p className="text-xs text-secondary-c mt-0.5">Open live camera to capture the garbage</p>
                  </div>
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-soft-c" />
                  <span className="text-xs text-muted-c">or</span>
                  <div className="flex-1 h-px bg-soft-c" />
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-12 rounded-2xl glass border border-soft-c flex items-center justify-center gap-2 text-sm font-medium text-secondary-c hover:bg-white/5 transition"
                >
                  <Image size={18} /> Upload from gallery
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </>
            )}

            {cameraActive && (
              <div className="space-y-3">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
                  <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-cover" />
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background: 'radial-gradient(circle at center, transparent 60%, rgba(0,0,0,0.5) 100%)',
                  }} />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-rose-500/90 text-white text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { stopCamera(); }}
                    className="px-4 h-12 rounded-2xl glass border border-soft-c text-secondary-c font-medium text-sm hover:bg-white/5 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={capturePhoto}
                    className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] transition"
                  >
                    <Camera size={20} /> Capture Photo
                  </button>
                </div>
              </div>
            )}

            {cameraError && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-400/30 flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-secondary-c">{cameraError}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={startCamera}
                    className="px-4 h-12 rounded-2xl glass border border-soft-c text-secondary-c font-medium text-sm flex items-center gap-2 hover:bg-white/5 transition"
                  >
                    <RefreshCw size={16} /> Retry
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] transition"
                  >
                    <Image size={18} /> Upload from gallery
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form phase */}
        {phase === 'form' && (
          <div className="animate-fade-in space-y-4">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
              {capturedImage && <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />}
              <button
                onClick={() => { setCapturedImage(null); setPhase('capture'); }}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition"
              >
                <X size={16} />
              </button>
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-semibold">
                Photo captured
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-c uppercase tracking-wider mb-1.5 block">Address / Location</label>
              <div className="flex items-center gap-2 px-3.5 h-12 rounded-2xl bg-input-c border border-soft-c focus-within:border-emerald-400/50 transition">
                <MapPin size={16} className="text-muted-c shrink-0" />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. MG Road, Sector 4, near bus stop"
                  className="flex-1 bg-transparent outline-none text-sm text-primary-c placeholder:text-muted-c"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-c uppercase tracking-wider mb-1.5 block">Bin Number</label>
              <div className="flex items-center gap-2 px-3.5 h-12 rounded-2xl bg-input-c border border-soft-c focus-within:border-emerald-400/50 transition">
                <Trash2 size={16} className="text-muted-c shrink-0" />
                <input
                  value={binNumber}
                  onChange={(e) => setBinNumber(e.target.value)}
                  placeholder="e.g. BIN-112 (optional)"
                  className="flex-1 bg-transparent outline-none text-sm text-primary-c placeholder:text-muted-c"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-c uppercase tracking-wider mb-1.5 block">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any details about the issue..."
                rows={3}
                className="w-full px-3.5 py-3 rounded-2xl bg-input-c border border-soft-c outline-none text-sm text-primary-c placeholder:text-muted-c resize-none focus:border-emerald-400/50 transition"
              />
            </div>

            <button
              onClick={startProcessing}
              disabled={!address.trim()}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Send size={18} /> Submit Report
            </button>
            {!address.trim() && (
              <p className="text-xs text-muted-c text-center">Please enter an address to submit</p>
            )}
          </div>
        )}

        {/* Processing phase */}
        {phase === 'processing' && (
          <div className="py-8 animate-fade-in flex flex-col items-center">
            {capturedImage && (
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden mb-6">
                <img src={capturedImage} alt="Analyzing" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-emerald-500/20 animate-pulse" />
                <div className="absolute inset-0 rounded-2xl border-2 border-emerald-400/60" />
              </div>
            )}
            <p className="font-semibold text-primary-c mb-1">AI is analyzing your image</p>
            <p className="text-sm text-secondary-c mb-6 h-5">{currentStep?.label || 'Starting...'}</p>
            <div className="w-full max-w-xs h-2 rounded-full bg-input-c overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-600 transition-all duration-75" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted-c mt-2">{progress}%</p>
          </div>
        )}

        {/* Result phase */}
        {phase === 'result' && (
          <div className="animate-fade-up space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/30">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Analysis complete — complaint filed automatically</p>
            </div>

            {capturedImage && (
              <div className="relative aspect-video rounded-2xl overflow-hidden">
                <img src={capturedImage} alt="Reported" className="w-full h-full object-cover" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-xs text-white bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                    <MapPin size={12} /> {address || 'Location'}
                  </span>
                  <Badge status={sampleResult.priority} />
                </div>
              </div>
            )}

            {(address || binNumber) && (
              <div className="grid grid-cols-2 gap-3">
                {address && (
                  <div className="p-3 rounded-2xl bg-input-c border border-soft-c">
                    <div className="flex items-center gap-1.5 text-xs text-muted-c mb-1"><MapPin size={12} /> Address</div>
                    <p className="text-sm font-semibold text-primary-c truncate">{address}</p>
                  </div>
                )}
                {binNumber && (
                  <div className="p-3 rounded-2xl bg-input-c border border-soft-c">
                    <div className="flex items-center gap-1.5 text-xs text-muted-c mb-1"><Trash2 size={12} /> Bin Number</div>
                    <p className="text-sm font-semibold text-primary-c font-mono">{binNumber}</p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-input-c border border-soft-c">
                <div className="flex items-center gap-1.5 text-xs text-muted-c mb-1"><Trash2 size={12} /> Waste Type</div>
                <p className="text-sm font-semibold text-primary-c">{sampleResult.wasteType}</p>
              </div>
              <div className="p-3 rounded-2xl bg-input-c border border-soft-c">
                <div className="flex items-center gap-1.5 text-xs text-muted-c mb-1"><Gauge size={12} /> Overflow</div>
                <p className="text-sm font-semibold text-primary-c">{sampleResult.overflow}%</p>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500" style={{ width: `${sampleResult.overflow}%` }} />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-input-c border border-soft-c">
              <p className="text-xs text-muted-c mb-2">AI detected items</p>
              <div className="flex flex-wrap gap-1.5">
                {sampleResult.detectedItems.map((it) => (
                  <span key={it} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{it}</span>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-input-c border border-soft-c">
              <div className="flex items-center gap-1.5 text-xs text-muted-c mb-1.5"><FileText size={12} /> Auto-generated summary</div>
              <p className="text-sm text-secondary-c leading-relaxed">{sampleResult.summary}</p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-400/20">
              <div>
                <p className="text-xs text-muted-c">Complaint ID</p>
                <p className="font-bold text-primary-c font-display">{sampleResult.complaintId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-c">Status</p>
                <Badge status={sampleResult.status} />
              </div>
            </div>

            <button onClick={onClose} className="w-full h-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30">
              Done <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
