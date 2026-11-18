import { describe, expect, it } from "vitest";

import { calculateInvoiceTotals, getStockStatus, suggestedReorderQuantity } from "@/lib/rasi-calculations";

describe("Rasi financial calculations", () => {
  it("splits GST equally for local sales and keeps every amount to paise", () => {
    const result = calculateInvoiceTotals(
      [{ quantity: 2, unitPrice: 125, discountRate: 0, gstRate: 18 }],
      false,
    );

    expect(result.subtotal).toBe(250);
    expect(result.taxableAmount).toBe(250);
    expect(result.cgstAmount).toBe(22.5);
    expect(result.sgstAmount).toBe(22.5);
    expect(result.igstAmount).toBe(0);
    expect(result.total).toBe(295);
  });

  it("calculates interstate GST and respects a discounted tax-inclusive price", () => {
    const interstate = calculateInvoiceTotals(
      [{ quantity: 1, unitPrice: 100, discountRate: 0, gstRate: 18 }],
      true,
    );
    const inclusive = calculateInvoiceTotals(
      [{ quantity: 1, unitPrice: 118, discountRate: 10, gstRate: 18 }],
      false,
      true,
    );

    expect(interstate.igstAmount).toBe(18);
    expect(interstate.cgstAmount).toBe(0);
    expect(interstate.total).toBe(118);
    expect(inclusive.discountAmount).toBe(11.8);
    expect(inclusive.taxableAmount).toBe(90);
    expect(inclusive.taxAmount).toBe(16.2);
    expect(inclusive.total).toBe(106.2);
  });

  it("rejects negative prices and non-positive quantities", () => {
    expect(() =>
      calculateInvoiceTotals([{ quantity: 1, unitPrice: -1, discountRate: 0, gstRate: 0 }]),
    ).toThrow("Price cannot be negative.");
    expect(() =>
      calculateInvoiceTotals([{ quantity: 0, unitPrice: 1, discountRate: 0, gstRate: 0 }]),
    ).toThrow("Quantity must be greater than zero.");
  });
});

describe("Inventory stock thresholds", () => {
  it("classifies low, critical, out-of-stock, and overstock correctly", () => {
    expect(getStockStatus(3, 10, null)).toBe("critical");
    expect(getStockStatus(7, 10, null)).toBe("low");
    expect(getStockStatus(0, 10, null)).toBe("out-of-stock");
    expect(getStockStatus(23, 10, 20)).toBe("overstock");
    expect(getStockStatus(11, 10, 20)).toBe("in-stock");
  });

  it("suggests enough replacement stock to reach the cap or twice the minimum", () => {
    expect(suggestedReorderQuantity(3, 10, 30)).toBe(27);
    expect(suggestedReorderQuantity(3, 10, null)).toBe(17);
  });
});