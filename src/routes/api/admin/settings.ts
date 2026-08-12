import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/settings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const lib = await import("@/lib/atelier.server");
          const { isAdminAuthorized, getAllSettings, maskSecret, stripePublishableKey, stripeWebhookSecret } = lib;
          if (!isAdminAuthorized(request)) {
            return Response.json({ error: "Não autenticado." }, { status: 401 });
          }
          const s = await getAllSettings();
          const secretKey = (s["stripe_secret_key"] || process.env["STRIPE_SECRET_KEY"] || "").trim();
          const pubKey = await stripePublishableKey();
          const webhookSecret = await stripeWebhookSecret();
          return Response.json({
            settings: {
              stripe_publishable_key: pubKey ? maskSecret(pubKey, 8) : "",
              stripe_secret_key: secretKey ? "••••••••" : "",
              stripe_webhook_secret: webhookSecret ? "••••••••" : "",
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
            "essential_price_cents",
            "premium_price_cents",
            "store_name",
            "support_email",
          ];
          for (const key of allowed) {
            const value = body[key];
            if (value === undefined) continue;
            const v = String(value).trim();
            if (v.includes("••••") || v === "********") continue;
            if (key.startsWith("stripe_") && v === "") continue;
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
