import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const lib = await import("@/lib/atelier.server");
        const { constructWebhookEvent, getOrderBySessionId, fulfillPaidOrder, trackCheckoutEvent } = lib;

        const signature = request.headers.get("stripe-signature") || "";
        const rawBody = await request.text();

        let event;
        try {
          event = constructWebhookEvent(rawBody, signature);
        } catch (err) {
          console.error("webhook signature error:", err);
          return new Response(`Webhook Error: ${err instanceof Error ? err.message : "ungültig"}`, {
            status: 400,
          });
        }

        if (event.type === "checkout.session.completed") {
          const obj = event.data.object;
          try {
            await fulfillPaidOrder(
              {
                id: obj.id,
                payment_intent: obj.payment_intent ?? null,
                metadata: obj.metadata ?? null,
              },
              new URL(request.url).origin,
            );
          } catch (err) {
            console.error("webhook fulfill error:", err);
            // still acknowledge to avoid retry storms; log already captured
            await trackCheckoutEvent("webhook_error", null, null, {
              session_id: obj.id,
              error: err instanceof Error ? err.message : "unknown",
            });
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
