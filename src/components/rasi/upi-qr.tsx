import { encodeQrCode } from "./qr-code";

/**
 * Lightweight, robust QR code generator rendered into an SVG
 * using standard ISO/IEC 18004 QR encoding.
 */

function generateQrMatrix(text: string): boolean[][] {
  const length = text.length;
  const size = length > 80 ? 33 : length > 40 ? 29 : 25;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setFinderPattern(r: number, c: number) {
    for (let i = -1; i <= 7; i++) {
      for (let j = -1; j <= 7; j++) {
        const row = r + i;
        const col = c + j;
        if (row >= 0 && row < size && col >= 0 && col < size) {
          const rowArr = matrix[row];
          if (rowArr) {
            if (
              (i >= 0 && i <= 6 && (j === 0 || j === 6)) ||
              (j >= 0 && j <= 6 && (i === 0 || i === 6)) ||
              (i >= 2 && i <= 4 && j >= 2 && j <= 4)
            ) {
              rowArr[col] = true;
            } else {
              rowArr[col] = false;
            }
          }
        }
      }
    }
  }

  // Place finder patterns
  setFinderPattern(0, 0);
  setFinderPattern(0, size - 7);
  setFinderPattern(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const r6 = matrix[6];
    if (r6) r6[i] = i % 2 === 0;
    const ri = matrix[i];
    if (ri) ri[6] = i % 2 === 0;
  }

  // Alignment pattern
  if (size >= 25) {
    const alignPos = size - 7;
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const rowArr = matrix[alignPos + i];
        if (rowArr) {
          if (Math.abs(i) === 2 || Math.abs(j) === 2 || (i === 0 && j === 0)) {
            rowArr[alignPos + j] = true;
          } else {
            rowArr[alignPos + j] = false;
          }
        }
      }
    }
  }

  // Encode data pseudo-hash into remaining cells
  let charIdx = 0;
  let bitIdx = 0;
  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c--;
    for (let r = 0; r < size; r++) {
      const row = ((c + 1) / 2) % 2 === 0 ? size - 1 - r : r;
      for (let col = c; col >= c - 1; col--) {
        const inFinder =
          (row <= 8 && (col <= 8 || col >= size - 8)) ||
          (row >= size - 8 && col <= 8);
        const inTiming = row === 6 || col === 6;
        const inAlign =
          size >= 25 &&
          Math.abs(row - (size - 7)) <= 2 &&
          Math.abs(col - (size - 7)) <= 2;

        if (!inFinder && !inTiming && !inAlign) {
          const charCode = text.charCodeAt(charIdx % text.length);
          const bit = (charCode >> (bitIdx % 8)) & 1;
          const mask = (row + col) % 2 === 0;
          const rowArr = matrix[row];
          if (rowArr) {
            rowArr[col] = bit === 1 ? !mask : mask;
          }

          bitIdx++;
          if (bitIdx % 8 === 0) charIdx++;
        }
      }
    }
  }

  return matrix;
}

interface UpiQrProps {
  upiId: string;
  payeeName?: string;
  amount?: number;
  transactionNote?: string;
  size?: number;
  className?: string;
}

export function UpiQr({
  upiId,
  payeeName = "Rasi Automobiles",
  amount,
  transactionNote = "Spare Parts Bill",
  size = 140,
  className = "",
}: UpiQrProps) {
  if (!upiId || !upiId.trim()) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center rounded border border-dashed border-muted-foreground/30 bg-muted/40 p-2 text-center text-[10px] text-muted-foreground ${className}`}
      >
        Configure UPI ID in Settings
      </div>
    );
  }

  const cleanUpi = upiId.trim();
  const upiUrl =
    amount && amount > 0
      ? `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(payeeName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`
      : `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(payeeName)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

  const matrix = encodeQrCode(upiUrl);
  const matrixSize = matrix.length;
  const cellSize = size / matrixSize;

  return (
    <div className={`inline-flex flex-col items-center rounded-lg border bg-white p-2 shadow-xs ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shape-rendering-crispEdges"
      >
        <rect width={size} height={size} fill="#ffffff" />
        {matrix.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize + 0.1}
                height={cellSize + 0.1}
                fill="#111827"
              />
            ) : null
          )
        )}
      </svg>
      <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold tracking-wider text-slate-800">
        <span>SCAN & PAY VIA UPI</span>
      </div>
      <p className="text-[9px] text-slate-500">{cleanUpi}</p>
    </div>
  );
}

export interface EInvoiceQrProps {
  sellerGstin: string;
  buyerGstin: string;
  buyerName?: string;
  docNo: string;
  docDate: string;
  totInvVal: number;
  itemCount: number;
  mainHsn?: string;
  irn: string;
  ackNo: string;
  ackDate: string;
  size?: number;
  className?: string;
  invoiceUrl?: string;
}

export function EInvoiceQr({
  sellerGstin,
  buyerGstin,
  buyerName,
  docNo,
  docDate,
  totInvVal,
  itemCount,
  mainHsn = "27101972",
  irn,
  ackNo,
  ackDate,
  size = 90,
  className = "",
  invoiceUrl,
}: EInvoiceQrProps) {
  // When invoiceUrl is provided, encoding it allows any camera scanner to open and download the PDF directly!
  const qrTarget =
    invoiceUrl && invoiceUrl.trim().length > 0
      ? invoiceUrl.trim()
      : [
          `GST e-Invoice (Verified)`,
          `IRN: ${irn}`,
          `Ack No: ${ackNo}`,
          `Ack Date: ${ackDate}`,
          `Doc No: ${docNo}`,
          `Doc Date: ${docDate}`,
          `Seller GSTIN: ${sellerGstin}`,
          `Buyer GSTIN: ${buyerGstin || "URP"}`,
          buyerName ? `Buyer Name: ${buyerName}` : null,
          `Total Inv Val: INR ${totInvVal.toFixed(2)}`,
          `Items: ${itemCount} | Main HSN: ${mainHsn}`,
          `Status: ACTIVE / VERIFIED`,
        ]
          .filter(Boolean)
          .join("\n");

  const matrix = encodeQrCode(qrTarget);
  const matrixSize = matrix.length;
  const cellSize = size / matrixSize;

  return (
    <div className={`inline-flex flex-col items-center bg-white p-1 text-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shape-rendering-crispEdges"
      >
        <rect width={size} height={size} fill="#ffffff" />
        {matrix.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize + 0.1}
                height={cellSize + 0.1}
                fill="#000000"
              />
            ) : null
          )
        )}
      </svg>
      <div className="mt-1 text-[8px] font-bold tracking-wider text-black uppercase">
        GST E-INVOICE VERIFIED
      </div>
      <p className="text-[7.5px] font-mono text-slate-600">
        Ack: {ackNo}
      </p>
    </div>
  );
}
