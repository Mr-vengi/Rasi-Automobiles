import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Local file-backed database storage shared between cashier PC and mobile devices
let fsModule: typeof import("node:fs") | null = null;
let pathModule: typeof import("node:path") | null = null;

try {
  fsModule = await import("node:fs");
  pathModule = await import("node:path");
} catch {
  // Edge runtime fallback
}

const DATA_DIR = pathModule ? pathModule.join(process.cwd(), "data") : "";
const SALES_FILE = pathModule ? pathModule.join(DATA_DIR, "sales.json") : "";
const PRODUCTS_FILE = pathModule ? pathModule.join(DATA_DIR, "products.json") : "";

function ensureDataDir() {
  if (fsModule && DATA_DIR && !fsModule.existsSync(DATA_DIR)) {
    try {
      fsModule.mkdirSync(DATA_DIR, { recursive: true });
    } catch { }
  }
}

function loadPersistedSales(): Map<string, any> {
  const store = new Map<string, any>();
  if (fsModule && SALES_FILE && fsModule.existsSync(SALES_FILE)) {
    try {
      const content = fsModule.readFileSync(SALES_FILE, "utf-8");
      const list = JSON.parse(content);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item?.id) store.set(String(item.id), item);
          if (item?.invoice_number) store.set(String(item.invoice_number).toLowerCase(), item);
        }
      }
    } catch { }
  }
  return store;
}

function persistSalesToFile(store: Map<string, any>) {
  if (fsModule && SALES_FILE) {
    try {
      ensureDataDir();
      const uniqueSales = Array.from(new Set(store.values()));
      fsModule.writeFileSync(SALES_FILE, JSON.stringify(uniqueSales, null, 2), "utf-8");
    } catch { }
  }
}

function loadPersistedProducts(): Map<string, any> {
  const store = new Map<string, any>();
  if (fsModule && PRODUCTS_FILE && fsModule.existsSync(PRODUCTS_FILE)) {
    try {
      const content = fsModule.readFileSync(PRODUCTS_FILE, "utf-8");
      const list = JSON.parse(content);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item?.id) store.set(String(item.id), item);
        }
      }
    } catch { }
  }
  return store;
}

function persistProductsToFile(store: Map<string, any>) {
  if (fsModule && PRODUCTS_FILE) {
    try {
      ensureDataDir();
      const uniqueProducts = Array.from(new Set(store.values()));
      fsModule.writeFileSync(PRODUCTS_FILE, JSON.stringify(uniqueProducts, null, 2), "utf-8");
    } catch { }
  }
}

const serverInvoiceStore = loadPersistedSales();
const serverProductStore = loadPersistedProducts();
let latestInvoiceCache: any = serverInvoiceStore.size > 0 ? Array.from(serverInvoiceStore.values())[0] : null;
let cachedBusinessSettings: any = null;

