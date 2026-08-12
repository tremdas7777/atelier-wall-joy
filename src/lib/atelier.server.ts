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

export function normalizeProductPlan(plan: string | undefined | null): Plan {
  return plan === "premium" ? "premium" : "essentiell";
}

function localProductAbsolutePath(plan: Plan): string {
  // Resolved at runtime — dynamic import in async helpers
  return `public/products/${PRODUCT_PATHS[plan]}`;
}

export function getProductPublicUrl(plan: Plan): string {
  return `/products/${PRODUCT_PATHS[plan]}`;
}

async function localProductStat(plan: Plan) {
  try {
    const { stat } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const path = join(process.cwd(), localProductAbsolutePath(plan));
    const info = await stat(path);
    const filename = PRODUCT_PATHS[plan].split("/")[1]!;
    return {
      exists: true,
      filename,
      sizeBytes: info.size,
      sizeHuman: formatBytes(info.size),
      updatedAt: info.mtime.toISOString(),
    };
  } catch {
    return { exists: false as const };
  }
}

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

// Loosely typed (any schema) so table ops don't depend on generated types.
let _admin: SupabaseClient<any, any, any> | undefined;

function admin() {
  if (_admin) return _admin;
  const url = process.env["SUPABASE_URL"];
  const key = resolveSupabaseServiceKey();
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

const DEFAULT_SETTINGS: Record<string, string> = {
  essential_price_cents: "990",
  premium_price_cents: "1990",
  store_name: "Atelier Wallpapers",
  support_email: "kontakt@atelierwallpapers.de",
};

const SETTINGS_FILE = ".data/settings.json";

function hasSupabaseAdmin(): boolean {
  return Boolean(process.env["SUPABASE_URL"] && resolveSupabaseServiceKey());
}

async function readSettingsFile(): Promise<Record<string, string>> {
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const raw = await readFile(join(process.cwd(), SETTINGS_FILE), "utf8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

async function writeSettingsFile(settings: Record<string, string>): Promise<void> {
  const { writeFile, mkdir } = await import("node:fs/promises");
  const { join, dirname } = await import("node:path");
  const path = join(process.cwd(), SETTINGS_FILE);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(settings, null, 2) + "\n", "utf8");
}

export async function getSetting(key: string, fallback = ""): Promise<string> {
  if (hasSupabaseAdmin()) {
    const { data } = await admin()
      .from("settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return data?.value ?? fallback;
  }
  const file = await readSettingsFile();
  return file[key] ?? DEFAULT_SETTINGS[key] ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (hasSupabaseAdmin()) {
    await admin()
      .from("settings")
      .upsert({ key, value: String(value ?? "") }, { onConflict: "key" });
    return;
  }
  const settings = { ...DEFAULT_SETTINGS, ...await readSettingsFile(), [key]: String(value ?? "") };
  await writeSettingsFile(settings);
}

export async function getAllSettings(): Promise<Record<string, string>> {
  if (hasSupabaseAdmin()) {
    const { data } = await admin().from("settings").select("key,value");
    const out: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const r of data ?? []) out[r.key] = r.value;
    return out;
  }
  return { ...DEFAULT_SETTINGS, ...(await readSettingsFile()) };
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

export function resolveBaseUrl(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim() || url.host;
    const proto = forwardedProto?.split(",")[0]?.trim() || url.protocol.replace(":", "") || "https";
    return `${proto}://${host}`;
  }
  return url.origin;
}

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
  if (!hasSupabaseAdmin()) return;
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
  if (!hasSupabaseAdmin()) return null;
  const { data } = await admin()
    .from("orders")
    .select("*")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  return data;
}

export async function getOrderByToken(token: string) {
  if (!hasSupabaseAdmin()) return null;
  const { data } = await admin()
    .from("orders")
    .select("*")
    .eq("download_token", token)
    .maybeSingle();
  return data;
}

export async function getOrderByUid(uid: string) {
  if (!hasSupabaseAdmin()) return null;
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
  referrer: string | undefined;
  userAgent: string | undefined;
  ipHash: string | undefined;
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
  if (!hasSupabaseAdmin()) return;
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
    const key: string = r.plan;
    if (!planMap[key]) planMap[key] = { count: 0, revenue: 0 };
    planMap[key]!.count += 1;
    planMap[key]!.revenue += r.amount_cents || 0;
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

export function orderDownloadUrl(order: { plan: string; status: string }) {
  if (order.status !== "paid") return null;
  return getProductPublicUrl(normalizeProductPlan(order.plan));
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
    metadata?: { order_uid?: string; plan?: string; customer_name?: string } | null;
    customer_email?: string | null;
    client_reference_id?: string | null;
  },
  baseUrl: string,
) {
  if (!hasSupabaseAdmin()) {
    const plan = normalizeProductPlan(session.metadata?.plan);
    return {
      status: "paid",
      email: session.customer_email || "",
      plan,
      order_uid: session.metadata?.order_uid || session.client_reference_id || session.id,
      download_token: null,
    };
  }

  let order = await getOrderBySessionId(session.id);
  if (!order && session.metadata?.order_uid) {
    order = await getOrderByUid(session.metadata.order_uid);
  }
  if (!order) throw new Error("Bestellung nicht gefunden: " + session.id);
  if (order.status === "paid") return order;

  await markOrderPaid(order.id, session.payment_intent || "");
  order = await getOrderBySessionId(session.id);
  if (!order) throw new Error("Bestellung nach Erfüllung nicht gefunden.");

  const hasFile = await productFileExists(order.plan as Plan);
  if (!hasFile) {
    await trackCheckoutEvent("delivery_missing_file", order.plan, order.email, {
      order_uid: order.order_uid,
    });
    return order;
  }

  await trackCheckoutEvent("download_ready", order.plan, order.email, {
    order_uid: order.order_uid,
    download_url: getProductPublicUrl(order.plan as Plan),
  });

  return order;
}

/* ---------------- Products (local files + optional Supabase Storage) ---------------- */

export async function productFileExists(plan: Plan): Promise<boolean> {
  const local = await localProductStat(plan);
  if (local.exists) return true;
  if (!hasSupabaseAdmin()) return false;
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
  const local = await localProductStat(plan);
  if (local.exists) {
    return {
      plan,
      label,
      exists: true,
      filename: local.filename,
      sizeBytes: local.sizeBytes,
      sizeHuman: local.sizeHuman,
      updatedAt: local.updatedAt,
      relativePath: PRODUCT_PATHS[plan],
    };
  }
  if (!hasSupabaseAdmin()) {
    return { plan, label, exists: false };
  }
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
  const { writeFile, mkdir } = await import("node:fs/promises");
  const { join, dirname } = await import("node:path");
  const localPath = join(process.cwd(), localProductAbsolutePath(plan));
  await mkdir(dirname(localPath), { recursive: true });
  await writeFile(localPath, Buffer.from(fileBuffer));

  if (hasSupabaseAdmin()) {
    const path = PRODUCT_PATHS[plan];
    await admin()
      .storage.from(PRODUCTS_BUCKET)
      .upload(path, fileBuffer, { contentType, upsert: true });
  }

  return getProductInfo(plan);
}

export async function streamLocalProduct(plan: Plan): Promise<Response> {
  const local = await localProductStat(plan);
  if (!local.exists) {
    return new Response("Produktdatei nicht gefunden.", { status: 404 });
  }
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const path = join(process.cwd(), localProductAbsolutePath(plan));
  const data = await readFile(path);
  return new Response(data, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${local.filename}"`,
      "cache-control": "private, max-age=3600",
    },
  });
}

