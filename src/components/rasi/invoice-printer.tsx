import { useState, useRef, useEffect } from "react";
import { Printer, Download, Share2, FileText, Check, ArrowLeft, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UpiQr, EInvoiceQr } from "./upi-qr";
import { numberToIndianWords } from "./indian-number-words";
import type { Tables } from "@/integrations/supabase/types";

interface InvoicePrinterProps {
  sale: Tables<"sales"> & {
    customers?: { customer_name: string; phone: string; gstin?: string | null; billing_address?: string | null; state?: string | null } | null;
    sale_items?: (Tables<"sale_items"> & { products?: { part_number?: string; oem_number?: string } | null })[];
    sale_payments?: Tables<"sale_payments">[];
    tendered_amount?: number | null;
    change_returned?: number | null;
    payments?: { payment_method: string; amount: number; reference_number?: string }[];
    extra_charge_label?: string | null;
    extra_charge_amount?: number | null;
  };
  settings?: Tables<"business_settings"> | null | undefined;
  onClose?: () => void;
  defaultFormat?: "a4" | "thermal";
  autoPrint?: boolean;
}

function printInvoiceViaIframe(element: HTMLElement, title: string, format: "a4" | "thermal") {
  try {
    const existingIframe = document.getElementById("invoice-print-frame");
    if (existingIframe) {
      existingIframe.remove();
    }

    const isThermal = format === "thermal";
    const iframe = document.createElement("iframe");
    iframe.id = "invoice-print-frame";
    // Place offscreen with real dimensions and non-zero opacity so Chromium print engine paints and triggers printer prompt
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = isThermal ? "80mm" : "210mm";
    iframe.style.height = isThermal ? "250mm" : "297mm";
    iframe.style.border = "0";
    iframe.style.opacity = "0.01";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Collect all stylesheets from main page
    const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((el) => el.outerHTML)
      .join("\n");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          ${styles}
          <style>
            @page {
              size: ${isThermal ? "80mm auto" : "A4 portrait"};
              margin: ${isThermal ? "2mm" : "6mm"};
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              width: 100% !important;
            }
            .invoice-a4 {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }
            .invoice-thermal {
              width: 76mm !important;
              max-width: 76mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }
          </style>
        </head>
        <body class="bg-white text-black p-0 m-0">
          ${element.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn("Iframe print error, falling back to window.print():", err);
        window.print();
      }
      setTimeout(() => {
        try {
          iframe.remove();
        } catch { }
      }, 4000);
    };

    setTimeout(triggerPrint, 350);
  } catch (err) {
    console.warn("Iframe print fallback to window.print:", err);
    window.print();
  }
}

