/**
 * Utility functions for exporting and importing CSV data
 * with proper escaping, column mappings, and sample templates.
 */

export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows || rows.length === 0 || !rows[0]) {
    alert("No records to export.");
    return;
  }

  const firstRow = rows[0];
  const headers = Object.keys(firstRow);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const val = row[header];
          if (val === null || val === undefined) return '""';
          const str = typeof val === "object" ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadSampleProductCsv() {
  const headers = [
    "Product Name",
    "SKU",
    "Barcode",
    "Part Number",
    "OEM Number",
    "Brand",
    "Category",
    "Unit",
    "Purchase Price",
    "Selling Price",
    "MRP",
    "GST Rate",
    "HSN Code",
    "Current Stock",
    "Minimum Stock",
    "Shelf Location",
    "Description",
  ];

  const sampleRows = [
    [
      "Castrol Activ 4T 20W-40 1L Engine Oil",
      "OIL-CAS-4T-1L",
      "8901234567890",
      "CAST-4T-1L",
      "OEM-CAS-001",
      "Castrol",
      "Lubricants & Oils",
      "ltr",
      "320",
      "390",
      "410",
      "18",
      "2710",
      "25",
      "10",
      "Rack A-1",
      "High performance 4-stroke motorcycle engine oil",
    ],
    [
      "Bosch Front Disc Brake Pads Splendor / Passion",
      "BRK-BSH-DISC-01",
      "8901234567891",
      "F002H23812",
      "45105-KCC-900",
      "Bosch",
      "Braking System",
      "set",
      "180",
      "250",
      "290",
      "18",
      "8708",
      "15",
      "5",
      "Shelf B-3",
      "Semi-metallic brake pad set with low dust formula",
    ],
    [
      "NGK Spark Plug CPR8EA-9",
      "SPK-NGK-CPR8",
      "8901234567892",
      "CPR8EA-9",
      "31916-KRM-841",
      "NGK",
      "Electrical & Ignition",
      "pcs",
      "95",
      "140",
      "155",
      "18",
      "8511",
      "40",
      "12",
      "Bin C-4",
      "Genuine nickel alloy spark plug for commuter bikes",
    ],
  ];

  const csv = [
    headers.join(","),
    ...sampleRows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(",")),
  ].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "rasi-products-sample-template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0] || "");
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i] || "");
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = (values[idx] || "").trim();
    });
    results.push(obj);
  }

  return results;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
