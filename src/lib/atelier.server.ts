import { createHmac, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ============================================================
 * Atelier Wallpapers — backend logic (Lovable Cloud port)
 * Server-only. Imported dynamically from route handlers.
 * ============================================================ */

export type Plan = "essentiell" | "premium";

const DOWNLOAD_DAYS = 7;
const PRODUCTS_BUCKET = "products";

const PRODUCT_PATHS: Record<Plan, string> = {
  essentiell: "essentiell/Atelier-Essential.zip",
  premium: "premium/Atelier-Premium.zip",
};

const PRODUCT_LABELS: Record<Plan, string> = {
  essentiell: "Essencial",
  premium: "Premium",
};

const PLAN_DESCRIPTIONS: Record<Plan, string> = {
  premium:
    "Über 200 Wallpapers in 4K, Ultrawide, iPad, Sperrbildschirm und Bonus-Guide.",
  essentiell:
    "100 Wallpapers in 4K für Laptop und Smartphone. Sofortiger Download.",
};

/* ---------------- Supabase admin client (loosely typed, self-contained) ---------------- */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

function isNewKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

let _admin: ReturnType<typeof createClient> | undefined;

function admin() {
  if (_admin) return _admin;
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) {
    throw new Error("Supabase nicht konfiguriert (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  _admin = createClient(url, key, {
    global: {
      fetch: ((input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(
          typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
        );
        if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
        if (isNewKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      }) as typeof fetch,
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

/* ---------------- Settings ---------------- */

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const { data } = await admin()
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await admin()
    .from("settings")
    .upsert({ key, value: String(value ?? "") }, { onConflict: "key" });
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const { data } = await admin().from("settings").select("key,value");
  const out: Record<string, string> = {};
  for (const r of data ?? []) out[r.key] = r.value;
  return out;
}

export async function planConfig(plan: Plan) {
  const essential = Number(await getSetting("essential_price_cents", "990"));
  const premium = Number(await getSetting("premium_price_cents", "1990"));
  const store = await getSetting("store_name", "Atelier Wallpapers");
  const cfg =
    plan === "premium"
      ? { plan: "premium" as Plan, amountCents: premium, name: "Premium-Kollektion" }
      : { plan: "essentiell" as Plan, amountCents: essential, name: "Essenzielle Kollektion" };
  return { ...cfg, description: PLAN_DESCRIPTIONS[cfg.plan], storeName: store };
}

/* ---------------- Orders ---------------- */

export function newOrderUid() {
  return "AW-" + randomBytes(4).toString("hex").toUpperCase();
}

export function newDownloadToken() {
  return randomBytes(32).toString("hex");
}

export function downloadExpiryDate() {
  const d = new Date();
  d.setDate(d.getDate() + DOWNLOAD_DAYS);
  return d.toISOString();
}

export async function createOrder(data: {
  order_uid: string;
  email: string;
  customer_name: string | null;
  plan: Plan;
  amount_cents: number;
  currency: string;
  status: string;
  stripe_session_id: string | null;
  download_token: string;
  download_expires_at: string;
}) {
  await admin().from("orders").insert({
    order_uid: data.order_uid,
    email: data.email,
    customer_name: data.customer_name,
    plan: data.plan,
    amount_cents: data.amount_cents,
    currency: data.currency,
    status: data.status,
    stripe_session_id: data.stripe_session_id,
    download_token: data.download_token,
    download_expires_at: data.download_expires_at,
  });
}

export async function getOrderBySessionId(sessionId: string) {
  const { data } = await admin()
    .from("orders")
    .select("*")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  return data;
}

export async function getOrderByToken(token: string) {
  const { data } = await admin()
    .from("orders")
    .select("*")
    .eq("download_token", token)
    .maybeSingle();
  return data;
}

export async function getOrderByUid(uid: string) {
  const { data } = await admin()
    .from("orders")
    .select("*")
    .eq("order_uid", uid)
    .maybeSingle();
  return data;
}

export async function markOrderPaid(orderId: number, paymentIntent: string) {
  await admin()
    .from("orders")
    .update({
      status: "paid",
      stripe_payment_intent: paymentIntent,
      paid_at: new Date().toISOString(),
    })
    .eq("id", orderId);
}

export async function listOrders(limit = 100, offset = 0) {
  const { data } = await admin()
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return data ?? [];
}

export async function countOrdersByStatus() {
  const { data, error } = await admin().rpc("orders_status_counts");
  if (error || !data) {
    const { data: rows } = await admin().from("orders").select("status");
    const map: Record<string, number> = {};
    for (const r of rows ?? []) map[r.status] = (map[r.status] ?? 0) + 1;
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }
  return data;
}

export async function trackPageView(p: {
  path: string;
  referrer?: string;
  userAgent?: string;
  ipHash?: string;
}) {
  await admin().from("page_views").insert({
    path: p.path,
    referrer: p.referrer || null,
    user_agent: p.userAgent || null,
    ip_hash: p.ipHash || null,
  });
}

export async function trackCheckoutEvent(
  eventType: string,
  plan: string | null,
  email: string | null,
  metadata: Record<string, unknown> = {},
) {
  await admin().from("checkout_events").insert({
    event_type: eventType,
    plan: plan || null,
    email: email || null,
    metadata,
  });
}

/* ---------------- Analytics / live ---------------- */

export async function getAnalytics(days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data: paidRows } = await admin()
    .from("orders")
    .select("amount_cents,created_at,plan,status")
    .gte("created_at", since);

  const revenueCents = (paidRows ?? [])
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + (r.amount_cents || 0), 0);

  const ordersByDayMap: Record<string, { orders: number; revenue: number }> = {};
  for (const r of paidRows ?? []) {
    const day = (r.created_at as string).slice(0, 10);
    if (!ordersByDayMap[day]) ordersByDayMap[day] = { orders: 0, revenue: 0 };
    ordersByDayMap[day].orders += 1;
    if (r.status === "paid") ordersByDayMap[day].revenue += r.amount_cents || 0;
  }
  const ordersByDay = Object.entries(ordersByDayMap)
    .map(([day, v]) => ({ day, ...v }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const { data: viewRows } = await admin()
    .from("page_views")
    .select("created_at")
    .gte("created_at", since);
  const viewsByDayMap: Record<string, number> = {};
  for (const r of viewRows ?? []) {
    const day = (r.created_at as string).slice(0, 10);
    viewsByDayMap[day] = (viewsByDayMap[day] ?? 0) + 1;
  }
  const viewsByDay = Object.entries(viewsByDayMap)
    .map(([day, views]) => ({ day, views }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const planMap: Record<string, { count: number; revenue: number }> = {};
  for (const r of (paidRows ?? []).filter((r) => r.status === "paid")) {
    if (!planMap[r.plan]) planMap[r.plan] = { count: 0, revenue: 0 };
    planMap[r.plan].count += 1;
    planMap[r.plan].revenue += r.amount_cents || 0;
  }
  const planBreakdown = Object.entries(planMap).map(([plan, v]) => ({ plan, ...v }));

  return { revenueCents, ordersByDay, viewsByDay, planBreakdown };
}

export async function getLiveFeed(limit = 40) {
  const half = Math.floor(limit / 2);
  const { data: orders } = await admin()
    .from("orders")
    .select("order_uid,email,plan,status,amount_cents,created_at")
    .order("created_at", { ascending: false })
    .limit(half);
  const { data: views } = await admin()
    .from("page_views")
    .select("path,referrer,created_at")
    .order("created_at", { ascending: false })
    .limit(half);

  const feed = [
    ...(orders ?? []).map((o) => ({
      type: "order" as const,
      ref: o.order_uid,
      email: o.email,
      plan: o.plan,
      status: o.status,
      amount_cents: o.amount_cents,
      created_at: o.created_at,
    })),
    ...(views ?? []).map((v) => ({
      type: "view" as const,
      ref: v.path,
      referrer: v.referrer,
      plan: null,
      status: null,
      amount_cents: null,
      created_at: v.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);

  return feed;
}

export async function todayStats() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const startIso = start.toISOString();
  const { data: orders } = await admin()
    .from("orders")
    .select("status,amount_cents")
    .gte("created_at", startIso);
  let ordersCount = 0;
  let revenue = 0;
  for (const r of orders ?? []) {
    ordersCount += 1;
    if (r.status === "paid") revenue += r.amount_cents || 0;
  }
  const { count } = await admin()
    .from("page_views")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startIso);
  return { orders: ordersCount, revenueCents: revenue, views: count ?? 0 };
}

/* ---------------- Delivery ---------------- */

export function planDisplayName(plan: string) {
  return plan === "premium" ? "Premium-Kollektion" : "Essenzielle Kollektion";
}

export function orderDownloadUrl(
  order: { download_token: string | null; status: string } | null,
  baseUrl: string,
) {
  if (!order?.download_token || order.status !== "paid") return null;
  return `${baseUrl}/api/download/${order.download_token}`;
}

export function isTokenValid(order: {
  status: string;
  download_expires_at: string | null;
} | null) {
  if (!order || order.status !== "paid") return false;
  if (!order.download_expires_at) return true;
  return new Date(order.download_expires_at).getTime() > Date.now();
}

export async function fulfillPaidOrder(
  session: {
    id: string;
    payment_intent: string | null;
    metadata?: { order_uid?: string } | null;
  },
  baseUrl: string,
) {
  let order = await getOrderBySessionId(session.id);
  if (!order && session.metadata?.order_uid) {
    order = await getOrderByUid(session.metadata.order_uid);
  }
  if (!order) throw new Error("Bestellung nicht gefunden: " + session.id);
  if (order.status === "paid") return order;

  await markOrderPaid(order.id, session.payment_intent || "");
  order = await getOrderBySessionId(session.id);
  if (!order) throw new Error("Bestellung nach Erfüllung nicht gefunden.");

  if (!(await productFileExists(order.plan as Plan))) {
    await trackCheckoutEvent("delivery_missing_file", order.plan, order.email, {
      order_uid: order.order_uid,
    });
    throw new Error("Produktdatei fehlt für Plan: " + order.plan);
  }

  await trackCheckoutEvent("download_ready", order.plan, order.email, {
    order_uid: order.order_uid,
    download_url: `${baseUrl}/api/download/${order.download_token}`,
  });

  return order;
}

/* ---------------- Products (Storage) ---------------- */

export async function productFileExists(plan: Plan): Promise<boolean> {
  const dir = plan;
  const file = PRODUCT_PATHS[plan].split("/")[1]!;
  const { data, error } = await admin()
    .storage.from(PRODUCTS_BUCKET)
    .list(dir, { limit: 100, search: file });
  if (error) return false;
  return (data ?? []).some((f) => f.name === file);
}

function formatBytes(bytes?: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export async function getProductInfo(plan: Plan) {
  const label = PRODUCT_LABELS[plan];
  const dir = plan;
  const file = PRODUCT_PATHS[plan].split("/")[1]!;
  const { data, error } = await admin()
    .storage.from(PRODUCTS_BUCKET)
    .list(dir, { limit: 100, search: file });
  if (error || !data || !data.some((f) => f.name === file)) {
    return { plan, label, exists: false };
  }
  const entry = data.find((f) => f.name === file)!;
  const sizeBytes = (entry.metadata as { size?: number } | null)?.size ?? 0;
  return {
    plan,
    label,
    exists: true,
    filename: file,
    sizeBytes,
    sizeHuman: formatBytes(sizeBytes),
    updatedAt: entry.updated_at,
    relativePath: PRODUCT_PATHS[plan],
  };
}

export async function listProductsInfo() {
  return Promise.all([getProductInfo("essentiell"), getProductInfo("premium")]);
}

export async function uploadProduct(plan: Plan, fileBuffer: ArrayBuffer, contentType: string) {
  const path = PRODUCT_PATHS[plan];
  const { error } = await admin()
    .storage.from(PRODUCTS_BUCKET)
    .upload(path, fileBuffer, { contentType, upsert: true });
  if (error) throw new Error(error.message);
  return getProductInfo(plan);
}

export async function createDownloadSignedUrl(plan: Plan, expiresIn = 60) {
  const path = PRODUCT_PATHS[plan];
  const { data, error } = await admin()
    .storage.from(PRODUCTS_BUCKET)
    .createSignedUrl(path, expiresIn, { download: PRODUCT_PATHS[plan].split("/")[1]! });
  if (error || !data?.signedUrl) throw new Error("Download-URL konnte nicht erstellt werden.");
  return data.signedUrl;
}

/* ---------------- Stripe (raw REST, edge-safe) ---------------- */

function stripeSecret(): string | null {
  const key = process.env["STRIPE_SECRET_KEY"];
  return key || null;
}

export function isStripeConfigured() {
  return Boolean(process.env["STRIPE_SECRET_KEY"]);
}

export async function createCheckoutSession(args: {
  plan: Plan;
  email: string;
  customerName: string;
  successUrl: string;
  cancelUrl: string;
  orderUid: string;
}) {
  const secret = stripeSecret();
  if (!secret) throw new Error("Stripe ist nicht konfiguriert.");
  const cfg = await planConfig(args.plan);

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("customer_email", args.email);
  body.set("client_reference_id", args.orderUid);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "eur");
  body.set("line_items[0][price_data][unit_amount]", String(cfg.amountCents));
  body.set("line_items[0][price_data][product_data][name]", cfg.name);
  body.set("line_items[0][price_data][product_data][description]", cfg.description);
  body.set("line_items[0][price_data][product_data][metadata][plan]", cfg.plan);
  body.set("metadata[plan]", cfg.plan);
  body.set("metadata[order_uid]", args.orderUid);
  body.set("metadata[customer_name]", args.customerName || "");
  body.set("billing_address_collection", "auto");
  body.set("allow_promotion_codes", "true");
  body.set("success_url", args.successUrl);
  body.set("cancel_url", args.cancelUrl);
  body.set("locale", "de");

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const json = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !json.id || !json.url) {
    throw new Error(json.error?.message || "Stripe session konnte nicht erstellt werden.");
  }
  return { id: json.id, url: json.url };
}

export async function retrieveCheckoutSession(sessionId: string) {
  const secret = stripeSecret();
  if (!secret) return null;
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    id: string;
    payment_status: string;
    payment_intent: string | null;
    metadata?: { order_uid?: string } | null;
  };
  return json;
}

export function constructWebhookEvent(rawBody: string, signatureHeader: string) {
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret) throw new Error("Webhook nicht konfiguriert.");
  const parts = Object.fromEntries(
    signatureHeader
      .split(",")
      .map((kv) => {
        const idx = kv.indexOf("=");
        const k = idx >= 0 ? kv.slice(0, idx) : kv;
        const v = idx >= 0 ? kv.slice(idx + 1) : "";
        return [k.trim(), v.trim()];
      }),
  );
  const timestamp = parts["t"];
  const v1 = parts["v1"];
  if (!timestamp || !v1) throw new Error("Ungültige Signatur.");

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const sigBuf = Buffer.from(v1);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error("Signatur ungültig.");
  }

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error("Webhook abgelaufen.");

  return JSON.parse(rawBody) as {
    type: string;
    data: {
      object: {
        id: string;
        payment_status?: string;
        payment_intent?: string | null;
        metadata?: { order_uid?: string } | null;
      };
    };
  };
}

/* ---------------- Admin auth (single password + signed cookie) ---------------- */

const COOKIE_NAME = "atelier_admin";

function jwtSecret() {
  const s = process.env["JWT_SECRET"];
  if (!s) throw new Error("JWT_SECRET nicht konfiguriert.");
  return s;
}

function b64url(input: string | Buffer) {
  const b = typeof input === "string" ? Buffer.from(input) : input;
  return b.toString("base64url");
}

export function signSession(): string {
  const payload = JSON.stringify({ exp: Date.now() + 86400000 });
  const sig = createHmac("sha256", jwtSecret()).update(payload).digest();
  return `${b64url(payload)}.${b64url(sig)}`;
}

export function verifySession(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return false;
  let payloadStr: string;
  try {
    payloadStr = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return false;
  }
  const expected = createHmac("sha256", jwtSecret()).update(payloadStr).digest();
  let sigBuf: Buffer;
  try {
    sigBuf = Buffer.from(sigB64, "base64url");
  } catch {
    return false;
  }
  if (sigBuf.length !== expected.length || !timingSafeEqual(sigBuf, expected)) return false;
  try {
    const payload = JSON.parse(payloadStr) as { exp: number };
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const expected = process.env["ADMIN_PASSWORD"];
  if (!expected || !password) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function maskSecret(value: string | undefined, visible = 4) {
  if (!value) return "";
  if (value.length <= visible * 2) return "••••••••";
  return value.slice(0, visible) + "••••" + value.slice(-visible);
}

export function ipHash(ip: string) {
  const salt = process.env["JWT_SECRET"] || "salt";
  return createHash("sha256").update(ip + salt).digest("hex").slice(0, 16);
}

export function buildOrderStatus(
  order: {
    status: string;
    email: string;
    plan: string;
    order_uid: string;
    download_token: string | null;
  },
  baseUrl: string,
) {
  const paid = order.status === "paid";
  return {
    status: order.status,
    email: order.email,
    plan: order.plan,
    planName: planDisplayName(order.plan),
    orderUid: order.order_uid,
    paid,
    downloadUrl: paid ? orderDownloadUrl(order, baseUrl) : null,
    downloadReady: paid,
  };
}

export function sanitizeOrder(order: {
  order_uid: string;
  email: string;
  customer_name: string | null;
  plan: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
}) {
  return {
    order_uid: order.order_uid,
    email: order.email,
    customer_name: order.customer_name,
    plan: order.plan,
    amount_cents: order.amount_cents,
    currency: order.currency,
    status: order.status,
    created_at: order.created_at,
    paid_at: order.paid_at,
  };
}