export async function createDownloadSignedUrl(plan: Plan, expiresIn = 60) {
  if (await productFileExists(plan)) {
    return getProductPublicUrl(plan);
  }
  if (!hasSupabaseAdmin()) {
    throw new Error("Download-URL konnte nicht erstellt werden.");
  }
  const path = PRODUCT_PATHS[plan];
  const { data, error } = await admin()
    .storage.from(PRODUCTS_BUCKET)
    .createSignedUrl(path, expiresIn, { download: PRODUCT_PATHS[plan].split("/")[1]! });
  if (error || !data?.signedUrl) throw new Error("Download-URL konnte nicht erstellt werden.");
  return data.signedUrl;
}

/* ---------------- Stripe (raw REST, edge-safe) ---------------- */

async function stripeSecret(): Promise<string | null> {
  const fromDb = (await getSetting("stripe_secret_key", "")).trim();
  if (fromDb) return fromDb;
  return process.env["STRIPE_SECRET_KEY"] || null;
}

export async function stripePublishableKey(): Promise<string> {
  const fromDb = (await getSetting("stripe_publishable_key", "")).trim();
  return fromDb || process.env["STRIPE_PUBLISHABLE_KEY"] || "";
}

export async function stripeWebhookSecret(): Promise<string> {
  const fromDb = (await getSetting("stripe_webhook_secret", "")).trim();
  return fromDb || process.env["STRIPE_WEBHOOK_SECRET"] || "";
}

export async function isStripeConfigured(): Promise<boolean> {
  return Boolean(await stripeSecret());
}

