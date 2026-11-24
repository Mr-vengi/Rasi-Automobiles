import { describe, expect, it } from "vitest";
import { numberToIndianWords } from "@/components/rasi/indian-number-words";

describe("numberToIndianWords", () => {
  it("converts whole rupees correctly", () => {
    expect(numberToIndianWords(100)).toBe("Rupees One Hundred Only");
    expect(numberToIndianWords(1250)).toBe("Rupees One Thousand Two Hundred Fifty Only");
    expect(numberToIndianWords(50000)).toBe("Rupees Fifty Thousand Only");
  });

  it("converts amounts containing paise accurately", () => {
    expect(numberToIndianWords(1250.75)).toBe(
      "Rupees One Thousand Two Hundred Fifty and Seventy-Five Paise Only"
    );
    expect(numberToIndianWords(99.5)).toBe("Rupees Ninety-Nine and Fifty Paise Only");
    expect(numberToIndianWords(0.25)).toBe("Twenty-Five Paise Only");
  });

  it("handles lakhs and crores in the Indian numbering system", () => {
    expect(numberToIndianWords(125000)).toBe("Rupees One Lakh Twenty-Five Thousand Only");
    expect(numberToIndianWords(125000.5)).toBe(
      "Rupees One Lakh Twenty-Five Thousand and Fifty Paise Only"
    );
    expect(numberToIndianWords(10000000)).toBe("Rupees One Crore Only");
    expect(numberToIndianWords(25000000.4)).toBe(
      "Rupees Two Crore Fifty Lakh and Forty Paise Only"
    );
  });

  it("handles zero and negative amounts safely", () => {
    expect(numberToIndianWords(0)).toBe("Zero Rupees Only");
    expect(numberToIndianWords(-10)).toBe("Zero Rupees Only");
  });
});
