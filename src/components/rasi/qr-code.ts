/**
 * Pure TypeScript ISO/IEC 18004 Compliant QR Code Generator
 * Generates valid, standards-compliant QR matrices that any smartphone
 * camera (iPhone, Android, Google Lens) can scan instantly.
 */

// GF(2^8) Galois Field with primitive polynomial 0x11D (285)
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

let gfVal = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = gfVal;
  EXP[i + 255] = gfVal;
  LOG[gfVal] = i;
  gfVal = (gfVal << 1) ^ (gfVal >= 128 ? 0x11d : 0);
}

function expAt(i: number): number {
  return EXP[i % 512] ?? 0;
}

function logAt(i: number): number {
  return LOG[i % 256] ?? 0;
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return expAt(logAt(a) + logAt(b));
}

function getGeneratorPoly(numEc: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < numEc; i++) {
    const factor0 = 1;
    const factor1 = expAt(i);
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      const p = poly[j] ?? 0;
      next[j] = (next[j] ?? 0) ^ gfMul(p, factor0);
      next[j + 1] = (next[j + 1] ?? 0) ^ gfMul(p, factor1);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomon(data: Uint8Array, numEc: number): Uint8Array {
  const gen = getGeneratorPoly(numEc);
  const msg = new Uint8Array(data.length + numEc);
  msg.set(data);
  for (let i = 0; i < data.length; i++) {
    const lead = msg[i] ?? 0;
    if (lead !== 0) {
      for (let j = 0; j < gen.length; j++) {
        const g = gen[j] ?? 0;
        msg[i + j] = (msg[i + j] ?? 0) ^ gfMul(g, lead);
      }
    }
  }
  return msg.slice(data.length);
}

// Version table for QR Model 2 (EC Level L / M)
// Version 1 to 6 capacity and specifications
interface QrVersionSpec {
  version: number;
  size: number;
  dataCapacityBytes: number;
  ecCodewords: number;
  blocks: { count: number; dataCodewords: number }[];
  alignmentPositions: number[];
}

const QR_VERSIONS: QrVersionSpec[] = [
  // Version 1 (21x21) Level L: 19 data, 7 EC
  { version: 1, size: 21, dataCapacityBytes: 17, ecCodewords: 7, blocks: [{ count: 1, dataCodewords: 19 }], alignmentPositions: [] },
  // Version 2 (25x25) Level L: 34 data, 10 EC
  { version: 2, size: 25, dataCapacityBytes: 32, ecCodewords: 10, blocks: [{ count: 1, dataCodewords: 34 }], alignmentPositions: [6, 18] },
  // Version 3 (29x29) Level L: 55 data, 15 EC
  { version: 3, size: 29, dataCapacityBytes: 53, ecCodewords: 15, blocks: [{ count: 1, dataCodewords: 55 }], alignmentPositions: [6, 22] },
  // Version 4 (33x33) Level L: 80 data, 20 EC
  { version: 4, size: 33, dataCapacityBytes: 78, ecCodewords: 20, blocks: [{ count: 1, dataCodewords: 80 }], alignmentPositions: [6, 26] },
  // Version 5 (37x37) Level L: 108 data, 26 EC
  { version: 5, size: 37, dataCapacityBytes: 106, ecCodewords: 26, blocks: [{ count: 1, dataCodewords: 108 }], alignmentPositions: [6, 30] },
  // Version 6 (41x41) Level L: 136 data, 36 EC (2 blocks)
  { version: 6, size: 41, dataCapacityBytes: 134, ecCodewords: 18, blocks: [{ count: 2, dataCodewords: 68 }], alignmentPositions: [6, 34] },
];

// Default fallback specification
const DEFAULT_SPEC: QrVersionSpec = QR_VERSIONS[5] as QrVersionSpec;

// BCH format codes for Level L with masks 0 to 7
const FORMAT_INFO_LEVEL_L = [
  0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976
];

export function encodeQrCode(text: string): boolean[][] {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);

  // Pick smallest fitting version
  const spec = QR_VERSIONS.find((v) => textBytes.length <= v.dataCapacityBytes) ?? DEFAULT_SPEC;
  const size = spec.size;

  // 1. Bitstream encoding: Byte mode (0100) + Character count (8 bits for V1-9) + Text bytes
  const bitstream: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bitstream.push((val >> i) & 1);
    }
  }

  // Mode: Byte (0100)
  pushBits(0b0100, 4);
  // Character count: 8 bits
  pushBits(textBytes.length, 8);
  // Data bytes
  for (let i = 0; i < textBytes.length; i++) {
    pushBits(textBytes[i] ?? 0, 8);
  }

  // Terminator (up to 4 zeroes)
  const totalDataBits = spec.blocks.reduce((s, b) => s + b.count * b.dataCodewords, 0) * 8;
  const termLen = Math.min(4, totalDataBits - bitstream.length);
  pushBits(0, termLen);

  // Pad to multiple of 8
  while (bitstream.length % 8 !== 0) {
    bitstream.push(0);
  }

  // Convert bits to data codewords
  const dataCodewords: number[] = [];
  for (let i = 0; i < bitstream.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | (bitstream[i + b] ?? 0);
    }
    dataCodewords.push(byte);
  }

  // Pad bytes (0xEC, 0x11)
  const totalDataBytes = totalDataBits / 8;
  let padByte = 0xec;
  while (dataCodewords.length < totalDataBytes) {
    dataCodewords.push(padByte);
    padByte = padByte === 0xec ? 0x11 : 0xec;
  }

  // 2. Block division and Reed-Solomon generation
  const allBlocksData: Uint8Array[] = [];
  const allBlocksEc: Uint8Array[] = [];
  let byteOffset = 0;

  for (const blockSpec of spec.blocks) {
    for (let b = 0; b < blockSpec.count; b++) {
      const blockData = new Uint8Array(dataCodewords.slice(byteOffset, byteOffset + blockSpec.dataCodewords));
      byteOffset += blockSpec.dataCodewords;
      const ec = computeReedSolomon(blockData, spec.ecCodewords);
      allBlocksData.push(blockData);
      allBlocksEc.push(ec);
    }
  }

  // Interleave data codewords
  const finalCodewords: number[] = [];
  const maxDataLen = Math.max(...allBlocksData.map((d) => d.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const d of allBlocksData) {
      if (i < d.length) {
        const val = d[i];
        if (val !== undefined) finalCodewords.push(val);
      }
    }
  }

  // Interleave EC codewords
  const ecLen = spec.ecCodewords;
  for (let i = 0; i < ecLen; i++) {
    for (const ec of allBlocksEc) {
      const val = ec[i];
      if (val !== undefined) finalCodewords.push(val);
    }
  }

  // 3. Matrix construction
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(r: number, c: number, val: boolean) {
    const row = matrix[r];
    const funcRow = isFunction[r];
    if (row && funcRow && c >= 0 && c < size) {
      row[c] = val;
      funcRow[c] = true;
    }
  }

  function getIsFunction(r: number, c: number): boolean {
    const funcRow = isFunction[r];
    return funcRow ? Boolean(funcRow[c]) : false;
  }

  // Finder patterns + Separator
  function addFinder(r: number, c: number) {
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        const row = r + y;
        const col = c + x;
        if (row >= 0 && row < size && col >= 0 && col < size) {
          if (y >= 0 && y <= 6 && x >= 0 && x <= 6) {
            const isBlack =
              y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4);
            setModule(row, col, isBlack);
          } else {
            setModule(row, col, false); // Separator
          }
        }
      }
    }
  }

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!getIsFunction(6, i)) setModule(6, i, i % 2 === 0);
    if (!getIsFunction(i, 6)) setModule(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  if (spec.alignmentPositions.length >= 2) {
    for (const r of spec.alignmentPositions) {
      for (const c of spec.alignmentPositions) {
        if (!getIsFunction(r, c)) {
          for (let y = -2; y <= 2; y++) {
            for (let x = -2; x <= 2; x++) {
              const isBlack = Math.abs(y) === 2 || Math.abs(x) === 2 || (y === 0 && x === 0);
              setModule(r + y, c + x, isBlack);
            }
          }
        }
      }
    }
  }

  // Dark module (always black) at (4*V + 9, 8)
  setModule(4 * spec.version + 9, 8, true);

  // Reserve format areas
  for (let i = 0; i <= 8; i++) {
    if (!getIsFunction(8, i)) setModule(8, i, false);
    if (!getIsFunction(i, 8)) setModule(i, 8, false);
  }
  for (let i = size - 8; i < size; i++) {
    if (!getIsFunction(8, i)) setModule(8, i, false);
  }
  for (let i = size - 7; i < size; i++) {
    if (!getIsFunction(i, 8)) setModule(i, 8, false);
  }

  // 4. Place Data Bits in 2-column zig-zag
  const allBits: number[] = [];
  for (const byte of finalCodewords) {
    for (let b = 7; b >= 0; b--) {
      allBits.push((byte >> b) & 1);
    }
  }

  let bitIdx = 0;
  let upwards = true;
  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c--; // Skip vertical timing column
    const rows = upwards
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const col of [c, c - 1]) {
        if (!getIsFunction(r, col)) {
          const bit = bitIdx < allBits.length ? (allBits[bitIdx++] ?? 0) : 0;
          // Apply Mask 0: (r + col) % 2 === 0
          const mask = (r + col) % 2 === 0;
          const rowArr = matrix[r];
          if (rowArr) {
            rowArr[col] = bit === 1 ? !mask : mask;
          }
        }
      }
    }
    upwards = !upwards;
  }

  // 5. Place Format Information (Level L, Mask 0: 0x77c4)
  const formatCode = FORMAT_INFO_LEVEL_L[0] ?? 0x77c4;
  const formatBits: number[] = [];
  for (let i = 14; i >= 0; i--) {
    formatBits.push((formatCode >> i) & 1);
  }

  // Top-left finder format placement
  const tlCoords: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const pair = tlCoords[i];
    if (pair) {
      const [r, c] = pair;
      const rowArr = matrix[r];
      if (rowArr) rowArr[c] = formatBits[i] === 1;
    }
  }

  // Top-right and bottom-left split format placement
  for (let i = 0; i < 7; i++) {
    const rowArr = matrix[size - 1 - i];
    if (rowArr) rowArr[8] = formatBits[i] === 1;
  }
  for (let i = 7; i < 15; i++) {
    const rowArr = matrix[8];
    if (rowArr) rowArr[size - 15 + i] = formatBits[i] === 1;
  }

  return matrix;
}
