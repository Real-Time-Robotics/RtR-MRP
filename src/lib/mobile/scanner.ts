// Camera-based barcode/QR code scanner using @zxing/library
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  Result,
} from "@zxing/library";

export interface ScanResult {
  text: string;
  format: string;
  rawBytes?: Uint8Array;
  timestamp: Date;
}

export interface ScannerOptions {
  formats?: BarcodeFormat[];
  facingMode?: "environment" | "user";
  torch?: boolean;
  playBeep?: boolean;
}

const DEFAULT_FORMATS = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.PDF_417,
];

export class BarcodeScanner {
  private reader: BrowserMultiFormatReader | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private isScanning = false;
  private onScanCallback: ((result: ScanResult) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;

  constructor(options: ScannerOptions = {}) {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, options.formats || DEFAULT_FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);

    this.reader = new BrowserMultiFormatReader(hints);
  }

  async start(
    videoElement: HTMLVideoElement,
    onScan: (result: ScanResult) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    if (this.isScanning) {
      return;
    }

    this.videoElement = videoElement;
    this.onScanCallback = onScan;
    this.onErrorCallback = onError || null;

    try {
      // Get available video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");

      // Prefer back camera
      let deviceId: string | undefined;
      const backCamera = videoDevices.find(
        (d) =>
          d.label.toLowerCase().includes("back") ||
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("environment")
      );
      if (backCamera) {
        deviceId = backCamera.deviceId;
      } else if (videoDevices.length > 0) {
        // Use last device (usually back camera on mobile)
        deviceId = videoDevices[videoDevices.length - 1].deviceId;
      }

      // Start scanning
      this.isScanning = true;
      await this.reader!.decodeFromVideoDevice(
        deviceId || null,
        videoElement,
        (result: Result | undefined, error: Error | undefined) => {
          if (result) {
            const scanResult: ScanResult = {
              text: result.getText(),
              format: BarcodeFormat[result.getBarcodeFormat()],
              rawBytes: result.getRawBytes(),
              timestamp: new Date(),
            };
            this.playBeep();
            this.vibrate();
            this.onScanCallback?.(scanResult);
          }
          if (error && this.onErrorCallback) {
            // Ignore NotFoundException as it's normal during scanning
            if (error.name !== "NotFoundException") {
              this.onErrorCallback(error);
            }
          }
        }
      );
    } catch (error) {
      this.isScanning = false;
      throw error;
    }
  }

  stop(): void {
    if (this.reader) {
      this.reader.reset();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.isScanning = false;
    this.videoElement = null;
    this.onScanCallback = null;
    this.onErrorCallback = null;
  }

  async toggleTorch(): Promise<boolean> {
    if (!this.stream) return false;

    const track = this.stream.getVideoTracks()[0];
    if (!track) return false;

    const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
      torch?: boolean;
    };
    if (!capabilities.torch) return false;

    const settings = track.getSettings() as MediaTrackSettings & {
      torch?: boolean;
    };
    const newTorchState = !settings.torch;

    await track.applyConstraints({
      advanced: [{ torch: newTorchState } as MediaTrackConstraintSet],
    });

    return newTorchState;
  }

  async switchCamera(): Promise<void> {
    if (!this.videoElement || !this.onScanCallback) return;

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((d) => d.kind === "videoinput");

    if (videoDevices.length <= 1) return;

    // Get current device
    // Restart with new device
    this.stop();
    await this.start(this.videoElement, this.onScanCallback, this.onErrorCallback || undefined);
  }

  private playBeep(): void {
    try {
      const audioContext = new (window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 1800;
      oscillator.type = "sine";
      gainNode.gain.value = 0.1;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // Silently fail if audio playback fails
    }
  }

  private vibrate(): void {
    if ("vibrate" in navigator) {
      navigator.vibrate(100);
    }
  }

  isActive(): boolean {
    return this.isScanning;
  }

  static async checkCameraPermission(): Promise<PermissionState> {
    try {
      const result = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });
      return result.state;
    } catch {
      // Fallback for browsers that don't support permissions API
      return "prompt";
    }
  }

  static async requestCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  static async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput");
  }
}

// Singleton instance for convenience
let scannerInstance: BarcodeScanner | null = null;

export function getScanner(options?: ScannerOptions): BarcodeScanner {
  if (!scannerInstance) {
    scannerInstance = new BarcodeScanner(options);
  }
  return scannerInstance;
}

export function destroyScanner(): void {
  if (scannerInstance) {
    scannerInstance.stop();
    scannerInstance = null;
  }
}
