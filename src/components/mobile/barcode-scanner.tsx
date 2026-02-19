'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  X,
  Keyboard,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// BARCODE DETECTOR API TYPES (Experimental Web API)
// =============================================================================

interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
  cornerPoints: { x: number; y: number }[];
}

interface BarcodeDetectorInstance {
  detect(source: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorInstance;
}

interface WindowWithBarcodeDetector extends Window {
  BarcodeDetector?: BarcodeDetectorConstructor;
}

// =============================================================================
// BARCODE SCANNER COMPONENT
// =============================================================================

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose?: () => void;
  continuous?: boolean;
  formats?: string[];
  className?: string;
}

export function BarcodeScanner({
  onScan,
  onClose,
  continuous = false,
  formats = ['code_128', 'code_39', 'qr_code', 'ean_13'],
  className,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setHasPermission(true);
      setIsScanning(true);
      
      // Start scanning loop
      requestAnimationFrame(scanFrame);
      
    } catch (err) {
      clientLogger.error('Camera error', err);
      setHasPermission(false);
      setError('Không thể truy cập camera. Vui lòng cấp quyền.');
    }
  }, [facingMode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Toggle torch
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    
    const track = streamRef.current.getVideoTracks()[0];
    if (track && 'getCapabilities' in track) {
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn } as MediaTrackConstraintSet],
        });
        setTorchOn(!torchOn);
      }
    }
  }, [torchOn]);

  // Switch camera
  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, [stopCamera]);

  // Scan frame (simplified - in production use @zxing/library)
  const scanFrame = useCallback(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // In production, use BarcodeDetector API or @zxing/library
    // This is a placeholder for the actual scanning logic
    const windowWithDetector = window as WindowWithBarcodeDetector;
    if (windowWithDetector.BarcodeDetector) {
      const barcodeDetector = new windowWithDetector.BarcodeDetector({ formats });
      barcodeDetector.detect(canvas)
        .then((barcodes: DetectedBarcode[]) => {
          if (barcodes.length > 0) {
            const barcode = barcodes[0].rawValue;
            handleScanResult(barcode);
          }
        })
        .catch(err => clientLogger.error('Barcode detection failed', err));
    }

    if (isScanning) {
      requestAnimationFrame(scanFrame);
    }
  }, [isScanning, formats]);

  // Handle scan result
  const handleScanResult = useCallback((barcode: string) => {
    if (barcode === lastScanned && !continuous) return;
    
    setLastScanned(barcode);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
    
    // Audio feedback
    try {
      const audio = new Audio('/sounds/beep-success.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (err) {
      clientLogger.error('Audio feedback failed', err);
    }
    
    onScan(barcode);
    
    if (!continuous) {
      stopCamera();
    }
  }, [lastScanned, continuous, onScan, stopCamera]);

  // Handle manual input
  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      handleScanResult(manualCode.trim());
      setManualCode('');
      setShowManualInput(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Restart camera when facingMode changes
  useEffect(() => {
    if (hasPermission && isScanning) {
      startCamera();
    }
  }, [facingMode]);

  return (
    <div className={cn('relative bg-black rounded-2xl overflow-hidden', className)}>
      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
      />
      
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Scanning Overlay */}
      {isScanning && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Dark overlay with cutout */}
          <div className="absolute inset-0 bg-black/50" />
          
          {/* Scan area */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-64 h-64">
              {/* Clear area */}
              <div className="absolute inset-0 bg-transparent" 
                style={{ 
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                  borderRadius: '16px'
                }} 
              />
              
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
              
              {/* Scanning line animation */}
              <div className="absolute left-2 right-2 h-0.5 bg-blue-500 animate-scan" />
            </div>
          </div>
          
          {/* Instructions */}
          <div className="absolute bottom-24 left-0 right-0 text-center">
            <p className="text-white text-sm">
              Đưa mã vào khung để quét
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-6 h-6" />
          </button>
        )}
        
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={toggleTorch}
            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            aria-label={torchOn ? 'Tắt đèn flash' : 'Bật đèn flash'}
          >
            {torchOn ? (
              <FlashlightOff className="w-6 h-6" />
            ) : (
              <Flashlight className="w-6 h-6" />
            )}
          </button>

          <button
            onClick={switchCamera}
            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            aria-label="Chuyển camera"
          >
            <SwitchCamera className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Start/Stop Button */}
      {!isScanning && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
          {hasPermission === false ? (
            <div className="text-center p-6">
              <CameraOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-white mb-4">{error || 'Không thể truy cập camera'}</p>
              <button
                onClick={startCamera}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium"
              >
                Thử lại
              </button>
            </div>
          ) : (
            <button
              onClick={startCamera}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center">
                <Camera className="w-12 h-12 text-white" />
              </div>
              <span className="text-white font-medium">Nhấn để quét</span>
            </button>
          )}
        </div>
      )}

      {/* Manual Input Toggle */}
      <div className="absolute bottom-4 left-4 right-4">
        {showManualInput ? (
          <div className="bg-white rounded-xl p-3 flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              placeholder="Nhập mã thủ công..."
              aria-label="Nhập mã thủ công"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleManualSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
            >
              OK
            </button>
            <button
              onClick={() => setShowManualInput(false)}
              className="px-3 py-2 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowManualInput(true)}
            className="w-full py-3 bg-white/10 backdrop-blur text-white rounded-xl flex items-center justify-center gap-2"
          >
            <Keyboard className="w-5 h-5" />
            <span>Nhập thủ công</span>
          </button>
        )}
      </div>

      {/* Scan animation styles */}
      <style jsx>{`
        @keyframes scan {
          0%, 100% {
            top: 8px;
          }
          50% {
            top: calc(100% - 10px);
          }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default BarcodeScanner;
