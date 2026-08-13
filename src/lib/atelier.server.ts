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

/**
 * Lieferung erfolgt über einen Google-Drive-Ordner (kein ZIP-Download mehr).
 */
export const DELIVERY_URL =
  "https://drive.google.com/drive/folders/147qI81faerUx0_jbH0yClZoKwLmRm_CF";

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
  meta_pixel_id: "",
  meta_pixel_access_token: "",
  meta_pixel_enabled: "0",
  utmify_api_token: "",
  utmify_enabled: "0",
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
  return DELIVERY_URL;
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

  void sendMetaPixelPurchase({
    eventId: session.id,
    email: order.email,
    value: (order.amount_cents || 0) / 100,
    currency: order.currency || "eur",
    plan: order.plan,
    orderId: order.order_uid,
  });

  void sendUtmifyOrder({
    order: {
      order_uid: order.order_uid,
      email: order.email,
      customer_name: order.customer_name,
      plan: order.plan,
      amount_cents: order.amount_cents,
      currency: order.currency,
      created_at: order.created_at,
      paid_at: order.paid_at,
    },
    status: "paid",
  });

  await trackCheckoutEvent("download_ready", order.plan, order.email, {
    order_uid: order.order_uid,
    download_url: DELIVERY_URL,
  });

  return order;
}

/* ---------------- Products (local files + optional Supabase Storage) ---------------- */

export async function productFileExists(plan: Plan): Promise<boolean> {
  if (await storageProductStat(plan)) return true;
  const local = await localProductStat(plan);
  return local.exists;
}

async function storageProductStat(plan: Plan) {
  if (!hasSupabaseAdmin()) return null;
  const dir = plan;
  const file = PRODUCT_PATHS[plan].split("/")[1]!;
  try {
    const { data, error } = await admin()
      .storage.from(PRODUCTS_BUCKET)
      .list(dir, { limit: 100, search: file });
    if (error || !data) return null;
    const entry = data.find((f) => f.name === file);
    if (!entry) return null;
    const sizeBytes = (entry.metadata as { size?: number } | null)?.size ?? 0;
    return { file, sizeBytes, updatedAt: entry.updated_at as string | undefined };
  } catch {
    return null;
  }
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
  const remote = await storageProductStat(plan);
  if (remote) {
    return {
      plan,
      label,
      exists: true,
      filename: remote.file,
      sizeBytes: remote.sizeBytes,
      sizeHuman: formatBytes(remote.sizeBytes),
      updatedAt: remote.updatedAt,
      relativePath: PRODUCT_PATHS[plan],
    };
  }
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
  return { plan, label, exists: false };
}

export async function listProductsInfo() {
  return Promise.all([getProductInfo("essentiell"), getProductInfo("premium")]);
}

export async function uploadProduct(plan: Plan, fileBuffer: ArrayBuffer, contentType: string) {
  if (!hasSupabaseAdmin()) {
    throw new Error("Speicher nicht konfiguriert — Upload nicht möglich.");
  }
  // Storage is the source of truth: local disk is ephemeral and lost on redeploy.
  const path = PRODUCT_PATHS[plan];
  const { error } = await admin()
    .storage.from(PRODUCTS_BUCKET)
    .upload(path, fileBuffer, { contentType: contentType || "application/zip", upsert: true });
  if (error) {
    throw new Error(`Upload fehlgeschlagen: ${error.message}`);
  }

  // Best-effort local copy (speeds up downloads while this instance lives).
  try {
    const { writeFile, mkdir } = await import("node:fs/promises");
    const { join, dirname } = await import("node:path");
    const localPath = join(process.cwd(), localProductAbsolutePath(plan));
    await mkdir(dirname(localPath), { recursive: true });
    await writeFile(localPath, Buffer.from(fileBuffer));
  } catch {
    /* ephemeral filesystem — ignore */
  }

  return getProductInfo(plan);
}

/* ---------------- Resumable upload (TUS) ---------------- */

/**
 * Ensures the products bucket accepts large files (up to 5 GB).
 * Uses the Storage REST API — not SQL — so it works within Lovable Cloud constraints.
 * Idempotent: safe to call before every upload.
 */
export async function ensureBucketFileSizeLimit(): Promise<void> {
  if (!hasSupabaseAdmin()) return;
  try {
    const { error } = await admin().storage.updateBucket(PRODUCTS_BUCKET, {
      public: false,
      fileSizeLimit: 5_368_709_120, // 5 GB
      allowedMimeTypes: ["application/zip", "application/x-zip-compressed"],
    } as any);
    if (error) console.error("ensureBucketFileSizeLimit:", error.message);
  } catch (e) {
    console.error("ensureBucketFileSizeLimit:", e);
  }
}

