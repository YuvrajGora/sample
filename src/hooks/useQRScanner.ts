import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export type ScannerState = 'idle' | 'scanning' | 'error';

export type ScannerHook = {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  state: ScannerState;
  error: string | null;
  scannedData: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
};

const MAX_SCAN_DIM = 640;

export function useQRScanner(onScan: (data: string) => void): ScannerHook {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const activeSessionRef = useRef<number>(0);

  const [state, setState] = useState<ScannerState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);

  const stop = useCallback(() => {
    activeSessionRef.current++;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (doneRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA || video.paused) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw === 0 || vh === 0) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const scale = Math.min(1, MAX_SCAN_DIM / Math.max(vw, vh));
    const sw = Math.max(1, Math.round(vw * scale));
    const sh = Math.max(1, Math.round(vh * scale));

    canvas.width = sw;
    canvas.height = sh;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    ctx.drawImage(video, 0, 0, sw, sh);
    const imageData = ctx.getImageData(0, 0, sw, sh);

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (code && code.data) {
      doneRef.current = true;
      setScannedData(code.data);
      stop();
      onScanRef.current(code.data);
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [stop]);

  const start = useCallback(async () => {
    const session = ++activeSessionRef.current;
    doneRef.current = false;
    setError(null);
    setScannedData(null);
    setState('scanning');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setState('error');
      setError('Camera API not available. This requires HTTPS or localhost. Use manual entry below.');
      return;
    }

    // Release any previous tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      // Stale check
      if (session !== activeSessionRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');

        // Wait for video element readiness (metadata loaded) with a timeout fallback
        await Promise.race([
          new Promise<void>((resolve) => {
            if (video.readyState >= 1) { // HAVE_METADATA
              resolve();
            } else {
              video.onloadedmetadata = () => resolve();
            }
          }),
          new Promise<void>((resolve) => setTimeout(resolve, 2000))
        ]);

        // Stale check 2 (after async wait)
        if (session !== activeSessionRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          video.srcObject = null;
          return;
        }

        try {
          await video.play();
        } catch (playErr) {
          console.warn('Video play interrupted or failed:', playErr);
        }
      }

      // Stale check 3 (before raf)
      if (session !== activeSessionRef.current) {
        return;
      }

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      if (session !== activeSessionRef.current) return;
      const err = e as Error;
      setState('error');
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Allow camera permissions in your browser, or use manual entry below.');
      } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
        setError('No camera found. Use manual entry below.');
      } else {
        setError('Could not start camera. ' + (err.message || '') + ' Use manual entry below.');
      }
    }
  }, [tick]);

  const reset = useCallback(() => {
    stop();
    setScannedData(null);
    setError(null);
    setState('idle');
  }, [stop]);

  useEffect(() => {
    let active = true;

    async function initCamera() {
      if (!active) return;
      await start();
    }

    initCamera();

    return () => {
      active = false;
      stop();
    };
  }, [start, stop]);

  return { videoRef, canvasRef, state, error, scannedData, start, stop, reset };
}
