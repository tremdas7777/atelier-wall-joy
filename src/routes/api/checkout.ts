import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const lib = await import("@/lib/atelier.server");
        const {
          newOrderUid,
          newDownloadToken,
          downloadExpiryDate,
          createCheckoutSession,
          planConfig,
          createOrder,
          trackCheckoutEvent,
          isStripeConfigured,
        } = lib;

        let body: { plan?: string; email?: string; name?: string } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          /* ignore */
        }
        const { plan, email, name } = body;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return Response.json(
            { error: "Gültige E-Mail erforderlich." },
            { status: 400 },
          );
        }

        const normalizedPlan = (plan === "premium" ? "premium" : "essentiell") as "essentiell" | "premium";
        const cfg = await planConfig(normalizedPlan);
        const baseUrl = new URL(request.url).origin;
        const orderUid = newOrderUid();

        if (!isStripeConfigured()) {
          return Response.json(
            { error: "Pagamento indisponível no momento." },
            { status: 503 },
          );
        }

        try {
          const session = await createCheckoutSession({
            plan: normalizedPlan,
            email: email.trim().toLowerCase(),
            customerName: (name || "").trim(),
            successUrl: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${baseUrl}/kasse.html?plan=${normalizedPlan}&cancelled=1`,
            orderUid,
          });

          await createOrder({
            order_uid: orderUid,
            email: email.trim().toLowerCase(),
            customer_name: (name || "").trim() || null,
            plan: normalizedPlan,
            amount_cents: cfg.amountCents,
            currency: "eur",
            status: "pending",
            stripe_session_id: session.id,
            download_token: newDownloadToken(),
            download_expires_at: downloadExpiryDate(),
          });

          await trackCheckoutEvent("checkout_created", normalizedPlan, email, {
            order_uid: orderUid,
            session_id: session.id,
          });

          return Response.json({ url: session.url, sessionId: session.id });
        } catch (err) {
          console.error("checkout error:", err);
          return Response.json(
            { error: err instanceof Error ? err.message : "Não foi possível iniciar o pagamento." },
            { status: 500 },
          );
        }
      },
    },
  },
});
