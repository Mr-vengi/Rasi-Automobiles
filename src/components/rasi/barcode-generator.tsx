/**
 * Pure SVG Barcode generator implementing standard Code 128 / Code 39 patterns
 * to render crisp barcodes for product labels, invoices, and shelf tags.
 */

const CODE39_PATTERNS: Record<string, string> = {
  "0": "101001101101",
  "1": "110100101011",
  "2": "101100101011",
  "3": "110110010101",
  "4": "101001101011",
  "5": "110100110101",
  "6": "101100110101",
  "7": "101001011011",
  "8": "110100101101",
  "9": "101100101101",
  A: "110101001011",
  B: "101101001011",
  C: "110110100101",
  D: "101011001011",
  E: "110101100101",
  F: "101101100101",
  G: "101010011011",
  H: "110101001101",
  I: "101101001101",
  J: "101011001101",
  K: "110101010011",
  L: "101101010011",
  M: "110110101001",
  N: "101011010011",
  O: "110101101001",
  P: "101101101001",
  Q: "101010110011",
  R: "110101011001",
  S: "101101011001",
  T: "101011011001",
  U: "110010101011",
  V: "100110101011",
  W: "110011010101",
  X: "100101101011",
  Y: "110010110101",
  Z: "100110110101",
  "-": "100101011011",
  ".": "110010101101",
  " ": "100110101101",
  $: "100100100101",
  "/": "100100101001",
  "+": "100101001001",
  "%": "101001001001",
  "*": "100101101101",
};

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
}

export function Barcode({
  value,
  width = 180,
  height = 50,
  showText = true,
  className = "",
}: BarcodeProps) {
  const safeText = (value || "0000").toUpperCase().replace(/[^0-9A-Z-. $/+%]/g, "-");
  const fullText = `*${safeText}*`;

  let bitSequence = "";
  for (let i = 0; i < fullText.length; i++) {
    const char = fullText.charAt(i);
    const pattern = CODE39_PATTERNS[char] ?? CODE39_PATTERNS["-"] ?? "100101011011";
    bitSequence += pattern + "0";
  }

  const barCount = bitSequence.length;
  const barUnitWidth = width / barCount;
  const barHeight = showText ? height - 16 : height;

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <svg
        width={width}
        height={barHeight}
        viewBox={`0 0 ${width} ${barHeight}`}
        className="shape-rendering-crispEdges"
      >
        <rect width={width} height={barHeight} fill="#ffffff" />
        {bitSequence.split("").map((bit, idx) =>
          bit === "1" ? (
            <rect
              key={idx}
              x={idx * barUnitWidth}
              y={0}
              width={barUnitWidth + 0.2}
              height={barHeight}
              fill="#0f172a"
            />
          ) : null
        )}
      </svg>
      {showText && (
        <span className="mt-1 font-mono text-[11px] font-medium tracking-widest text-slate-700">
          {safeText}
        </span>
      )}
    </div>
  );
}

interface BarcodeLabelPrintModalProps {
  product: {
    product_name: string;
    sku: string;
    barcode?: string | null;
    part_number?: string | null;
    selling_price: number | string;
    mrp: number | string;
  };
  quantity?: number;
  onClose: () => void;
}

export function BarcodeLabelPrintModal({
  product,
  quantity = 1,
  onClose,
}: BarcodeLabelPrintModalProps) {
  const codeToDisplay = product.barcode || product.sku;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Label Preview (50mm x 25mm)</p>
        <div className="mx-auto mt-3 flex w-[240px] flex-col items-center rounded border-2 border-dashed border-slate-300 bg-white p-3 text-center shadow-xs">
          <p className="text-[10px] font-bold tracking-wider text-slate-800">RASI AUTOMOBILES</p>
          <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-900">{product.product_name}</p>
          {product.part_number && (
            <p className="text-[9px] text-slate-500">Part #: {product.part_number}</p>
          )}
          <div className="my-2">
            <Barcode value={codeToDisplay} width={180} height={40} showText={true} />
          </div>
          <div className="flex w-full items-center justify-between px-2 text-[10px]">
            <span className="text-slate-500">MRP: <span className="line-through">₹{Number(product.mrp || product.selling_price).toFixed(2)}</span></span>
            <span className="font-bold text-slate-900">OUR PRICE: ₹{Number(product.selling_price).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border px-4 py-2 text-xs font-medium hover:bg-muted"
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => {
            window.print();
          }}
          className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Print {quantity} Label{quantity > 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}