/**
 * Creates a short-lived signed upload token that the browser uses with
 * tus-js-client to upload directly to Supabase Storage — bypassing the
 * Cloudflare Worker's 100 MB request-body limit entirely.
 */
export async function createSignedUploadToken(plan: Plan) {
  if (!hasSupabaseAdmin()) {
    throw new Error("Speicher nicht konfiguriert — Upload nicht möglich.");
  }
  await ensureBucketFileSizeLimit();
  const path = PRODUCT_PATHS[plan];
  const { data, error } = await admin()
    .storage.from(PRODUCTS_BUCKET)
    .createSignedUploadUrl(path, { upsert: true } as any);
  if (error || !data) {
    throw new Error(
      `Signed-Upload-Token fehlgeschlagen: ${error?.message ?? "unbekannt"}`,
    );
  }
  const supabaseUrl = process.env["SUPABASE_URL"]!;
  const projectId = supabaseUrl.replace(/^https?:\/\/([^.]+)\..*$/, "$1");
  const endpoint = `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
  return {
    token: (data as any).token as string,
    endpoint,
    bucketName: PRODUCTS_BUCKET,
    objectName: path,
    contentType: "application/zip",
  };
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
  if (hasSupabaseAdmin() && (await storageProductStat(plan))) {
    const path = PRODUCT_PATHS[plan];
    const { data, error } = await admin()
      .storage.from(PRODUCTS_BUCKET)
      .createSignedUrl(path, expiresIn, { download: PRODUCT_PATHS[plan].split("/")[1]! });
    if (!error && data?.signedUrl) return data.signedUrl;
  }
  const local = await localProductStat(plan);
  if (local.exists) return getProductPublicUrl(plan);
  throw new Error("Download-URL konnte nicht erstellt werden.");
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

export function normalizeMetaPixelId(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const id = String(raw).trim().replace(/\D/g, "");
  return id.length >= 10 && id.length <= 20 ? id : null;
}

export function normalizeMetaPixelAccessToken(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const token = String(raw).trim();
  return token.length >= 20 && token.length <= 512 ? token : null;
}

export async function metaPixelAccessToken(): Promise<string> {
  const fromDb = (await getSetting("meta_pixel_access_token", "")).trim();
  return fromDb || process.env["META_PIXEL_ACCESS_TOKEN"] || "";
}

export async function metaPixelConfig(): Promise<{ enabled: boolean; pixelId: string | null }> {
  const toggle = (await getSetting("meta_pixel_enabled", "0")).trim() === "1";
  const fromSetting = normalizeMetaPixelId(await getSetting("meta_pixel_id", ""));
  const fromEnv = normalizeMetaPixelId(process.env["META_PIXEL_ID"]);
  const pixelId = fromSetting || fromEnv;
  const token = normalizeMetaPixelAccessToken(await metaPixelAccessToken());
  const ready = toggle && Boolean(pixelId) && Boolean(token);
  return {
    enabled: ready,
    pixelId: ready && pixelId ? pixelId : null,
  };
}

export async function isMetaPixelConfigured(): Promise<boolean> {
  const cfg = await metaPixelConfig();
  return cfg.enabled && Boolean(cfg.pixelId);
}

function hashMetaUserData(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function sendMetaPixelPurchase(args: {
  eventId: string;
  email?: string | null;
  value: number;
  currency: string;
  plan: string;
  orderId: string;
}) {
  const cfg = await metaPixelConfig();
  const token = normalizeMetaPixelAccessToken(await metaPixelAccessToken());
  if (!cfg.enabled || !cfg.pixelId || !token) return;

  const userData: Record<string, string[]> = {};
  if (args.email) userData["em"] = [hashMetaUserData(args.email)];

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: args.eventId,
        action_source: "website",
        user_data: userData,
        custom_data: {
          currency: args.currency.toUpperCase(),
          value: args.value,
          content_ids: [args.plan],
          order_id: args.orderId,
        },
      },
    ],
  };

  try {
    const url = `https://graph.facebook.com/v21.0/${cfg.pixelId}/events?access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("meta pixel capi error:", res.status, text);
    }
  } catch (err) {
    console.error("meta pixel capi error:", err);
  }
}

/* ---------------- Utmify ---------------- */

export type UtmifyTrackingParams = {
  src: string | null;
  sck: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  utm_term: string | null;
};

