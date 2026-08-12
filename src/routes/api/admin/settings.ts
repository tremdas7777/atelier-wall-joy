import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/settings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const lib = await import("@/lib/atelier.server");
        const { isAdminAuthorized, getAllSettings, maskSecret, isStripeConfigured } = lib;
        if (!isAdminAuthorized(request)) {
          return Response.json({ error: "Não autenticado." }, { status: 401 });
        }
        const s = await getAllSettings();
        const stripeOk = isStripeConfigured();
        return Response.json({
          settings: {
            stripe_publishable_key: stripeOk ? maskSecret(process.env["STRIPE_PUBLISHABLE_KEY"]) : "",
            stripe_secret_key: stripeOk ? "••••••••" : "",
            stripe_webhook_secret: stripeOk ? "••••••••" : "",
            essential_price_cents: s["essential_price_cents"],
            premium_price_cents: s["premium_price_cents"],
            store_name: s["store_name"],
            support_email: s["support_email"],
          },
        });
      },
      PUT: async ({ request }) => {
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
        // Stripe keys are managed via secrets, not the DB. Only editable fields here.
        const allowed = [
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
          await setSetting(key, v);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
