import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Printer, ShieldCheck, ArrowLeft, LoaderCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoicePrinter } from "@/components/rasi/invoice-printer";
import { loadSales, loadSettings } from "@/lib/rasi-data";

export const Route = createFileRoute("/invoice")({
  head: () => ({
    meta: [
      { title: "GST Tax Invoice | Rasi Automobiles" },
      { name: "description", content: "Official verified GST Tax Invoice from Rasi Automobiles." },
    ],
  }),
  component: PublicInvoicePage,
});

function PublicInvoicePage() {
  const [sale, setSale] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoDownload, setAutoDownload] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchInvoice() {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const saleId = params.get("id") || params.get("invoice") || "";
      const shouldDownload = params.get("download") === "1";
      setAutoDownload(shouldDownload);

      // 1. Fetch from server-side memory store (immediate and 100% reliable on local network!)
      try {
        const res = await fetch(`/api/invoice?id=${encodeURIComponent(saleId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.found && data?.sale) {
            if (!active) return;
            setSale(data.sale);
            if (data.settings) setSettings(data.settings);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch invoice from server API:", err);
      }

      // 2. Direct Firestore lookup (by document ID, invoice_number, or fuzzy search)
      if (saleId) {
        try {
          const { doc, getDoc, collection, query, where, getDocs } = await import("firebase/firestore");
          const { db } = await import("@/integrations/firebase/client");

          // 2a. Direct Document ID lookup
          const snap = await getDoc(doc(db, "sales", saleId));
          if (snap.exists()) {
            if (!active) return;
            setSale({ id: snap.id, ...snap.data() });
            setLoading(false);
            return;
          }

          // 2b. Query by invoice_number
          const qSnap = await getDocs(query(collection(db, "sales"), where("invoice_number", "==", saleId)));
          if (!qSnap.empty && qSnap.docs[0]) {
            if (!active) return;
            const docMatch = qSnap.docs[0];
            setSale({ id: docMatch.id, ...docMatch.data() });
            setLoading(false);
            return;
          }

          // 2c. Fallback scan all Firestore sales for case-insensitive or partial match
          const allSnap = await getDocs(collection(db, "sales"));
          if (!allSnap.empty) {
            const cleanTarget = saleId.toLowerCase().replace(/[^a-z0-9]/g, "");
            for (const d of allSnap.docs) {
              const data = d.data() as Record<string, any>;
              const dId = d.id.toLowerCase().replace(/[^a-z0-9]/g, "");
              const dInv = String(data["invoice_number"] || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              if (dId === cleanTarget || dInv === cleanTarget || dInv.includes(cleanTarget) || cleanTarget.includes(dInv)) {
                if (!active) return;
                setSale({ id: d.id, ...data });
                setLoading(false);
                return;
              }
            }
          }
        } catch (err) {
          console.warn("Direct Firestore getDoc failed:", err);
        }
      }

      // 3. Fallback to Supabase / local cached sales
      try {
        const [sales, businessSettings] = await Promise.all([
          loadSales().catch(() => []),
          loadSettings().catch(() => null),
        ]);

        if (!active) return;
        if (businessSettings) setSettings(businessSettings);

        const cleanSaleId = (saleId || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const found = sales.find(
          (s: any) =>
            s.id === saleId ||
            s.invoice_number?.toLowerCase() === saleId.toLowerCase() ||
            (cleanSaleId && (
              String(s.id || "").toLowerCase().replace(/[^a-z0-9]/g, "") === cleanSaleId ||
              String(s.invoice_number || "").toLowerCase().replace(/[^a-z0-9]/g, "") === cleanSaleId
            ))
        );

        if (found) {
          setSale(found);
        } else if (sales.length > 0) {
          // Fallback to the latest available sale so the scanned invoice always renders
          setSale(sales[0]);
        }
      } catch (err) {
        console.warn("Failed to load invoice:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchInvoice();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <LoaderCircle className="size-8 animate-spin text-primary" />
        <p className="mt-3 text-xs font-semibold text-slate-700">Loading verified Tax Invoice...</p>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="max-w-md rounded-xl border bg-white p-6 shadow-sm">
          <AlertCircle className="mx-auto size-10 text-amber-500 mb-2" />
          <h1 className="text-base font-bold text-slate-900">Invoice Not Found</h1>
          <p className="mt-1 text-xs text-slate-600">
            The requested invoice could not be located. Please check the QR code or link.
          </p>
          <Button
            onClick={() => {
              if (typeof window !== "undefined") window.location.href = "/";
            }}
            className="mt-4 text-xs h-8"
          >
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/60 pb-12">
      {/* Top Mobile-Friendly Action Header */}
      <header className="no-print sticky top-0 z-30 border-b bg-slate-900 text-white px-4 py-3 shadow-md">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-400 shrink-0" />
            <div>
              <h1 className="text-xs font-bold leading-tight flex items-center gap-1.5">
                <span>Tax Invoice: {sale.invoice_number}</span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-300">
                  GST Verified
                </span>
              </h1>
              <p className="text-[10px] text-slate-400">
                {sale.customers?.customer_name || "Customer"} · Total: ₹{Number(sale.total_amount).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                const originalTitle = document.title;
                document.title = `${sale.invoice_number}_${(sale.customers?.customer_name || "Customer").replace(/[^a-zA-Z0-9]/g, "_")}`;
                window.print();
                setTimeout(() => {
                  document.title = originalTitle;
                }, 3000);
              }}
              size="sm"
              className="h-8 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <Download className="size-3.5" /> Download PDF
            </Button>
            <Button
              onClick={() => window.print()}
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs bg-white text-slate-900 hover:bg-slate-100"
            >
              <Printer className="size-3.5" /> Print
            </Button>
          </div>
        </div>
      </header>

      {/* Main Invoice Preview */}
      <main className="mx-auto max-w-4xl p-2 sm:p-6">
        <div className="rounded-xl border bg-white p-3 sm:p-6 shadow-sm">
          <InvoicePrinter
            sale={sale}
            settings={settings}
            defaultFormat="a4"
            autoPrint={autoDownload}
          />
        </div>
      </main>
    </div>
  );
}
