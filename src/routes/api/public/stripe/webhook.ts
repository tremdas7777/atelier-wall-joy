import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const lib = await import("@/lib/atelier.server");
        const {
          constructWebhookEvent,
          fulfillPaidOrder,
          trackCheckoutEvent,
          isCheckoutSessionPaid,
          resolveBaseUrl,
        } = lib;

        const signature = request.headers.get("stripe-signature") || "";
        const rawBody = await request.text();

        let event;
        try {
          event = await constructWebhookEvent(rawBody, signature);
        } catch (err) {
          console.error("webhook signature error:", err);
          return new Response(`Webhook Error: ${err instanceof Error ? err.message : "ungültig"}`, {
            status: 400,
          });
        }

        const paidSessionEvents = new Set([
          "checkout.session.completed",
          "checkout.session.async_payment_succeeded",
        ]);

        if (paidSessionEvents.has(event.type)) {
          const obj = event.data.object;
          if (isCheckoutSessionPaid(obj)) {
            try {
              await fulfillPaidOrder(
                {
                  id: obj.id,
                  payment_intent: obj.payment_intent ?? null,
                  metadata: obj.metadata ?? null,
                },
                resolveBaseUrl(request),
              );
            } catch (err) {
              console.error("webhook fulfill error:", err);
              await trackCheckoutEvent("webhook_error", null, null, {
                session_id: obj.id,
                error: err instanceof Error ? err.message : "unknown",
              });
            }
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
