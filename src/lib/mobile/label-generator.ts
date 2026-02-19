// Label generation utilities for printing
import { generateQRCodeDataURL, generateBarcodeDataURL } from "./qr-generator";
import { clientLogger } from '@/lib/client-logger';

export interface LabelSize {
  width: number; // in mm
  height: number; // in mm
  dpi?: number;
}

export interface LabelElement {
  type: "text" | "barcode" | "qrcode" | "line" | "rect" | "image";
  x: number; // in mm from left
  y: number; // in mm from top
  data: string;
  options?: Record<string, unknown>;
}

export interface LabelTemplate {
  id: string;
  name: string;
  size: LabelSize;
  elements: LabelElement[];
}

// Predefined label sizes
export const LABEL_SIZES = {
  SMALL: { width: 25, height: 15, dpi: 203 },
  MEDIUM: { width: 50, height: 25, dpi: 203 },
  LARGE: { width: 100, height: 50, dpi: 203 },
  ZEBRA_2x1: { width: 50.8, height: 25.4, dpi: 203 },
  ZEBRA_4x2: { width: 101.6, height: 50.8, dpi: 203 },
  DYMO_SMALL: { width: 25.4, height: 12.7, dpi: 300 },
  DYMO_STANDARD: { width: 89, height: 28, dpi: 300 },
};

// Part label template
export const PART_LABEL_TEMPLATE: LabelTemplate = {
  id: "part-standard",
  name: "Part Label - Standard",
  size: LABEL_SIZES.MEDIUM,
  elements: [
    {
      type: "text",
      x: 2,
      y: 3,
      data: "{{partNumber}}",
      options: { fontSize: 12, bold: true },
    },
    {
      type: "text",
      x: 2,
      y: 10,
      data: "{{partName}}",
      options: { fontSize: 8, maxWidth: 30 },
    },
    {
      type: "barcode",
      x: 2,
      y: 15,
      data: "{{barcode}}",
      options: { height: 8, displayValue: false },
    },
    {
      type: "qrcode",
      x: 38,
      y: 3,
      data: "{{qrData}}",
      options: { size: 10 },
    },
  ],
};

// Location label template
export const LOCATION_LABEL_TEMPLATE: LabelTemplate = {
  id: "location-standard",
  name: "Location Label - Standard",
  size: LABEL_SIZES.LARGE,
  elements: [
    {
      type: "text",
      x: 5,
      y: 5,
      data: "{{locationCode}}",
      options: { fontSize: 24, bold: true },
    },
    {
      type: "text",
      x: 5,
      y: 20,
      data: "{{locationName}}",
      options: { fontSize: 10 },
    },
    {
      type: "text",
      x: 5,
      y: 28,
      data: "{{warehouse}}",
      options: { fontSize: 8, color: "#666666" },
    },
    {
      type: "qrcode",
      x: 75,
      y: 5,
      data: "{{qrData}}",
      options: { size: 20 },
    },
  ],
};

// Work order label template
export const WORK_ORDER_LABEL_TEMPLATE: LabelTemplate = {
  id: "work-order-standard",
  name: "Work Order Label",
  size: LABEL_SIZES.LARGE,
  elements: [
    {
      type: "text",
      x: 5,
      y: 5,
      data: "WORK ORDER",
      options: { fontSize: 8, color: "#666666" },
    },
    {
      type: "text",
      x: 5,
      y: 12,
      data: "{{workOrderNumber}}",
      options: { fontSize: 14, bold: true },
    },
    {
      type: "text",
      x: 5,
      y: 22,
      data: "{{productName}}",
      options: { fontSize: 10 },
    },
    {
      type: "text",
      x: 5,
      y: 30,
      data: "Qty: {{quantity}}",
      options: { fontSize: 10, bold: true },
    },
    {
      type: "barcode",
      x: 5,
      y: 38,
      data: "{{barcode}}",
      options: { height: 10, displayValue: true },
    },
  ],
};

// Convert mm to pixels
function mmToPixels(mm: number, dpi: number = 203): number {
  return Math.round((mm / 25.4) * dpi);
}

