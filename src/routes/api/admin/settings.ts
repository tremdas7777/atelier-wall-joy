import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/settings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const lib = await import("@/lib/atelier.server");
          const { isAdminAuthorized, getAllSettings, maskSecret, stripePublishableKey, stripeWebhookSecret, metaPixelAccessToken, utmifyApiToken } = lib;
          if (!isAdminAuthorized(request)) {
            return Response.json({ error: "Não autenticado." }, { status: 401 });
          }
          const s = await getAllSettings();
          const secretKey = (s["stripe_secret_key"] || process.env["STRIPE_SECRET_KEY"] || "").trim();
          const pubKey = await stripePublishableKey();
          const webhookSecret = await stripeWebhookSecret();
          const pixelToken = await metaPixelAccessToken();
          const utmifyToken = await utmifyApiToken();
          return Response.json({
            settings: {
              stripe_publishable_key: pubKey ? maskSecret(pubKey, 8) : "",
              stripe_secret_key: secretKey ? "••••••••" : "",
              stripe_webhook_secret: webhookSecret ? "••••••••" : "",
              meta_pixel_id: s["meta_pixel_id"] || "",
              meta_pixel_access_token: pixelToken ? "••••••••" : "",
              meta_pixel_enabled: s["meta_pixel_enabled"] === "1" ? "1" : "0",
              utmify_api_token: utmifyToken ? "••••••••" : "",
              utmify_enabled: s["utmify_enabled"] === "1" ? "1" : "0",
              essential_price_cents: s["essential_price_cents"],
              premium_price_cents: s["premium_price_cents"],
              store_name: s["store_name"],
              support_email: s["support_email"],
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erro ao carregar configurações.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
      PUT: async ({ request }) => {
        try {
          const lib = await import("@/lib/atelier.server");
          const { isAdminAuthorized, setSetting } = lib;
          if (!isAdminAuthorized(request)) {
            return Response.json({ error: "Não autenticado." }, { status: 401 });
          }
          let body: Record<string, string> = {};
          try {
            body = (await request.json()) as Record<string, string>;
          } catch {
            /* ignore */
          }
          const allowed = [
            "stripe_publishable_key",
            "stripe_secret_key",
            "stripe_webhook_secret",
            "meta_pixel_id",
            "meta_pixel_access_token",
            "meta_pixel_enabled",
            "utmify_api_token",
            "utmify_enabled",
            "essential_price_cents",
            "premium_price_cents",
            "store_name",
            "support_email",
          ];
          for (const key of allowed) {
            const value = body[key];
            if (value === undefined) continue;
            let v = String(value).trim();
            if (v.includes("••••") || v === "********") continue;
            if (key.startsWith("stripe_") && v === "") continue;
            if (key === "meta_pixel_access_token" && v === "") continue;
            if (key === "utmify_api_token" && v === "") continue;
            if (key === "meta_pixel_enabled") {
              v = v === "1" || v === "true" || v === "on" ? "1" : "0";
            }
            if (key === "utmify_enabled") {
              v = v === "1" || v === "true" || v === "on" ? "1" : "0";
            }
            if (key === "meta_pixel_id" && v) {
              const { normalizeMetaPixelId } = await import("@/lib/atelier.server");
              const normalized = normalizeMetaPixelId(v);
              if (!normalized) {
                return Response.json(
                  { error: "ID do Meta Pixel inválido (use só números, ex: 123456789012345)." },
                  { status: 400 },
                );
              }
              v = normalized;
            }
            if (key === "meta_pixel_access_token" && v) {
              const { normalizeMetaPixelAccessToken } = await import("@/lib/atelier.server");
              const normalized = normalizeMetaPixelAccessToken(v);
              if (!normalized) {
                return Response.json(
                  { error: "Token do Meta Pixel inválido (Conversions API)." },
                  { status: 400 },
                );
              }
              v = normalized;
            }
            if (key === "utmify_api_token" && v) {
              const { normalizeUtmifyApiToken } = await import("@/lib/atelier.server");
              const normalized = normalizeUtmifyApiToken(v);
              if (!normalized) {
                return Response.json(
                  { error: "Token da Utmify inválido (Credencial de API)." },
                  { status: 400 },
                );
              }
              v = normalized;
            }
            await setSetting(key, v);
          }
          return Response.json({ ok: true });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erro ao salvar configurações.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