// Hosting compresses every response at the edge. Never compress a body (gzip, brotli,
// CompressionStream) or set content-encoding here or in a server route: the body gets encoded
// twice and renders garbled.
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // API to cache/save sales from cashier POS into backend
    if ((url.pathname === "/api/sales" || url.pathname === "/api/invoice-cache") && request.method === "POST") {
      try {
        const body = (await request.json()) as any;
        const sale = body?.sale || body;
        const id = body?.id || sale?.id || sale?.invoice_number;
        if (id && sale) {
          serverInvoiceStore.set(String(id), sale);
          if (sale.id) serverInvoiceStore.set(String(sale.id), sale);
          if (sale.invoice_number) {
            serverInvoiceStore.set(String(sale.invoice_number).toLowerCase(), sale);
          }
          latestInvoiceCache = sale;
          if (body.settings) {
            cachedBusinessSettings = body.settings;
          }
          persistSalesToFile(serverInvoiceStore);
        }
        return new Response(JSON.stringify({ ok: true, count: serverInvoiceStore.size }), {
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
        });
      } catch {
        return new Response(JSON.stringify({ ok: false }), {
          status: 400,
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
        });
      }
    }

    // API to get all sales from backend
    if (url.pathname === "/api/sales" && request.method === "GET") {
      const sales = Array.from(new Set(serverInvoiceStore.values()));
      return new Response(JSON.stringify({ ok: true, sales }), {
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
          "cache-control": "no-store",
        },
      });
    }

    // API to clear all sales
    if ((url.pathname === "/api/clear-sales" || url.pathname === "/api/clear-all") && request.method === "POST") {
      serverInvoiceStore.clear();
      latestInvoiceCache = null;
      persistSalesToFile(serverInvoiceStore);
      if (url.pathname === "/api/clear-all") {
        serverProductStore.clear();
        persistProductsToFile(serverProductStore);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
        },
      });
    }

    // API to get all products from backend
    if (url.pathname === "/api/products" && request.method === "GET") {
      const products = Array.from(new Set(serverProductStore.values()));
      return new Response(JSON.stringify({ ok: true, products }), {
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
          "cache-control": "no-store",
        },
      });
    }

    // API to save products to backend
    if (url.pathname === "/api/products" && request.method === "POST") {
      try {
        const body = (await request.json()) as any;
        if (body?.products && Array.isArray(body.products)) {
          for (const p of body.products) {
            if (p?.id) serverProductStore.set(String(p.id), p);
          }
        } else if (body?.product?.id) {
          serverProductStore.set(String(body.product.id), body.product);
        }
        persistProductsToFile(serverProductStore);
        return new Response(JSON.stringify({ ok: true, count: serverProductStore.size }), {
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
        });
      } catch {
        return new Response(JSON.stringify({ ok: false }), {
          status: 400,
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
        });
      }
    }

    // API to clear products from backend
    if (url.pathname === "/api/clear-products" && request.method === "POST") {
      serverProductStore.clear();
      persistProductsToFile(serverProductStore);
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
        },
      });
    }

    // API to delete a single product from backend
    if (
      (url.pathname === "/api/products" && request.method === "DELETE") ||
      (url.pathname === "/api/delete-product" && request.method === "POST") ||
      (url.pathname === "/api/delete-product" && request.method === "DELETE")
    ) {
      try {
        let id = url.searchParams.get("id");
        if (!id) {
          const body = (await request.json().catch(() => ({}))) as any;
          id = body?.id || body?.productId;
        }
        if (id) {
          serverProductStore.delete(String(id));
          persistProductsToFile(serverProductStore);
        }
        return new Response(JSON.stringify({ ok: true, id, remaining: serverProductStore.size }), {
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
        });
      } catch {
        return new Response(JSON.stringify({ ok: false }), {
          status: 400,
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
        });
      }
    }

    // API to serve invoices to scanning mobile phones
    if (url.pathname === "/api/invoice" && request.method === "GET") {
      const id = (url.searchParams.get("id") || "").trim();
      let sale = id
        ? serverInvoiceStore.get(id) ||
          serverInvoiceStore.get(id.toLowerCase()) ||
          serverInvoiceStore.get(id.toUpperCase())
        : null;

      if (!sale && id) {
        // Search across store values by invoice_number or ID match
        const cleanId = id.toLowerCase().replace(/[^a-z0-9]/g, "");
        for (const s of serverInvoiceStore.values()) {
          const sId = String(s.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const sInv = String(s.invoice_number || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          if (sId === cleanId || sInv === cleanId || sInv.includes(cleanId) || cleanId.includes(sInv)) {
            sale = s;
            break;
          }
        }
      }

      if (!sale && (!id || id === "latest" || serverInvoiceStore.size > 0)) {
        sale = latestInvoiceCache || Array.from(serverInvoiceStore.values())[0];
      }

      if (sale) {
        return new Response(
          JSON.stringify({ found: true, sale, settings: cachedBusinessSettings }),
          {
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*",
              "cache-control": "no-store",
            },
          }
        );
      }
      return new Response(JSON.stringify({ found: false, count: serverInvoiceStore.size }), {
        status: 404,
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
        },
      });
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
