/**
 * Utility to convert numeric amounts in Indian Rupees (₹) into words,
 * following the Indian numbering system (Crores, Lakhs, Thousands, Hundreds)
 * and accurately converting Paise.
 */

const ONES: string[] = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"
];

const TENS: string[] = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
];

function twoDigitsToWords(n: number): string {
  if (n < 20) return ONES[n] ?? "";
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return (TENS[tens] ?? "") + (ones > 0 ? "-" + (ONES[ones] ?? "") : "");
}

function threeDigitsToWords(n: number): string {
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  let result = "";
  if (hundreds > 0) {
    result += (ONES[hundreds] ?? "") + " Hundred";
    if (remainder > 0) result += " ";
  }
  if (remainder > 0) {
    result += twoDigitsToWords(remainder);
  }
  return result;
}

function numberToIndianWordsWithoutCurrency(n: number): string {
  if (n === 0) return "";
  let temp = n;
  const parts: string[] = [];

  const crores = Math.floor(temp / 10000000);
  if (crores > 0) {
    parts.push(numberToIndianWordsWithoutCurrency(crores) + " Crore");
    temp %= 10000000;
  }

  const lakhs = Math.floor(temp / 100000);
  if (lakhs > 0) {
    parts.push(twoDigitsToWords(lakhs) + " Lakh");
    temp %= 100000;
  }

  const thousands = Math.floor(temp / 1000);
  if (thousands > 0) {
    parts.push(twoDigitsToWords(thousands) + " Thousand");
    temp %= 1000;
  }

  if (temp > 0) {
    parts.push(threeDigitsToWords(temp));
  }

  return parts.join(" ");
}

export function numberToIndianWords(amount: number | string): string {
  const num = typeof amount === "number" ? amount : parseFloat(amount);
  if (!Number.isFinite(num) || num <= 0) return "Zero Rupees Only";

  const rounded = Math.round(num * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  let words = "";

  if (rupees > 0) {
    let temp = rupees;
    const parts: string[] = [];

    // Crores (1,00,00,000)
    const crores = Math.floor(temp / 10000000);
    if (crores > 0) {
      parts.push(numberToIndianWordsWithoutCurrency(crores) + " Crore");
      temp %= 10000000;
    }

    // Lakhs (1,00,000)
    const lakhs = Math.floor(temp / 100000);
    if (lakhs > 0) {
      parts.push(twoDigitsToWords(lakhs) + " Lakh");
      temp %= 100000;
    }

    // Thousands (1,000)
    const thousands = Math.floor(temp / 1000);
    if (thousands > 0) {
      parts.push(twoDigitsToWords(thousands) + " Thousand");
      temp %= 1000;
    }

    // Hundreds & units
    if (temp > 0) {
      parts.push(threeDigitsToWords(temp));
    }

    words = "Rupees " + parts.join(" ");
  }

  if (paise > 0) {
    const paiseWords = twoDigitsToWords(paise) + " Paise";
    if (rupees > 0) {
      words += " and " + paiseWords;
    } else {
      words = paiseWords;
    }
  }

  return words.trim() + " Only";
}
