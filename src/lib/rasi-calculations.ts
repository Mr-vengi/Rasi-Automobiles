export type InvoiceLineInput = {
  quantity: number;
  unitPrice: number;
  discountRate: number;
  gstRate: number;
};

export type InvoiceLine = InvoiceLineInput & {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  total: number;
};

export type InvoiceTotals = {
  lines: InvoiceLine[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  total: number;
};

const roundCents = (value: number) => Math.round(value);
const fromCents = (value: number) => value / 100;

export function calculateInvoiceTotals(
  items: InvoiceLineInput[],
  isInterstate = false,
  taxInclusive = false,
): InvoiceTotals {
  const lines = items.map((item) => {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error("Quantity must be greater than zero.");
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new Error("Price cannot be negative.");
    }
    if (!Number.isFinite(item.gstRate) || item.gstRate < 0 || item.gstRate > 100) {
      throw new Error("GST must be between 0 and 100%.");
    }
    if (!Number.isFinite(item.discountRate) || item.discountRate < 0 || item.discountRate > 100) {
      throw new Error("Discount must be between 0 and 100%.");
    }

    const quantityMilli = Math.round(item.quantity * 1000);
    const subtotalCents = roundCents((Math.round(item.unitPrice * 100) * quantityMilli) / 1000);
    const discountCents = roundCents((subtotalCents * Math.round(item.discountRate * 100)) / 10_000);
    const grossCents = subtotalCents - discountCents;
    const rateBasisPoints = Math.round(item.gstRate * 100);
    const taxableCents = taxInclusive
      ? roundCents((grossCents * 10_000) / (10_000 + rateBasisPoints))
      : grossCents;
    const taxCents = roundCents((taxableCents * rateBasisPoints) / 10_000);
    const cgstCents = isInterstate ? 0 : Math.floor(taxCents / 2);
    const sgstCents = isInterstate ? 0 : taxCents - cgstCents;
    const igstCents = isInterstate ? taxCents : 0;

    return {
      ...item,
      subtotal: fromCents(subtotalCents),
      discountAmount: fromCents(discountCents),
      taxableAmount: fromCents(taxableCents),
      taxAmount: fromCents(taxCents),
      cgstAmount: fromCents(cgstCents),
      sgstAmount: fromCents(sgstCents),
      igstAmount: fromCents(igstCents),
      total: fromCents(taxableCents + taxCents),
    };
  });

  const sum = (key: keyof InvoiceLine) =>
    fromCents(lines.reduce((total, line) => total + Math.round(Number(line[key]) * 100), 0));

  return {
    lines,
    subtotal: sum("subtotal"),
    discountAmount: sum("discountAmount"),
    taxableAmount: sum("taxableAmount"),
    taxAmount: sum("taxAmount"),
    cgstAmount: sum("cgstAmount"),
    sgstAmount: sum("sgstAmount"),
    igstAmount: sum("igstAmount"),
    total: sum("total"),
  };
}

export function getStockStatus(stock: number, minimum: number, maximum: number | null) {
  if (stock <= 0) return "out-of-stock" as const;
  if (stock <= minimum / 2) return "critical" as const;
  if (stock <= minimum) return "low" as const;
  if (maximum !== null && stock > maximum) return "overstock" as const;
  return "in-stock" as const;
}

export function suggestedReorderQuantity(stock: number, minimum: number, maximum: number | null) {
  const target = maximum !== null && maximum > minimum ? maximum : minimum * 2;
  return Math.max(0, target - stock);
}