// Generate label as HTML for preview or printing
export function generateLabelHTML(
  template: LabelTemplate,
  data: Record<string, string>
): string {
  const { size, elements } = template;

  let html = `
    <div style="
      width: ${size.width}mm;
      height: ${size.height}mm;
      position: relative;
      background: white;
      border: 1px solid #ccc;
      overflow: hidden;
      font-family: Arial, sans-serif;
    ">
  `;

  for (const element of elements) {
    const x = element.x;
    const y = element.y;
    let content = element.data;

    // Replace template variables
    for (const [key, value] of Object.entries(data)) {
      content = content.replace(new RegExp(`{{${key}}}`, "g"), value);
    }

    const opts = element.options || {};

    switch (element.type) {
      case "text":
        html += `
          <div style="
            position: absolute;
            left: ${x}mm;
            top: ${y}mm;
            font-size: ${opts.fontSize || 10}pt;
            font-weight: ${opts.bold ? "bold" : "normal"};
            color: ${opts.color || "#000000"};
            ${opts.maxWidth ? `max-width: ${opts.maxWidth}mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` : ""}
          ">${content}</div>
        `;
        break;

      case "barcode":
        html += `
          <div style="
            position: absolute;
            left: ${x}mm;
            top: ${y}mm;
          ">
            <img id="barcode-${element.x}-${element.y}" data-barcode="${content}"
                 style="height: ${opts.height || 10}mm;" />
          </div>
        `;
        break;

      case "qrcode":
        html += `
          <div style="
            position: absolute;
            left: ${x}mm;
            top: ${y}mm;
          ">
            <img id="qrcode-${element.x}-${element.y}" data-qrcode="${content}"
                 style="width: ${opts.size || 10}mm; height: ${opts.size || 10}mm;" />
          </div>
        `;
        break;

      case "line":
        html += `
          <div style="
            position: absolute;
            left: ${x}mm;
            top: ${y}mm;
            width: ${opts.width || 10}mm;
            border-top: ${opts.thickness || 1}px solid ${opts.color || "#000000"};
          "></div>
        `;
        break;

      case "rect":
        html += `
          <div style="
            position: absolute;
            left: ${x}mm;
            top: ${y}mm;
            width: ${opts.width || 10}mm;
            height: ${opts.height || 10}mm;
            border: ${opts.borderWidth || 1}px solid ${opts.borderColor || "#000000"};
            background: ${opts.fill || "transparent"};
          "></div>
        `;
        break;
    }
  }

  html += "</div>";
  return html;
}

// Generate label as canvas for printing
export async function generateLabelCanvas(
  template: LabelTemplate,
  data: Record<string, string>
): Promise<HTMLCanvasElement> {
  const { size, elements } = template;
  const dpi = size.dpi || 203;
  const widthPx = mmToPixels(size.width, dpi);
  const heightPx = mmToPixels(size.height, dpi);

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, widthPx, heightPx);

  for (const element of elements) {
    const x = mmToPixels(element.x, dpi);
    const y = mmToPixels(element.y, dpi);
    let content = element.data;

    // Replace template variables
    for (const [key, value] of Object.entries(data)) {
      content = content.replace(new RegExp(`{{${key}}}`, "g"), value);
    }

    const opts = element.options || {};

    switch (element.type) {
      case "text":
        const fontSize = mmToPixels((opts.fontSize as number) || 10, dpi) * 0.35;
        ctx.font = `${opts.bold ? "bold " : ""}${fontSize}px Arial`;
        ctx.fillStyle = (opts.color as string) || "#000000";
        ctx.fillText(content, x, y + fontSize);
        break;

      case "barcode":
        try {
          const barcodeUrl = generateBarcodeDataURL(content, {
            height: mmToPixels((opts.height as number) || 10, dpi),
            displayValue: (opts.displayValue as boolean) ?? false,
          });
          const barcodeImg = await loadImage(barcodeUrl);
          ctx.drawImage(barcodeImg, x, y);
        } catch (error) {
          clientLogger.error("Failed to generate barcode", error);
        }
        break;

      case "qrcode":
        try {
          const qrSize = mmToPixels((opts.size as number) || 10, dpi);
          const qrUrl = await generateQRCodeDataURL(content, {
            width: qrSize,
            margin: 0,
          });
          const qrImg = await loadImage(qrUrl);
          ctx.drawImage(qrImg, x, y, qrSize, qrSize);
        } catch (error) {
          clientLogger.error("Failed to generate QR code", error);
        }
        break;

      case "line":
        ctx.strokeStyle = (opts.color as string) || "#000000";
        ctx.lineWidth = (opts.thickness as number) || 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + mmToPixels((opts.width as number) || 10, dpi), y);
        ctx.stroke();
        break;

      case "rect":
        const rectWidth = mmToPixels((opts.width as number) || 10, dpi);
        const rectHeight = mmToPixels((opts.height as number) || 10, dpi);
        if (opts.fill) {
          ctx.fillStyle = opts.fill as string;
          ctx.fillRect(x, y, rectWidth, rectHeight);
        }
        ctx.strokeStyle = (opts.borderColor as string) || "#000000";
        ctx.lineWidth = (opts.borderWidth as number) || 1;
        ctx.strokeRect(x, y, rectWidth, rectHeight);
        break;
    }
  }

  return canvas;
}