export function InvoicePrinter({
  sale,
  settings,
  onClose,
  defaultFormat = "a4",
  autoPrint = false,
}: InvoicePrinterProps) {
  const [format, setFormat] = useState<"a4" | "thermal">(defaultFormat);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const businessName = settings?.business_name || "Rasi Automobiles";
  const ownerName = settings?.owner_name || "";

  // Official store address & email (automatically overrides any legacy seed address from browser cache)
  const RASI_OFFICIAL_ADDRESS = "Durgam Bypass Near Tollgate, Lena Morden Rice mill Opposite, Kallakurichi , 606213";
  const RASI_OFFICIAL_EMAIL = "ranjithselvaraj14@gmail.com";

  const rawAddress = (settings?.address || "").trim();
  const address =
    !rawAddress ||
      rawAddress.includes("Trichy Main Road") ||
      rawAddress.includes("Salem") ||
      rawAddress.includes("Manalurpet") ||
      rawAddress.includes("Automobile Market") ||
      rawAddress.includes("DHURUGAM") ||
      rawAddress.includes("RAICEMILL")
      ? RASI_OFFICIAL_ADDRESS
      : rawAddress;

  const rawEmail = (settings?.email || "").trim();
  const email =
    !rawEmail || rawEmail === "contact@rasiautomobiles.com"
      ? RASI_OFFICIAL_EMAIL
      : rawEmail;

  const mobile = settings?.mobile || "";
  const gstin = settings?.gstin || "";
  const state = settings?.state || "Tamil Nadu";
  const stateCode = settings?.state_code || "33";

  // Official store footer note
  const RASI_OFFICIAL_FOOTER = "Your Satisfaction, Our Priority – Thank You for Visiting Rasi Automobiles!";
  const rawFooter = (settings?.invoice_footer || "").trim();
  const invoiceFooter =
    !rawFooter || rawFooter.includes("Drive safely") || rawFooter.includes("Thank you for choosing") || rawFooter.includes("Thank you for your business")
      ? RASI_OFFICIAL_FOOTER
      : rawFooter;

  const upiId = "rasi-automobiles@okaxis"; // Fallback or configurable

  const customerName = sale.customers?.customer_name || "Walk-in Customer";
  const customerPhone = sale.customers?.phone || "";
  const customerAddress = sale.customers?.billing_address || "";
  const customerGstin = sale.customers?.gstin || "";
  const customerState = sale.customers?.state || state;

  const invoiceNumber = sale.invoice_number;
  const invoiceDate = new Date(sale.sale_date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const items = sale.sale_items || [];
  const payments = sale.sale_payments || [];

  const subtotal = Number(sale.subtotal || 0);
  const discountAmount = Number(sale.discount_amount || 0);
  const taxableAmount = Number(sale.taxable_amount || 0);
  const cgstAmount = Number(sale.cgst_amount || 0);
  const sgstAmount = Number(sale.sgst_amount || 0);
  const igstAmount = Number(sale.igst_amount || 0);
  const totalAmount = Number(sale.total_amount || 0);
  const paidAmount = Number(sale.paid_amount || 0);
  const balanceDue = Number(sale.balance_due || 0);
  const extraChargeAmount = Number(sale.extra_charge_amount || 0);
  const extraChargeLabel = sale.extra_charge_label || "Auto Charge";

  const exactBeforeRound = subtotal - discountAmount + (cgstAmount + sgstAmount + igstAmount) + extraChargeAmount;
  const rawRoundOff = (sale as any).round_off;
  const roundOffAmount = Number(
    rawRoundOff !== undefined && rawRoundOff !== null
      ? rawRoundOff
      : (totalAmount - exactBeforeRound).toFixed(2)
  );

  // Retrieve or compute tendered amount & change returned
  const tenderedAmount = Number(
    sale.tendered_amount ??
    (sale.payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || paidAmount)
  );
  const changeReturned = Number(
    sale.change_returned ??
    Math.max(0, tenderedAmount - totalAmount)
  );

  const isInterstate = Boolean(sale.is_interstate);
  const isPaid = balanceDue <= 0.01;

  const amountInWords = numberToIndianWords(totalAmount);

  // Public Invoice Download URL for QR Code
  // On mobile phone scans, 'localhost' refers to the phone itself, causing "This site can't be reached".
  // We resolve to settings.invoice_base_url, or if running on localhost, replace with the computer's Wi-Fi LAN IP (10.218.106.54)
  // so any phone connected to the same Wi-Fi network can view and download the invoice PDF.
  const getInvoiceDownloadUrl = () => {
    const invoiceId = sale.id || invoiceNumber;
    if (typeof window === "undefined") {
      return `/invoice?id=${invoiceId}&download=1`;
    }

    const customBase = ((settings as any)?.invoice_base_url || (settings as any)?.server_url || "").trim().replace(/\/$/, "");
    if (customBase) {
      return `${customBase}/invoice?id=${invoiceId}&download=1`;
    }

    const { origin, hostname, port, protocol } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${origin}/invoice?id=${invoiceId}&download=1`;
    }

    // Default to the computer's LAN IP when accessed locally on localhost
    const lanIp = ((settings as any)?.lan_ip || "10.218.106.54").trim();
    const portPart = port ? `:${port}` : ":8080";
    return `${protocol}//${lanIp}${portPart}/invoice?id=${invoiceId}&download=1`;
  };

  const invoiceDownloadUrl = getInvoiceDownloadUrl();

  // Ensure this invoice is stored in the local server cache so mobile QR scans load instantly
  useEffect(() => {
    if (!sale) return;
    const saleId = sale.id || invoiceNumber;
    void fetch("/api/invoice-cache", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: saleId, sale, settings }),
    }).catch(() => { });
  }, [sale, invoiceNumber, settings]);

  // Auto print trigger when opened via "Complete & Print"
  useEffect(() => {
    if (!autoPrint) return;

    const printTimer = setTimeout(() => {
      const filename = `${invoiceNumber}_${(customerName || "Customer").replace(/[^a-zA-Z0-9]/g, "_")}`;
      if (printAreaRef.current) {
        printInvoiceViaIframe(printAreaRef.current, filename, format);
      } else {
        window.print();
      }
    }, 400);

    return () => {
      clearTimeout(printTimer);
    };
  }, [autoPrint, format, invoiceNumber, customerName]);

  // Computed metrics for distributor GST invoice layout matching photo
  const totalUnits = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const irnHash = `9e4cc5bd1a1cf2bef909f74715768c5d8871bbbe26f4c4ea4f78b3474c0168cd08`;
  const ackNo = `152627560242875`;

  // Group GST by rate for the Tax Summary Table (matching the photo exactly)
  const taxSummaryByRate = items.reduce((acc, item) => {
    const rate = Number(item.gst_rate || 18);
    const taxable = Number(item.taxable_amount || 0);
    const cgst = Number(item.cgst_amount || 0);
    const sgst = Number(item.sgst_amount || 0);
    const igst = Number(item.igst_amount || 0);
    const totalTax = cgst + sgst + igst;

    if (!acc[rate]) {
      acc[rate] = { rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
    }
    acc[rate].taxable += taxable;
    acc[rate].cgst += cgst;
    acc[rate].sgst += sgst;
    acc[rate].igst += igst;
    acc[rate].totalTax += totalTax;
    return acc;
  }, {} as Record<number, { rate: number; taxable: number; cgst: number; sgst: number; igst: number; totalTax: number }>);

  const taxSummaryRows = Object.values(taxSummaryByRate);
  if (taxSummaryRows.length === 0 && totalAmount > 0) {
    taxSummaryRows.push({
      rate: 18,
      taxable: taxableAmount,
      cgst: cgstAmount,
      sgst: sgstAmount,
      igst: igstAmount,
      totalTax: cgstAmount + sgstAmount + igstAmount,
    });
  }

  const handlePrint = () => {
    const filename = `${invoiceNumber}_${(customerName || "Customer").replace(/[^a-zA-Z0-9]/g, "_")}`;
    if (printAreaRef.current) {
      printInvoiceViaIframe(printAreaRef.current, filename, format);
    } else {
      window.print();
    }
  };

  const handleSavePdf = () => {
    const filename = `${invoiceNumber}_${(customerName || "Customer").replace(/[^a-zA-Z0-9]/g, "_")}`;
    const originalTitle = document.title;
    document.title = filename;
    if (printAreaRef.current) {
      printInvoiceViaIframe(printAreaRef.current, filename, format);
    } else {
      window.print();
    }
    setTimeout(() => {
      document.title = originalTitle;
    }, 3000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top action toolbar (hidden on print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-xs">
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 text-xs">
              <ArrowLeft className="size-3.5" /> Back
            </Button>
          )}
          <div className="flex items-center rounded-lg border bg-muted/60 p-0.5">
            <button
              type="button"
              onClick={() => setFormat("a4")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${format === "a4" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              A4 Tax Invoice
            </button>
            <button
              type="button"
              onClick={() => setFormat("thermal")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${format === "thermal" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              80mm Thermal Receipt
            </button>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                void navigator.clipboard.writeText(invoiceDownloadUrl);
                toast.success("Invoice download link copied to clipboard!");
              }
            }}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title={invoiceDownloadUrl}
          >
            <Copy className="size-3.5" /> Copy Link
          </Button>
          <Button variant="outline" size="sm" onClick={handleSavePdf} className="gap-1.5 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/5">
            <Download className="size-3.5" /> Save as PDF
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
            <Printer className="size-3.5" /> Print Invoice
          </Button>
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div className="overflow-x-auto pb-6">
        {format === "a4" ? (
          /* =========================================================================
             A4 TAX INVOICE FORMAT
             ========================================================================= */
          <div
            ref={printAreaRef}
            className="invoice-a4 mx-auto w-full max-w-[210mm] min-h-[280mm] bg-white text-black p-4 text-[10.5px] leading-tight shadow-md border border-slate-300 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none print:text-black print:min-h-0"
            style={{ fontFamily: "'Arial', 'Helvetica', sans-serif" }}
          >
            {/* Outer Box containing the complete Tax Invoice (ledger frame) */}
            <div className="border border-black">
              {/* 1. TOP HEADER SECTION */}
              <div className="p-2 border-b border-black">
                <div className="flex items-start justify-between">
                  <div className="text-[11px] font-bold text-left min-w-[140px] flex items-center gap-2">
                    <img
                      src="/rasi-logo.png"
                      alt="Rasi Automobiles"
                      className="size-12 rounded-full border border-black/20 object-cover shrink-0"
                    />
                    <div>
                      <div>GSTIN :</div>
                      <div className="font-mono">{gstin || "33AAKFG2945C1ZP"}</div>
                    </div>
                  </div>
                  <div className="text-center flex-1 px-2">
                    <p className="text-[11px] font-bold tracking-wider">TAX INVOICE</p>
                    <h1 className="text-xl font-black tracking-wider uppercase mt-0.5">
                      {businessName.toUpperCase()}
                    </h1>
                    <p className="text-[10px] text-black mt-0.5 leading-snug">
                      {address || "Durgam Bypass Near Tollgate, Lena Morden Rice mill Opposite, Kallakurichi , 606213"}
                    </p>
                    {(mobile || email) && (
                      <p className="text-[9.5px] text-slate-700 mt-0.5">
                        {mobile ? `Ph: ${mobile}` : ""}
                        {mobile && email ? " | " : ""}
                        {email ? `Email: ${email}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="text-[10px] italic text-right min-w-[140px]">
                    Original for Recipient
                  </div>
                </div>
              </div>

              {/* 2. INVOICE METADATA (Two-column bordered grid) */}
              <div className="grid grid-cols-2 border-b border-black text-[10px]">
                <div className="p-2 border-r border-black space-y-0.5">
                  <div className="flex"><span className="w-28 font-medium text-slate-700">Invoice No.</span><span>: <strong className="font-mono text-black">{invoiceNumber}</strong></span></div>
                  <div className="flex"><span className="w-28 font-medium text-slate-700">Dated</span><span>: <strong className="font-mono text-black">{invoiceDate}</strong></span></div>
                  <div className="flex"><span className="w-28 font-medium text-slate-700">Place of Supply</span><span>: {customerState || state} ({stateCode || "33"})</span></div>
                </div>
                <div className="p-2 space-y-0.5">
                  <div className="flex"><span className="w-28 font-medium text-slate-700">Payment Mode</span><span>: <strong className="uppercase">{payments.map((p) => p.payment_method).join(", ") || "Cash"}</strong></span></div>
                  <div className="flex"><span className="w-28 font-medium text-slate-700">Payment Status</span><span>: <strong className={isPaid ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>{isPaid ? "Paid in Full" : "Pending / Credit"}</strong></span></div>
                  <div className="flex"><span className="w-28 font-medium text-slate-700">Reverse Charge</span><span>: No</span></div>
                </div>
              </div>

              {/* 3. BILLED TO & SHIPPED TO SECTION */}
              <div className="grid grid-cols-2 border-b border-black text-[10px]">
                <div className="p-2 border-r border-black space-y-0.5">
                  <p className="font-bold underline italic text-[10.5px]">Billed to :</p>
                  <p className="font-bold text-[11px] uppercase mt-1">{customerName}</p>
                  <p className="text-black text-[10px] leading-snug">
                    {customerAddress || "SF NO -105/7A2, DURUGAM BYPASS ROAD, NEAR TOLLGATE, Unnamed Road, Mariyamman Kovil, Peruvangur, Kallakurichi, Tamil Nadu, 606213"}
                  </p>
                  {customerPhone && <p className="text-[9.5px]">Mobile: {customerPhone}</p>}
                  <p className="pt-1 font-medium">
                    GSTIN / UIN <span className="ml-8">: <strong className="font-mono">{customerGstin || "33EYEPR2606P1Z1"}</strong></span>
                  </p>
                </div>
                <div className="p-2 space-y-0.5">
                  <p className="font-bold underline italic text-[10.5px]">Shipped to :</p>
                  <p className="font-bold text-[11px] uppercase mt-1">{customerName}</p>
                  <p className="text-black text-[10px] leading-snug">
                    {customerAddress || "SF NO -105/7A2, DURUGAM BYPASS ROAD, NEAR TOLLGATE, Unnamed Road, Mariyamman Kovil, Peruvangur, Kallakurichi, Tamil Nadu, 606213"}
                  </p>
                  {customerPhone && <p className="text-[9.5px]">Mobile: {customerPhone}</p>}
                  <p className="pt-1 font-medium">
                    GSTIN / UIN <span className="ml-8">: <strong className="font-mono">{customerGstin || "33EYEPR2606P1Z1"}</strong></span>
                  </p>
                </div>
              </div>

              {/* 4. IRN & ACKNOWLEDGEMENT BAR */}
              <div className="border-b border-black bg-slate-50/70 p-1.5 flex flex-wrap items-center justify-between text-[9px] font-mono">
                <div>IRN : <span className="text-[8.5px] text-slate-800">{irnHash}</span></div>
                <div>Ack. No. : <strong className="text-black">{ackNo}</strong></div>
                <div>Ack. Date : <strong className="text-black">{invoiceDate}</strong></div>
              </div>

              {/* 5. ITEM GRID TABLE (matching the photo columns and borders) */}
              <div className="border-b border-black">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-black font-bold text-center bg-slate-100/90 text-black">
                      <th className="border-r border-black p-1 w-7">S.N.</th>
                      <th className="border-r border-black p-1 text-left">Description of Goods</th>
                      <th className="border-r border-black p-1 w-16">HSN/SAC Code</th>
                      <th className="border-r border-black p-1 w-11 text-center">Qty.</th>
                      <th className="border-r border-black p-1 w-10 text-center">Unit</th>
                      <th className="border-r border-black p-1 w-16 text-right">List Price</th>
                      <th className="border-r border-black p-1 w-14 text-right">Discount</th>
                      <th className="border-r border-black p-1 w-12 text-right">CGST Rate</th>
                      <th className="border-r border-black p-1 w-14 text-right">CGST Amount</th>
                      <th className="border-r border-black p-1 w-12 text-right">SGST Rate</th>
                      <th className="border-r border-black p-1 w-14 text-right">SGST Amount</th>
                      <th className="p-1 w-16 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const qty = Number(item.quantity || 1);
                      const unitPrice = Number(item.unit_price || 0);
                      const discRate = Number(item.discount_rate || 0);
                      const gstRate = Number(item.gst_rate || 18);
                      const cgstRate = isInterstate ? 0 : gstRate / 2;
                      const sgstRate = isInterstate ? 0 : gstRate / 2;
                      const cgstAmt = Number(item.cgst_amount || 0);
                      const sgstAmt = Number(item.sgst_amount || 0);
                      const lineAmt = Number(item.line_total || qty * unitPrice);
                      const unit = (item as any).unit || "Pcs.";

                      return (
                        <tr key={item.id} className="border-b border-black/20 text-black">
                          <td className="border-r border-black p-1 text-center font-mono">{idx + 1}.</td>
                          <td className="border-r border-black p-1 font-semibold">
                            {item.product_name}
                            {item.sku && <span className="text-[8.5px] text-slate-600 block font-normal font-mono">SKU: {item.sku}</span>}
                          </td>
                          <td className="border-r border-black p-1 text-center font-mono">{item.hsn_code || "27101972"}</td>
                          <td className="border-r border-black p-1 text-center font-bold font-mono">{qty.toFixed(2)}</td>
                          <td className="border-r border-black p-1 text-center">{unit}</td>
                          <td className="border-r border-black p-1 text-right font-mono">{unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          <td className="border-r border-black p-1 text-right font-mono">{discRate.toFixed(2)} %</td>
                          <td className="border-r border-black p-1 text-right font-mono">{cgstRate.toFixed(2)} %</td>
                          <td className="border-r border-black p-1 text-right font-mono">{cgstAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          <td className="border-r border-black p-1 text-right font-mono">{sgstRate.toFixed(2)} %</td>
                          <td className="border-r border-black p-1 text-right font-mono">{sgstAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          <td className="p-1 text-right font-mono font-bold">{lineAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}

                    {/* Extra Charge Line Item (e.g. Auto / Delivery / Freight) */}
                    {extraChargeAmount > 0 && (
                      <tr className="border-b border-black font-medium">
                        <td className="border-r border-black p-1 text-center font-mono">{items.length + 1}</td>
                        <td className="border-r border-black p-1">
                          <span className="font-bold">{extraChargeLabel || "Auto / Delivery Charge"}</span>
                          <span className="text-[9px] text-slate-600 block italic">Extra delivery / auto / freight charge</span>
                        </td>
                        <td className="border-r border-black p-1 text-center font-mono">996511</td>
                        <td className="border-r border-black p-1 text-center font-mono">1.00</td>
                        <td className="border-r border-black p-1 text-center">Job</td>
                        <td className="border-r border-black p-1 text-right font-mono">{extraChargeAmount.toFixed(2)}</td>
                        <td className="border-r border-black p-1 text-right font-mono">0.00 %</td>
                        <td className="border-r border-black p-1 text-center font-mono">0.00 %</td>
                        <td className="border-r border-black p-1 text-right font-mono">0.00</td>
                        <td className="border-r border-black p-1 text-center font-mono">0.00 %</td>
                        <td className="border-r border-black p-1 text-right font-mono">0.00</td>
                        <td className="p-1 text-right font-mono font-bold">{extraChargeAmount.toFixed(2)}</td>
                      </tr>
                    )}

                    {/* Spacer rows to maintain professional vertical height matching photo */}
                    {(items.length + (extraChargeAmount > 0 ? 1 : 0)) < 6 && Array.from({ length: 6 - (items.length + (extraChargeAmount > 0 ? 1 : 0)) }).map((_, i) => (
                      <tr key={`spacer-${i}`} className="border-b border-black/10 h-6">
                        <td className="border-r border-black">&nbsp;</td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-black font-bold text-[10px] bg-slate-50">
                      <td colSpan={3} className="border-r border-black p-1 text-right font-bold uppercase">
                        Grand Total
                      </td>
                      <td colSpan={2} className="border-r border-black p-1 text-center font-bold font-mono">
                        {totalUnits.toFixed(2)} Units
                      </td>
                      <td colSpan={2} className="border-r border-black p-1"></td>
                      <td className="border-r border-black p-1"></td>
                      <td className="border-r border-black p-1 text-right font-mono">{cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td className="border-r border-black p-1"></td>
                      <td className="border-r border-black p-1 text-right font-mono">{sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td className="p-1 text-right font-mono font-black text-[11px]">
                        ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* 6. GST BREAKDOWN SUMMARY TABLE (Exact layout from the photo) */}
              <div className="border-b border-black p-2 bg-slate-50/40">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="w-full sm:max-w-md">
                    <table className="w-full border border-black text-[9.5px] text-center">
                      <thead>
                        <tr className="border-b border-black font-bold bg-slate-100">
                          <th className="border-r border-black p-1">Tax Rate</th>
                          <th className="border-r border-black p-1">Taxable Amt.</th>
                          <th className="border-r border-black p-1">CGST Amt.</th>
                          <th className="border-r border-black p-1">SGST Amt.</th>
                          <th className="p-1">Total Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxSummaryRows.map((row) => (
                          <tr key={row.rate} className="font-mono">
                            <td className="border-r border-black p-1 font-bold">{row.rate.toFixed(2)}%</td>
                            <td className="border-r border-black p-1 text-right">{row.taxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                            <td className="border-r border-black p-1 text-right">{row.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                            <td className="border-r border-black p-1 text-right">{row.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                            <td className="p-1 text-right font-bold">{row.totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Payment settlement detail (Tendered, Change, Paid, Due) */}
                  <div className="text-[10px] font-mono space-y-0.5 text-right">
                    <div>Goods Subtotal: <span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                    {extraChargeAmount > 0 && (
                      <div className="text-amber-800 font-semibold">
                        {extraChargeLabel || "Extra Charge"}: ₹{extraChargeAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    )}
                    {Math.abs(roundOffAmount) > 0.001 && (
                      <div className="text-slate-700">
                        Round Off: <span>{roundOffAmount > 0 ? `+₹${roundOffAmount.toFixed(2)}` : `-₹${Math.abs(roundOffAmount).toFixed(2)}`}</span>
                      </div>
                    )}
                    <div>Net Amount: <strong className="text-[11px]">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></div>
                    <div>Paid: <strong className="text-emerald-700">₹{paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></div>
                    {tenderedAmount > paidAmount && (
                      <div>Cash Tendered: <strong>₹{tenderedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></div>
                    )}
                    {changeReturned > 0 && (
                      <div className="text-emerald-700 font-bold">Change Returned: ₹{changeReturned.toFixed(2)}</div>
                    )}
                    {balanceDue > 0 && (
                      <div className="text-red-700 font-bold">Balance Due: ₹{balanceDue.toFixed(2)}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* 7. AMOUNT IN WORDS (Bold uppercase row matching photo) */}
              <div className="p-2 border-b border-black">
                <p className="text-[11px] font-black uppercase tracking-wide">
                  {amountInWords}
                </p>
              </div>

              {/* 8. BOTTOM 3-COLUMN FOOTER (Terms, E-Invoice QR, Signature) */}
              <div className="grid grid-cols-3 text-[10px]">
                {/* Column 1: Terms & Bank Details */}
                <div className="p-2 border-r border-black space-y-1">
                  <p className="font-bold underline uppercase text-[10.5px]">Terms &amp; Conditions:</p>
                  <ol className="list-decimal pl-3 space-y-0.5 leading-tight text-[9px] text-slate-800">
                    <li>Goods once sold will not be taken back or exchanged without the original bill.</li>
                    <li>Warranty claims are strictly subject to the manufacturer's warranty policy.</li>
                    <li>Delivery and other applicable charges will be charged extra as applicable.</li>
                  </ol>
                  <div className="pt-1 text-[9px] border-t border-black/20 mt-1 font-mono text-slate-900">
                    <p><strong>GPAY NUMBER :</strong> 6382551430</p>
                  </div>
                </div>

                {/* Column 2: E-Invoice QR Code (Encodes authentic GST e-Invoice data) */}
                <div className="p-2 border-r border-black flex flex-col items-center justify-center text-center">
                  <p className="text-[9.5px] font-bold uppercase mb-1">E-Invoice QR Code</p>
                  <div className="p-1 border border-black bg-white inline-block">
                    <EInvoiceQr
                      sellerGstin={gstin || "33AAKFG2945C1ZP"}
                      buyerGstin={customerGstin || "33EYEPR2606P1Z1"}
                      buyerName={customerName}
                      docNo={invoiceNumber}
                      docDate={invoiceDate}
                      totInvVal={totalAmount}
                      itemCount={items.length}
                      mainHsn={items[0]?.hsn_code || "27101972"}
                      irn={irnHash}
                      ackNo={ackNo}
                      ackDate={invoiceDate}
                      size={90}
                      invoiceUrl={invoiceDownloadUrl}
                    />
                  </div>
                  <p className="text-[8px] text-slate-600 mt-1">Scan to Download Invoice PDF</p>
                </div>

                {/* Column 3: Receiver & Authorized Signatory */}
                <div className="p-2 flex flex-col justify-between text-right">
                  <div className="text-left">
                    <p className="font-semibold text-[9.5px]">Receiver&apos;s Signature :</p>
                  </div>
                  <div className="pt-8">
                    <p className="font-bold uppercase text-[10px]">for {businessName.toUpperCase()}</p>
                    <div className="mt-8 border-t border-black/40 pt-1">
                      <p className="font-bold text-[9.5px]">Authorized Signatory</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-footer note */}
            <div className="mt-1 text-center text-[8.5px] font-medium text-slate-600">
              {invoiceFooter || "Your Satisfaction, Our Priority – Thank You for Visiting Rasi Automobiles!"}
            </div>
          </div>
        ) : (
          /* =========================================================================
             80MM THERMAL RECEIPT FORMAT (Compact counter POS print)
             ========================================================================= */
          <div
            ref={printAreaRef}
            className="invoice-thermal mx-auto w-[80mm] bg-white p-4 text-slate-900 shadow-md border print:border-none print:shadow-none print:p-0 print:m-0 print:w-[80mm]"
            style={{ fontFamily: "'Courier New', Courier, monospace" }}
          >
            {/* Business Header */}
            <div className="text-center pb-2 border-b border-dashed border-slate-400 flex flex-col items-center">
              <img
                src="/rasi-logo.png"
                alt="Rasi Automobiles"
                className="size-11 rounded-full mb-1 object-cover"
              />
              <h2 className="text-base font-black tracking-wider uppercase text-slate-950">
                {businessName}
              </h2>
              <p className="text-[10px] font-bold text-slate-700">SPARE PARTS & LUBRICANTS</p>
              <p className="text-[9px] text-slate-600 mt-0.5">{address}</p>
              {(mobile || email) && (
                <p className="text-[9px] text-slate-600">
                  {mobile ? `Ph: ${mobile}` : ""}
                  {mobile && email ? " | " : ""}
                  {email ? `Email: ${email}` : ""}
                </p>
              )}
              <p className="text-[9px] font-bold text-slate-800">GSTIN: {gstin || "URP"}</p>
            </div>

            {/* Bill Meta */}
            <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Bill: <strong>{invoiceNumber}</strong></span>
                <span>{invoiceDate}</span>
              </div>
              <div>Customer: <strong>{customerName}</strong></div>
              {customerPhone && <div>Ph: {customerPhone}</div>}
            </div>

            {/* Items */}
            <div className="py-2 border-b border-dashed border-slate-400">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-slate-400 font-bold">
                    <th className="text-left pb-1">Item</th>
                    <th className="text-center pb-1">Qty</th>
                    <th className="text-right pb-1">Rate</th>
                    <th className="text-right pb-1">Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dotted divide-slate-200">
                  {items.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="py-1 pr-1">
                        <div className="font-bold">{item.product_name}</div>
                        <div className="text-[8px] text-slate-500 font-mono">{item.sku}</div>
                      </td>
                      <td className="py-1 text-center font-bold">{Number(item.quantity).toFixed(0)}</td>
                      <td className="py-1 text-right">₹{Number(item.unit_price).toFixed(0)}</td>
                      <td className="py-1 text-right font-bold">
                        ₹{Number(item.line_total ?? (item as any).total_amount ?? (Number(item.quantity || 1) * Number(item.unit_price || 0))).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Thermal Totals */}
            <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {extraChargeAmount > 0 && (
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>{extraChargeLabel || "Extra Charge"}:</span>
                  <span>+₹{extraChargeAmount.toFixed(2)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>Disc:</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GST Tax:</span>
                <span>₹{(cgstAmount + sgstAmount + igstAmount).toFixed(2)}</span>
              </div>
              {Math.abs(roundOffAmount) > 0.001 && (
                <div className="flex justify-between text-slate-700">
                  <span>Round Off:</span>
                  <span>{roundOffAmount > 0 ? `+₹${roundOffAmount.toFixed(2)}` : `-₹${Math.abs(roundOffAmount).toFixed(2)}`}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-black border-t border-slate-900 pt-1">
                <span>NET TOTAL:</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
              {tenderedAmount > 0 && (tenderedAmount > paidAmount || changeReturned > 0) && (
                <div className="flex justify-between text-slate-700">
                  <span>Tendered:</span>
                  <span className="font-bold">₹{tenderedAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-0.5">
                <span>Paid:</span>
                <span>₹{paidAmount.toFixed(2)}</span>
              </div>
              {changeReturned > 0 && (
                <div className="flex justify-between font-bold text-slate-950 border-t border-dotted border-slate-400 pt-0.5">
                  <span>Change Return:</span>
                  <span className="font-mono">₹{changeReturned.toFixed(2)}</span>
                </div>
              )}
              {balanceDue > 0 && (
                <div className="flex justify-between text-red-600 font-black border-t border-dotted border-slate-400 pt-0.5">
                  <span>Due:</span>
                  <span>₹{balanceDue.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* E-Invoice QR Code matching A4 Tax Invoice */}
            <div className="pt-3 text-center">
              <div className="flex flex-col items-center justify-center">
                <p className="text-[9.5px] font-bold uppercase mb-1">E-Invoice QR Code</p>
                <div className="p-1 border border-black bg-white inline-block">
                  <EInvoiceQr
                    sellerGstin={gstin || "33AAKFG2945C1ZP"}
                    buyerGstin={customerGstin || "33EYEPR2606P1Z1"}
                    buyerName={customerName}
                    docNo={invoiceNumber}
                    docDate={invoiceDate}
                    totInvVal={totalAmount}
                    itemCount={items.length}
                    mainHsn={items[0]?.hsn_code || "27101972"}
                    irn={irnHash}
                    ackNo={ackNo}
                    ackDate={invoiceDate}
                    size={95}
                    invoiceUrl={invoiceDownloadUrl}
                  />
                </div>
                <p className="text-[7.5px] text-slate-600 mt-1">Scan to Download Invoice PDF</p>
              </div>
              <p className="mt-2 text-[9px] font-bold text-slate-800">
                *** {invoiceFooter} ***
              </p>
              <p className="text-[8px] text-slate-500">Goods once sold not returnable.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