export type UtmifyOrderStatus =
  | "waiting_payment"
  | "paid"
  | "refused"
  | "refunded"
  | "chargedback";

const UTMIFY_PLATFORM = "AtelierWallpapers";

function emptyUtmifyTracking(): UtmifyTrackingParams {
  return {
    src: null,
    sck: null,
    utm_source: null,
    utm_campaign: null,
    utm_medium: null,
    utm_content: null,
    utm_term: null,
  };
}

export function normalizeUtmifyTracking(raw: unknown): UtmifyTrackingParams {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const pick = (key: keyof UtmifyTrackingParams) => {
    const v = r[key];
    if (v == null || v === "") return null;
    const s = String(v).trim();
    return s || null;
  };
  return {
    src: pick("src"),
    sck: pick("sck"),
    utm_source: pick("utm_source"),
    utm_campaign: pick("utm_campaign"),
    utm_medium: pick("utm_medium"),
    utm_content: pick("utm_content"),
    utm_term: pick("utm_term"),
  };
}

export function normalizeUtmifyApiToken(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const token = String(raw).trim();
  return token.length >= 20 && token.length <= 512 ? token : null;
}

export async function utmifyApiToken(): Promise<string> {
  const fromDb = (await getSetting("utmify_api_token", "")).trim();
  return fromDb || process.env["UTMIFY_API_TOKEN"] || "";
}

export async function isUtmifyConfigured(): Promise<boolean> {
  const toggle = (await getSetting("utmify_enabled", "0")).trim() === "1";
  const token = normalizeUtmifyApiToken(await utmifyApiToken());
  return toggle && Boolean(token);
}

export function resolveClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip")?.trim() || null;
}