// Load image from URL
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// Print label
export async function printLabel(
  template: LabelTemplate,
  data: Record<string, string>,
  copies: number = 1
): Promise<void> {
  const canvas = await generateLabelCanvas(template, data);
  const dataUrl = canvas.toDataURL("image/png");

  // Create print window
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Failed to open print window");
  }

  let imagesHtml = "";
  for (let i = 0; i < copies; i++) {
    imagesHtml += `<img src="${dataUrl}" style="margin: 2mm; page-break-after: always;" />`;
  }

  // Sanitize template dimensions to prevent XSS
  const sanitizedWidth = Math.max(0, Math.min(Number(template.size.width) || 0, 500));
  const sanitizedHeight = Math.max(0, Math.min(Number(template.size.height) || 0, 500));

  // Use safe HTML construction instead of direct template interpolation
  const doc = printWindow.document;
  doc.open();
  doc.write("<!DOCTYPE html><html><head><title>Print Label</title>");
  doc.write("<style>");
  doc.write(`@page { size: ${sanitizedWidth}mm ${sanitizedHeight}mm; margin: 0; }`);
  doc.write("body { margin: 0; padding: 0; }");
  doc.write("img { display: block; }");
  doc.write("</style></head><body>");
  doc.write(imagesHtml);
  doc.write("<script>window.onload = function() { window.print(); window.close(); };</script>");
  doc.write("</body></html>");
  printWindow.document.close();
}

// Generate ZPL (Zebra Programming Language) for Zebra printers
export function generateZPL(
  template: LabelTemplate,
  data: Record<string, string>
): string {
  const { size, elements } = template;
  const dpi = size.dpi || 203;
  const widthDots = mmToPixels(size.width, dpi);
  const heightDots = mmToPixels(size.height, dpi);

  let zpl = `^XA\n^PW${widthDots}\n^LL${heightDots}\n`;

  for (const element of elements) {
    const x = mmToPixels(element.x, dpi);
    const y = mmToPixels(element.y, dpi);
    let content = element.data;

    // Replace template variables
    for (const [key, value] of Object.entries(data)) {
      content = content.replace(new RegExp(`{{${key}}}`, "g"), value);
    }

    const opts = element.options || {};

    switch (element.type) {
      case "text":
        const fontSize = Math.round(((opts.fontSize as number) || 10) * 2);
        zpl += `^FO${x},${y}\n`;
        zpl += `^A0N,${fontSize},${fontSize}\n`;
        zpl += `^FD${content}^FS\n`;
        break;

      case "barcode":
        const height = mmToPixels((opts.height as number) || 10, dpi);
        zpl += `^FO${x},${y}\n`;
        zpl += `^BY2\n`;
        zpl += `^BCN,${height},${opts.displayValue ? "Y" : "N"},N,N\n`;
        zpl += `^FD${content}^FS\n`;
        break;

      case "qrcode":
        const qrSize = Math.round(((opts.size as number) || 10) / 2.5);
        zpl += `^FO${x},${y}\n`;
        zpl += `^BQN,2,${qrSize}\n`;
        zpl += `^FDMM,A${content}^FS\n`;
        break;

      case "line":
        const lineWidth = mmToPixels((opts.width as number) || 10, dpi);
        const thickness = (opts.thickness as number) || 1;
        zpl += `^FO${x},${y}\n`;
        zpl += `^GB${lineWidth},${thickness},${thickness}^FS\n`;
        break;

      case "rect":
        const rectWidth = mmToPixels((opts.width as number) || 10, dpi);
        const rectHeight = mmToPixels((opts.height as number) || 10, dpi);
        const borderWidth = (opts.borderWidth as number) || 1;
        zpl += `^FO${x},${y}\n`;
        zpl += `^GB${rectWidth},${rectHeight},${borderWidth}^FS\n`;
        break;
    }
  }

  zpl += "^XZ";
  return zpl;
}
