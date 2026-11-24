import { useState } from "react";
import {
  Store,
  Building,
  CreditCard,
  Printer,
  Shield,
  Check,
  Save,
  CloudUpload,
  Database,
  AlertTriangle,
  QrCode,
  Image,
  Globe,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { UpiQr } from "./upi-qr";
import { syncAllToFirebase } from "@/lib/rasi-data";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

interface SettingsViewProps {
  settings: Tables<"business_settings"> | null | undefined;
  loading: boolean;
  has: (permission: string) => boolean;
  saving: boolean;
  onSave: (values: TablesUpdate<"business_settings">) => void;
}

export function SettingsView({
  settings,
  loading,
  has,
  saving,
  onSave,
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState("profile");

  const [businessName, setBusinessName] = useState(settings?.business_name || "Rasi Automobiles");
  const [ownerName, setOwnerName] = useState(
    settings?.owner_name && settings.owner_name !== "K. Venkatesh"
      ? settings.owner_name
      : "RANJITH SELVARAJ"
  );
  const [mobile, setMobile] = useState(settings?.mobile || "+91 98765 43210");

  const rawAddr = (settings?.address || "").trim();
  const initialAddress =
    !rawAddr ||
    rawAddr.includes("Trichy Main Road") ||
    rawAddr.includes("Salem") ||
    rawAddr.includes("Manalurpet") ||
    rawAddr.includes("DHURUGAM") ||
    rawAddr.includes("RAICEMILL")
      ? "Durgam Bypass Near Tollgate, Lena Morden Rice mill Opposite, Kallakurichi , 606213"
      : rawAddr;

  const rawMail = (settings?.email || "").trim();
  const initialEmail =
    !rawMail || rawMail === "contact@rasiautomobiles.com"
      ? "ranjithselvaraj14@gmail.com"
      : rawMail;

  const [email, setEmail] = useState(initialEmail);
  const [address, setAddress] = useState(initialAddress);
  const [gstin, setGstin] = useState(settings?.gstin || "33AAAAA0000A1Z5");
  const [state, setState] = useState(settings?.state || "Tamil Nadu");
  const [stateCode, setStateCode] = useState(settings?.state_code || "33");
  const [invoicePrefix, setInvoicePrefix] = useState(settings?.invoice_prefix || "RA");

  const rawFoot = (settings?.invoice_footer || "").trim();
  const initialFooter =
    !rawFoot ||
    rawFoot.includes("Drive safely") ||
    rawFoot.includes("Thank you for choosing") ||
    rawFoot.includes("Thank you for your business")
      ? "Your Satisfaction, Our Priority – Thank You for Visiting Rasi Automobiles!"
      : rawFoot;

  const [invoiceFooter, setInvoiceFooter] = useState(initialFooter);
  const [taxInclusive, setTaxInclusive] = useState(Boolean(settings?.tax_inclusive));

  // Payment & Bank details
  const [upiId, setUpiId] = useState("rasi-automobiles@okaxis");
  const [bankName, setBankName] = useState("State Bank of India");
  const [accountNumber, setAccountNumber] = useState("39201948201");
  const [ifscCode, setIfscCode] = useState("SBIN0001244");
  const [accountName, setAccountName] = useState("Rasi Automobiles");
  const [invoiceBaseUrl, setInvoiceBaseUrl] = useState(
    ((settings as any)?.invoice_base_url || "http://10.218.106.54:8080").trim()
  );
  const [syncing, setSyncing] = useState(false);

  async function handleCloudSync() {
    setSyncing(true);
    try {
      const res = await syncAllToFirebase();
      if (res.success) {
        toast.success(`Successfully uploaded ${res.totalSynced} records to Cloud Firestore!`);
      } else if (res.isPermissionDenied) {
        toast.error(
          "Firebase rejected writes (permission-denied). Please set 'allow read, write: if true;' in Firebase Console > Firestore Database > Rules and Publish.",
          { duration: 9000 }
        );
      } else {
        toast.error(res.error || "Failed to sync to Firebase.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Sync error");
    } finally {
      setSyncing(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      business_name: businessName.trim(),
      owner_name: ownerName.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      address: address.trim(),
      gstin: gstin.trim().toUpperCase(),
      state: state.trim(),
      state_code: stateCode.trim(),
      invoice_prefix: invoicePrefix.trim().toUpperCase(),
      invoice_footer: invoiceFooter.trim(),
      tax_inclusive: taxInclusive,
      invoice_base_url: invoiceBaseUrl.trim(),
    } as any);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-5xl">
      {/* Top Header Card with Brand Logo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src="/rasi-logo.png"
              alt="Rasi Automobiles Billing Logo"
              className="size-16 rounded-full border-2 border-primary/20 shadow-sm bg-white object-cover"
            />
            <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white">
              <Check className="size-3" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-wider uppercase text-foreground">
                {businessName}
              </h1>
              <span className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] px-2 py-0.5 border border-emerald-500/30">
                Active Store
              </span>
            </div>
            <p className="text-xs font-semibold text-primary">Drive · Service · Bill Smartly</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              GSTIN: <span className="font-mono font-bold text-foreground">{gstin}</span> · {address.split(",").slice(0, 3).join(",")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="h-9 gap-1.5 text-xs font-bold bg-primary text-primary-foreground shadow-xs px-5"
          >
            <Save className="size-3.5" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* Structured Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto p-1 bg-muted/60 border rounded-lg gap-1">
          <TabsTrigger value="profile" className="text-xs py-2 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <Store className="size-3.5 text-primary" /> Store Profile
          </TabsTrigger>
          <TabsTrigger value="gst" className="text-xs py-2 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <Building className="size-3.5 text-amber-500" /> GST & Taxes
          </TabsTrigger>
          <TabsTrigger value="invoice" className="text-xs py-2 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <Printer className="size-3.5 text-indigo-500" /> Invoice & Print
          </TabsTrigger>
          <TabsTrigger value="payment" className="text-xs py-2 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <CreditCard className="size-3.5 text-emerald-600" /> Payments & UPI
          </TabsTrigger>
          <TabsTrigger value="network" className="text-xs py-2 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs col-span-2 sm:col-span-1">
            <Globe className="size-3.5 text-sky-500" /> Network / Cloud
          </TabsTrigger>
        </TabsList>

        {/* =========================================================================
            TAB 1: STORE PROFILE & BRANDING
            ========================================================================= */}
        <TabsContent value="profile" className="space-y-4 m-0">
          <Card className="border shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Store className="size-4 text-primary" /> Store Identity & Branding
              </CardTitle>
              <CardDescription className="text-xs">
                Business details and logo displayed on tax invoices, login screen, and counter dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Logo Card Feature */}
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border bg-muted/10 p-4">
                <img
                  src="/rasi-logo.png"
                  alt="Official Rasi Logo"
                  className="size-20 rounded-full border-2 border-primary/30 shadow-md bg-white object-cover shrink-0"
                />
                <div className="space-y-1 text-center sm:text-left flex-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <p className="text-xs font-bold text-foreground">Official Store Logo</p>
                    <span className="rounded bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.2">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    This official circular emblem is synced across the website splash screen, login portal, workspace header, and tax invoices.
                  </p>
                  <p className="text-[10px] text-primary font-semibold">
                    Asset Path: <code className="bg-muted px-1.5 py-0.5 rounded font-mono">/rasi-logo.png</code>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Business Name *</Label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Rasi Automobiles"
                    required
                    className="h-8 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Proprietor / Owner Name</Label>
                  <Input
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="RANJITH SELVARAJ"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Phone className="size-3 text-muted-foreground" /> Contact Mobile *
                  </Label>
                  <Input
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Mail className="size-3 text-muted-foreground" /> Official Email
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ranjithselvaraj14@gmail.com"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="col-span-full space-y-1">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <MapPin className="size-3 text-muted-foreground" /> Store Physical Address *
                  </Label>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Durgam Bypass Near Tollgate, Lena Morden Rice mill Opposite, Kallakurichi , 606213"
                    className="text-xs min-h-[60px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 2: GST & TAXATION
            ========================================================================= */}
        <TabsContent value="gst" className="space-y-4 m-0">
          <Card className="border shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building className="size-4 text-amber-500" /> GST Registration & State Code
              </CardTitle>
              <CardDescription className="text-xs">
                Essential for compliant GST e-invoices, intra-state (CGST + SGST), and inter-state (IGST) calculations.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">GSTIN (15 Digits)</Label>
                  <Input
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="33AAAAA0000A1Z5"
                    className="h-8 text-xs font-mono font-bold uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">State Name</Label>
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Tamil Nadu"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">State Code (2 Digits)</Label>
                  <Input
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    placeholder="33"
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="taxInc"
                    checked={taxInclusive}
                    onChange={(e) => setTaxInclusive(e.target.checked)}
                    className="size-4 rounded border-border text-primary cursor-pointer"
                  />
                  <Label htmlFor="taxInc" className="text-xs font-semibold cursor-pointer">
                    Tax-Inclusive Selling Prices
                  </Label>
                </div>
                <p className="text-[11px] text-muted-foreground pl-6">
                  When enabled, product prices entered in POS and catalog already include GST (reverse-calculates base taxable amount and GST taxes automatically).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 3: INVOICE & PRINT SETUP
            ========================================================================= */}
        <TabsContent value="invoice" className="space-y-4 m-0">
          <Card className="border shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Printer className="size-4 text-indigo-500" /> Invoice Numbering & Footer Note
              </CardTitle>
              <CardDescription className="text-xs">
                Formatting and policies shown on both A4 Tax Invoices and 80mm thermal receipts.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Invoice Number Prefix</Label>
                  <Input
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    placeholder="RA"
                    className="h-8 text-xs font-mono font-bold uppercase w-36"
                  />
                  <p className="text-[10.5px] text-muted-foreground">Invoices will generate as: <strong>{invoicePrefix}-2026-1001</strong></p>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Invoice Footer Policy Note *</Label>
                <Textarea
                  value={invoiceFooter}
                  onChange={(e) => setInvoiceFooter(e.target.value)}
                  placeholder="Your Satisfaction, Our Priority – Thank You for Visiting Rasi Automobiles!"
                  className="text-xs min-h-[60px]"
                />
              </div>

              {/* Live Preview Box */}
              <div className="rounded-lg border bg-muted/10 p-3 space-y-1">
                <p className="text-[10.5px] font-bold uppercase text-muted-foreground">Live Footer Preview</p>
                <div className="p-2 border bg-white text-center rounded text-xs font-bold text-slate-800 shadow-2xs">
                  *** {invoiceFooter} ***
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 4: PAYMENTS & UPI
            ========================================================================= */}
        <TabsContent value="payment" className="space-y-4 m-0">
          <Card className="border shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CreditCard className="size-4 text-emerald-600" /> UPI QR & Bank Settlement Account
              </CardTitle>
              <CardDescription className="text-xs">
                Bank account and UPI details printed on invoices for direct customer payments.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">UPI VPA ID *</Label>
                    <Input
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="rasi-automobiles@okaxis"
                      className="h-8 text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Bank Name</Label>
                      <Input
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="State Bank of India"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Account Holder Name</Label>
                      <Input
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Rasi Automobiles"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Account Number</Label>
                      <Input
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="39201948201"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">IFSC Code</Label>
                      <Input
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value)}
                        placeholder="SBIN0001244"
                        className="h-8 text-xs font-mono uppercase font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Live UPI QR Preview Card */}
                <div className="flex flex-col items-center justify-center p-4 rounded-xl border bg-muted/20 text-center">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Live UPI QR Preview
                  </p>
                  <UpiQr upiId={upiId} size={120} payeeName={businessName} />
                  <p className="text-[10px] text-muted-foreground mt-2 font-mono">{upiId}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 5: NETWORK & CLOUD BACKEND
            ========================================================================= */}
        <TabsContent value="network" className="space-y-4 m-0">
          {/* Invoice QR & Network IP */}
          <Card className="border shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <QrCode className="size-4 text-sky-500" /> Invoice QR Code & Mobile Scan Wi-Fi IP
              </CardTitle>
              <CardDescription className="text-xs">
                The URL encoded into invoice QR codes so smartphones can view and download invoice PDFs.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Invoice Base URL</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={invoiceBaseUrl}
                    onChange={(e) => setInvoiceBaseUrl(e.target.value)}
                    placeholder="http://10.218.106.54:8080"
                    className="h-8 text-xs font-mono flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs shrink-0"
                    onClick={() => setInvoiceBaseUrl("http://10.218.106.54:8080")}
                  >
                    Use Wi-Fi IP (10.218.106.54)
                  </Button>
                </div>
                <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-3 text-xs space-y-1 text-sky-950 dark:text-sky-200">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Check className="size-3.5 text-sky-600" /> Seamless Mobile QR Scanning:
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    When mobile phones scan an invoice QR code, they connect over the store&apos;s Wi-Fi. Using your computer&apos;s Wi-Fi IP (<code className="font-mono font-bold text-slate-900 bg-white px-1 py-0.5 rounded">http://10.218.106.54:8080</code>) ensures any phone camera directly opens and downloads the verified invoice PDF.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cloud Firestore Status & Sync */}
          <Card className="border shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Database className="size-4 text-primary" /> Firebase Cloud Firestore Backend
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-bold"
                  onClick={handleCloudSync}
                  disabled={syncing}
                >
                  <CloudUpload className={`size-3.5 ${syncing ? "animate-pulse" : ""}`} />
                  {syncing ? "Syncing..." : "Sync All to Firebase"}
                </Button>
              </CardTitle>
              <CardDescription className="text-xs">
                Cloud Firestore database for Rasi Automobiles (Project ID: <code className="font-mono font-bold">rasiautomobile</code>).
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border bg-muted/10 p-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Firebase Project</span>
                  <span className="font-mono font-bold text-foreground">rasiautomobile</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Database Instance</span>
                  <span className="font-mono font-bold text-foreground">(default)</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Console Security Rules</span>
                  <a
                    href="https://console.firebase.google.com/project/rasiautomobile/firestore/rules"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-bold hover:underline"
                  >
                    Open Console Rules ↗
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Sticky Save Actions */}
      <div className="flex items-center justify-between border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Changes will update your business invoices, receipts, and settings instantly.
        </p>
        <Button
          type="submit"
          disabled={saving}
          className="h-9 gap-1.5 text-xs font-bold bg-primary text-primary-foreground shadow-xs px-6"
        >
          <Save className="size-3.5" />
          {saving ? "Saving Changes..." : "Save Business Settings"}
        </Button>
      </div>
    </form>
  );
}
