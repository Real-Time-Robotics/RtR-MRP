"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BarcodeScanner, ScanResult } from "@/lib/mobile/scanner";
import { parseBarcode, ParsedBarcode } from "@/lib/mobile/barcode-parser";
import { feedback } from "@/lib/mobile/haptics";
import { clientLogger } from "@/lib/client-logger";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Camera,
  CameraOff,
  FlashlightOff,
  Flashlight,
  RefreshCw,
  X,
  Loader2,
} from "lucide-react";

export interface ScannerProps {
  onScan: (result: ParsedBarcode) => void;
  onClose?: () => void;
  continuous?: boolean;
  showPreview?: boolean;
  className?: string;
  acceptedTypes?: string[];
}

export function Scanner({
  onScan,
  onClose,
  continuous = false,
  showPreview = true,
  className,
  acceptedTypes,
}: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<BarcodeScanner | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [lastScan, setLastScan] = useState<ParsedBarcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleScan = useCallback(
    (result: ScanResult) => {
      const parsed = parseBarcode(result.text, result.format);

      // Filter by accepted types if specified
      if (
        acceptedTypes &&
        acceptedTypes.length > 0 &&
        !acceptedTypes.includes(parsed.entityType)
      ) {
        return;
      }

      // Provide feedback
      feedback.scanSuccess();

      setLastScan(parsed);
      onScan(parsed);

      // Stop scanning if not continuous
      if (!continuous && scannerRef.current) {
        scannerRef.current.stop();
        setIsActive(false);
      }
    },
    [continuous, onScan, acceptedTypes]
  );

  const handleError = useCallback((err: Error) => {
    clientLogger.error("Scanner error", err);
    feedback.scanError();
    setError(err.message);
  }, []);

  const startScanner = useCallback(async () => {
    if (!videoRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check permission
      const permissionState = await BarcodeScanner.checkCameraPermission();
      if (permissionState === "denied") {
        setHasPermission(false);
        setIsLoading(false);
        return;
      }

      // Request permission if needed
      if (permissionState === "prompt") {
        const granted = await BarcodeScanner.requestCameraPermission();
        if (!granted) {
          setHasPermission(false);
          setIsLoading(false);
          return;
        }
      }

      setHasPermission(true);

      // Create and start scanner
      scannerRef.current = new BarcodeScanner();
      await scannerRef.current.start(videoRef.current, handleScan, handleError);
      setIsActive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scanner");
    } finally {
      setIsLoading(false);
    }
  }, [handleScan, handleError]);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current = null;
    }
    setIsActive(false);
    setTorchOn(false);
  }, []);

  const toggleTorch = useCallback(async () => {
    if (scannerRef.current) {
      const newState = await scannerRef.current.toggleTorch();
      setTorchOn(newState);
    }
  }, []);

  const switchCamera = useCallback(async () => {
    if (scannerRef.current) {
      await scannerRef.current.switchCamera();
    }
  }, []);

  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, [startScanner, stopScanner]);

  if (hasPermission === false) {
    return (
      <Card className={cn("bg-neutral-900 text-white", className)}>
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
          <CameraOff className="h-16 w-16 text-neutral-500" />
          <p className="text-center">
            Camera permission is required to scan barcodes.
          </p>
          <Button onClick={startScanner}>Request Permission</Button>
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("relative bg-black", className)}>
      {/* Video Preview */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {/* Scanning Frame Overlay */}
      {isActive && !isLoading && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Darkened corners */}
          <div className="absolute inset-0 border-[40px] border-black/50" />

          {/* Scanning frame */}
          <div className="absolute inset-[40px] border-2 border-white rounded-lg">
            {/* Corner markers */}
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />

            {/* Scanning line animation */}
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-primary animate-pulse" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
        <Button
          variant="secondary"
          size="icon"
          onClick={toggleTorch}
          disabled={!isActive}
          className="rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
          aria-label={torchOn ? "Tắt đèn flash" : "Bật đèn flash"}
        >
          {torchOn ? (
            <Flashlight className="h-5 w-5 text-yellow-400" />
          ) : (
            <FlashlightOff className="h-5 w-5 text-white" />
          )}
        </Button>

        <Button
          variant="secondary"
          size="icon"
          onClick={switchCamera}
          disabled={!isActive}
          className="rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
          aria-label="Chuyển camera"
        >
          <RefreshCw className="h-5 w-5 text-white" />
        </Button>

        {isActive ? (
          <Button
            variant="secondary"
            size="icon"
            onClick={stopScanner}
            className="rounded-full bg-red-500/80 backdrop-blur-sm hover:bg-red-600"
            aria-label="Dừng quét"
          >
            <CameraOff className="h-5 w-5 text-white" />
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="icon"
            onClick={startScanner}
            className="rounded-full bg-green-500/80 backdrop-blur-sm hover:bg-green-600"
            aria-label="Bắt đầu quét"
          >
            <Camera className="h-5 w-5 text-white" />
          </Button>
        )}
      </div>

      {/* Close button */}
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
          aria-label="Đóng"
        >
          <X className="h-5 w-5 text-white" />
        </Button>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-4 left-4 right-16 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Last scan preview */}
      {showPreview && lastScan && (
        <div className="absolute bottom-20 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-xs text-neutral-500">{lastScan.entityType}</p>
              <p className="font-mono font-medium truncate">{lastScan.raw}</p>
            </div>
            <span className="text-xs text-neutral-400">{lastScan.format}</span>
          </div>
        </div>
      )}
    </div>
  );
}