export async function createCheckoutSession(args: {
  plan: Plan;
  email: string;
  customerName: string;
  successUrl: string;
  cancelUrl: string;
  orderUid: string;
}) {
  const secret = await stripeSecret();
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
  const secret = await stripeSecret();
  if (!secret) return null;
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    id: string;
    payment_status: string;
    status?: string;
    payment_intent: string | null;
    customer_email?: string | null;
    client_reference_id?: string | null;
    metadata?: { order_uid?: string; plan?: string; customer_name?: string } | null;
  };
  return json;
}

export function isCheckoutSessionPaid(session: {
  payment_status?: string;
  status?: string;
}): boolean {
  return session.payment_status === "paid" || session.status === "complete";
}

export async function constructWebhookEvent(rawBody: string, signatureHeader: string) {
  const secret = await stripeWebhookSecret();
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
        status?: string;
        payment_intent?: string | null;
        metadata?: { order_uid?: string } | null;
      };
    };
  };
}

/* ---------------- Admin auth (single password + signed cookie) ---------------- */

const COOKIE_NAME = "atelier_admin";
const COOKIE_MAX_AGE = 86400;

function resolveSupabaseServiceKey(): string | undefined {
  return (
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
    process.env["SUPABASE_SECRET_KEY"] ||
    undefined
  );
}

function resolveJwtSecret(): string {
  const explicit = process.env["JWT_SECRET"];
  if (explicit) return explicit;
  const projectId =
    process.env["SUPABASE_PROJECT_ID"] || process.env["VITE_SUPABASE_PROJECT_ID"];
  if (projectId) {
    return createHash("sha256").update(`atelier-admin-jwt:${projectId}`).digest("hex");
  }
  throw new Error("JWT_SECRET nicht konfiguriert.");
}

function jwtSecret() {
  return resolveJwtSecret();
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
  let secret: string;
  try {
    secret = jwtSecret();
  } catch {
    return false;
  }
  const expected = createHmac("sha256", secret).update(payloadStr).digest();
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

export function getAdminToken(request: Request): string | undefined {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)atelier_admin=([^;]+)/);
  const raw = match?.[1];
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function getAdminTokenFromRequest(request: Request): string | undefined {
  const cookieToken = getAdminToken(request);
  if (cookieToken) return cookieToken;
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return bearer || undefined;
}

export function isAdminAuthorized(request: Request): boolean {
  return verifySession(getAdminTokenFromRequest(request));
}

export function buildAdminCookieHeader(token: string, request?: Request, maxAge = COOKIE_MAX_AGE): string {
  const secure =
    request &&
    (new URL(request.url).protocol === "https:" ||
      request.headers.get("x-forwarded-proto") === "https");
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const expected = resolveAdminPassword();
  if (!expected || !password) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function resolveAdminPassword(): string | undefined {
  if (process.env["ADMIN_PASSWORD"]) return process.env["ADMIN_PASSWORD"];
  const projectId =
    process.env["SUPABASE_PROJECT_ID"] || process.env["VITE_SUPABASE_PROJECT_ID"];
  if (projectId) return "admin123";
  return undefined;
}

export function maskSecret(value: string | undefined, visible = 4) {
  if (!value) return "";
  if (value.length <= visible * 2) return "••••••••";
  return value.slice(0, visible) + "••••" + value.slice(-visible);
}

export function ipHash(ip: string) {
  const salt = resolveJwtSecret();
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
  opts?: { downloadReady?: boolean },
) {
  const paid = order.status === "paid";
  const fileReady = opts?.downloadReady ?? paid;
  return {
    status: order.status,
    email: order.email,
    plan: order.plan,
    planName: planDisplayName(order.plan),
    orderUid: order.order_uid,
    paid,
    downloadUrl: paid && fileReady ? orderDownloadUrl(order) : null,
    downloadReady: paid && fileReady,
  };
}

export async function buildOrderStatusWithDelivery(
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
  const fileReady = paid ? await productFileExists(order.plan as Plan) : false;
  return buildOrderStatus(order, baseUrl, { downloadReady: fileReady });
}

export async function buildStatusFromStripeSession(
  session: {
    id: string;
    payment_status?: string;
    status?: string;
    customer_email?: string | null;
    client_reference_id?: string | null;
    metadata?: { order_uid?: string; plan?: string } | null;
  },
) {
  const plan = normalizeProductPlan(session.metadata?.plan);
  const fileReady = await productFileExists(plan);
  return {
    status: "paid",
    email: session.customer_email || "",
    plan,
    planName: planDisplayName(plan),
    orderUid: session.metadata?.order_uid || session.client_reference_id || session.id,
    paid: true,
    downloadUrl: fileReady ? getProductPublicUrl(plan) : null,
    downloadReady: fileReady,
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