export function formatUtmifyUtc(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function utmifyCommissionCurrency(code: string): string {
  const c = code.toUpperCase();
  const allowed = new Set([
    "BRL",
    "USD",
    "EUR",
    "GBP",
    "ARS",
    "CAD",
    "COP",
    "MXN",
    "PYG",
    "CLP",
    "PEN",
    "PLN",
  ]);
  return allowed.has(c) ? c : "EUR";
}

function utmifyProductMeta(plan: string, productName?: string | null) {
  if (plan === "premium") {
    const name = productName?.trim() || "Premium Collection";
    return { id: "premium", name, planId: "premium", planName: name };
  }
  const name = productName?.trim() || "Essential Collection";
  return { id: "essentiell", name, planId: "essentiell", planName: name };
}

export async function getOrderCheckoutContext(orderUid: string) {
  const empty = {
    tracking: emptyUtmifyTracking(),
    country: null as string | null,
    customerIp: null as string | null,
    productName: null as string | null,
  };
  if (!hasSupabaseAdmin()) return empty;

  const { data } = await admin()
    .from("checkout_events")
    .select("metadata")
    .eq("event_type", "checkout_created")
    .order("created_at", { ascending: false })
    .limit(100);

  const row = (data ?? []).find(
    (r) => (r.metadata as Record<string, unknown> | null)?.["order_uid"] === orderUid,
  );
  if (!row?.metadata) return empty;

  const meta = row.metadata as Record<string, unknown>;
  return {
    tracking: normalizeUtmifyTracking(meta["tracking"]),
    country: typeof meta["country"] === "string" ? (meta["country"] as string).toUpperCase() : null,
    customerIp: typeof meta["customer_ip"] === "string" ? (meta["customer_ip"] as string) : null,
    productName: typeof meta["product_name"] === "string" ? (meta["product_name"] as string) : null,
  };
}

type UtmifyOrderRow = {
  order_uid: string;
  email: string;
  customer_name: string | null;
  plan: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  paid_at?: string | null;
};

function buildUtmifyOrderPayload(args: {
  order: UtmifyOrderRow;
  status: UtmifyOrderStatus;
  tracking: UtmifyTrackingParams;
  country?: string | null;
  customerIp?: string | null;
  productName?: string | null;
}) {
  const product = utmifyProductMeta(args.order.plan, args.productName);
  const total = args.order.amount_cents || 0;
  const createdAt = formatUtmifyUtc(args.order.created_at);
  const approvedDate =
    args.status === "paid"
      ? formatUtmifyUtc(args.order.paid_at || new Date())
      : null;

  return {
    orderId: args.order.order_uid,
    platform: UTMIFY_PLATFORM,
    paymentMethod: "credit_card" as const,
    status: args.status,
    createdAt,
    approvedDate,
    refundedAt: null,
    customer: {
      name: args.order.customer_name?.trim() || args.order.email.split("@")[0] || "Customer",
      email: args.order.email,
      phone: null,
      document: null,
      country: (args.country || "DE").toUpperCase().slice(0, 2),
      ip: args.customerIp || undefined,
    },
    products: [
      {
        id: product.id,
        name: product.name,
        planId: product.planId,
        planName: product.planName,
        quantity: 1,
        priceInCents: total,
      },
    ],
    trackingParameters: args.tracking,
    commission: {
      totalPriceInCents: total,
      gatewayFeeInCents: 0,
      userCommissionInCents: total,
      currency: utmifyCommissionCurrency(args.order.currency || "eur"),
    },
    isTest: false,
  };
}

export async function sendUtmifyOrder(args: {
  order: UtmifyOrderRow;
  status: UtmifyOrderStatus;
  tracking?: UtmifyTrackingParams;
  country?: string | null;
  customerIp?: string | null;
  productName?: string | null;
}) {
  if (!(await isUtmifyConfigured())) return;
  const token = normalizeUtmifyApiToken(await utmifyApiToken());
  if (!token) return;

  let tracking = args.tracking || emptyUtmifyTracking();
  let country = args.country ?? null;
  let customerIp = args.customerIp ?? null;
  let productName = args.productName ?? null;

  if (!args.tracking) {
    const ctx = await getOrderCheckoutContext(args.order.order_uid);
    tracking = ctx.tracking;
    country = country || ctx.country;
    customerIp = customerIp || ctx.customerIp;
    productName = productName || ctx.productName;
  }

  const payload = buildUtmifyOrderPayload({
    order: args.order,
    status: args.status,
    tracking,
    country,
    customerIp,
    productName,
  });

  try {
    const res = await fetch("https://api.utmify.com.br/api-credentials/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-token": token,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("utmify error:", res.status, text);
    }
  } catch (err) {
    console.error("utmify error:", err);
  }
}

export async function createCheckoutSession(args: {
  plan: Plan;
  email: string;
  customerName: string;
  successUrl: string;
  cancelUrl: string;
  orderUid: string;
  currency?: string;
  amountCents?: number;
  locale?: string;
  productName?: string;
  productDescription?: string;
  eurAmountCents?: number;
}) {
  const secret = await stripeSecret();
  if (!secret) throw new Error("Stripe ist nicht konfiguriert.");
  const cfg = await planConfig(args.plan);
  const currency = (args.currency || "eur").toLowerCase();
  const amountCents = args.amountCents ?? cfg.amountCents;
  const STRIPE_ALLOWED_LOCALES = new Set([
    "auto","bg","cs","da","de","el","en","en-GB","es","es-419","et","fi","fil","fr","fr-CA",
    "hr","hu","id","it","ja","ko","lt","lv","ms","mt","nb","nl","pl","pt","pt-BR","ro","ru",
    "sk","sl","sv","th","tr","vi","zh","zh-HK","zh-TW",
  ]);
  const requestedLocale = (args.locale || "auto").trim();
  const stripeLocale = STRIPE_ALLOWED_LOCALES.has(requestedLocale)
    ? requestedLocale
    : STRIPE_ALLOWED_LOCALES.has(requestedLocale.split("-")[0] || "")
      ? requestedLocale.split("-")[0]!
      : "auto";

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("customer_email", args.email);
  body.set("client_reference_id", args.orderUid);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", currency);
  body.set("line_items[0][price_data][unit_amount]", String(amountCents));
  body.set("line_items[0][price_data][product_data][name]", args.productName || cfg.name);
  body.set(
    "line_items[0][price_data][product_data][description]",
    args.productDescription || cfg.description,
  );
  body.set("line_items[0][price_data][product_data][metadata][plan]", cfg.plan);
  body.set("metadata[plan]", cfg.plan);
  body.set("metadata[order_uid]", args.orderUid);
  body.set("metadata[customer_name]", args.customerName || "");
  if (args.eurAmountCents != null) {
    body.set("metadata[eur_amount_cents]", String(args.eurAmountCents));
  }
  body.set("billing_address_collection", "auto");
  body.set("allow_promotion_codes", "true");
  body.set("success_url", args.successUrl);
  body.set("cancel_url", args.cancelUrl);
  body.set("locale", stripeLocale);

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
  const fileReady = paid;
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
  return buildOrderStatus(order, baseUrl);
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
  return {
    status: "paid",
    email: session.customer_email || "",
    plan,
    planName: planDisplayName(plan),
    orderUid: session.metadata?.order_uid || session.client_reference_id || session.id,
    paid: true,
    downloadUrl: DELIVERY_URL,
    downloadReady: true,
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
