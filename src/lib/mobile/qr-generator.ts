// QR Code and Barcode generation utilities
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { clientLogger } from '@/lib/client-logger';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

export interface BarcodeOptions {
  format?:
    | "CODE128"
    | "CODE39"
    | "EAN13"
    | "EAN8"
    | "UPC"
    | "ITF14"
    | "MSI"
    | "pharmacode"
    | "codabar";
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  textMargin?: number;
  background?: string;
  lineColor?: string;
}

// Generate QR code as data URL
export async function generateQRCodeDataURL(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const defaultOptions = {
    width: 200,
    margin: 2,
    errorCorrectionLevel: "M" as const,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return QRCode.toDataURL(text, mergedOptions);
}

// Generate QR code to canvas element
export async function generateQRCodeToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options: QRCodeOptions = {}
): Promise<void> {
  const defaultOptions = {
    width: 200,
    margin: 2,
    errorCorrectionLevel: "M" as const,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  await QRCode.toCanvas(canvas, text, mergedOptions);
}

// Generate QR code as SVG string
export async function generateQRCodeSVG(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const defaultOptions = {
    width: 200,
    margin: 2,
    errorCorrectionLevel: "M" as const,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return QRCode.toString(text, { ...mergedOptions, type: "svg" });
}

// Generate barcode to canvas
export function generateBarcodeToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options: BarcodeOptions = {}
): void {
  const defaultOptions: BarcodeOptions = {
    format: "CODE128",
    width: 2,
    height: 100,
    displayValue: true,
    fontSize: 14,
    textMargin: 5,
    background: "#ffffff",
    lineColor: "#000000",
  };

  const mergedOptions = { ...defaultOptions, ...options };

  JsBarcode(canvas, text, mergedOptions);
}

// Generate barcode to SVG element
export function generateBarcodeToSVG(
  svg: SVGElement,
  text: string,
  options: BarcodeOptions = {}
): void {
  const defaultOptions: BarcodeOptions = {
    format: "CODE128",
    width: 2,
    height: 100,
    displayValue: true,
    fontSize: 14,
    textMargin: 5,
    background: "#ffffff",
    lineColor: "#000000",
  };

  const mergedOptions = { ...defaultOptions, ...options };

  JsBarcode(svg, text, mergedOptions);
}

// Generate barcode as data URL
export function generateBarcodeDataURL(
  text: string,
  options: BarcodeOptions = {}
): string {
  const canvas = document.createElement("canvas");
  generateBarcodeToCanvas(canvas, text, options);
  return canvas.toDataURL("image/png");
}

// Entity-specific generators
export interface PartLabelData {
  partNumber: string;
  partName: string;
  location?: string;
  lotNumber?: string;
  quantity?: number;
}

export interface LocationLabelData {
  locationCode: string;
  locationName: string;
  warehouse?: string;
  zone?: string;
}

export interface WorkOrderLabelData {
  workOrderNumber: string;
  productName: string;
  operation?: string;
  quantity?: number;
}

// Generate QR code for a part
export async function generatePartQR(
  data: PartLabelData,
  options?: QRCodeOptions
): Promise<string> {
  const qrData = JSON.stringify({
    type: "PART",
    pn: data.partNumber,
    name: data.partName,
    loc: data.location,
    lot: data.lotNumber,
    qty: data.quantity,
  });

  return generateQRCodeDataURL(qrData, options);
}

// Generate QR code for a location
export async function generateLocationQR(
  data: LocationLabelData,
  options?: QRCodeOptions
): Promise<string> {
  const qrData = JSON.stringify({
    type: "LOCATION",
    code: data.locationCode,
    name: data.locationName,
    wh: data.warehouse,
    zone: data.zone,
  });

  return generateQRCodeDataURL(qrData, options);
}

// Generate QR code for a work order
export async function generateWorkOrderQR(
  data: WorkOrderLabelData,
  options?: QRCodeOptions
): Promise<string> {
  const qrData = JSON.stringify({
    type: "WORK_ORDER",
    wo: data.workOrderNumber,
    product: data.productName,
    op: data.operation,
    qty: data.quantity,
  });

  return generateQRCodeDataURL(qrData, options);
}

// Bulk generate codes for printing
export interface BulkCodeResult {
  id: string;
  text: string;
  dataUrl: string;
  type: "qr" | "barcode";
}

export async function generateBulkCodes(
  items: Array<{ id: string; text: string; type: "qr" | "barcode" }>,
  options?: QRCodeOptions | BarcodeOptions
): Promise<BulkCodeResult[]> {
  const results: BulkCodeResult[] = [];

  for (const item of items) {
    try {
      let dataUrl: string;
      if (item.type === "qr") {
        dataUrl = await generateQRCodeDataURL(item.text, options as QRCodeOptions);
      } else {
        dataUrl = generateBarcodeDataURL(item.text, options as BarcodeOptions);
      }

      results.push({
        id: item.id,
        text: item.text,
        dataUrl,
        type: item.type,
      });
    } catch (error) {
      clientLogger.error(`Failed to generate code for ${item.id}`, error);
    }
  }

  return results;
}
