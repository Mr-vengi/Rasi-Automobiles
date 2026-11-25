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
const CUSTOMERS_FILE = pathModule ? pathModule.join(DATA_DIR, "customers.json") : "";

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

function loadPersistedCustomers(): Map<string, any> {
  const store = new Map<string, any>();
  if (fsModule && CUSTOMERS_FILE && fsModule.existsSync(CUSTOMERS_FILE)) {
    try {
      const content = fsModule.readFileSync(CUSTOMERS_FILE, "utf-8");
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

function persistCustomersToFile(store: Map<string, any>) {
  if (fsModule && CUSTOMERS_FILE) {
    try {
      ensureDataDir();
      const uniqueCustomers = Array.from(new Set(store.values()));
      fsModule.writeFileSync(CUSTOMERS_FILE, JSON.stringify(uniqueCustomers, null, 2), "utf-8");
    } catch { }
  }
}

const serverInvoiceStore = loadPersistedSales();
const serverProductStore = loadPersistedProducts();
const serverCustomerStore = loadPersistedCustomers();
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

    // API to delete a single sale/draft from backend
    if (
      (url.pathname === "/api/sales" && request.method === "DELETE") ||
      (url.pathname === "/api/delete-sale" && (request.method === "POST" || request.method === "DELETE"))
    ) {
      try {
        let id = url.searchParams.get("id");
        if (!id) {
          const body = (await request.json().catch(() => ({}))) as any;
          id = body?.id || body?.saleId;
        }
        if (id) {
          const cleanId = String(id).trim();
          serverInvoiceStore.delete(cleanId);
          serverInvoiceStore.delete(cleanId.toLowerCase());
          serverInvoiceStore.delete(cleanId.toUpperCase());
          for (const [key, s] of Array.from(serverInvoiceStore.entries())) {
            if (s.id === cleanId || s.invoice_number === cleanId) {
              serverInvoiceStore.delete(key);
            }
          }
          if (latestInvoiceCache && (latestInvoiceCache.id === cleanId || latestInvoiceCache.invoice_number === cleanId)) {
            latestInvoiceCache = serverInvoiceStore.size > 0 ? Array.from(serverInvoiceStore.values())[0] : null;
          }
          persistSalesToFile(serverInvoiceStore);
        }
        return new Response(JSON.stringify({ ok: true, id, remaining: serverInvoiceStore.size }), {
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

    // API to get all customers from backend
    if (url.pathname === "/api/customers" && request.method === "GET") {
      const customers = Array.from(new Set(serverCustomerStore.values()));
      return new Response(JSON.stringify({ ok: true, customers }), {
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
          "cache-control": "no-store",
        },
      });
    }

    // API to save customers to backend
    if (url.pathname === "/api/customers" && request.method === "POST") {
      try {
        const body = (await request.json()) as any;
        if (body?.customers && Array.isArray(body.customers)) {
          for (const c of body.customers) {
            if (c?.id) serverCustomerStore.set(String(c.id), c);
          }
        } else if (body?.customer?.id) {
          serverCustomerStore.set(String(body.customer.id), body.customer);
        } else if (body?.id) {
          serverCustomerStore.set(String(body.id), body);
        }
        persistCustomersToFile(serverCustomerStore);
        return new Response(JSON.stringify({ ok: true, count: serverCustomerStore.size }), {
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

    // API to delete a single customer from backend AND Firestore
    if (
      (url.pathname === "/api/customers" && request.method === "DELETE") ||
      (url.pathname === "/api/delete-customer" && (request.method === "POST" || request.method === "DELETE"))
    ) {
      try {
        let id = url.searchParams.get("id");
        if (!id) {
          const body = (await request.json().catch(() => ({}))) as any;
          id = body?.id || body?.customerId;
        }
        if (id) {
          const cleanId = String(id).trim();
          serverCustomerStore.delete(cleanId);
          persistCustomersToFile(serverCustomerStore);
          // Also invoke direct HTTPS REST delete to Firestore server from backend
          try {
            const firestoreUrl = `https://firestore.googleapis.com/v1/projects/rasiautomobile/databases/(default)/documents/customers/${encodeURIComponent(cleanId)}?key=AIzaSyAmJi6G8K1qAlKYKXZK3yhPSsrqnH3jTF4`;
            void fetch(firestoreUrl, { method: "DELETE" }).catch(() => {});
          } catch { }
        }
        return new Response(JSON.stringify({ ok: true, id, remaining: serverCustomerStore.size }), {
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
