import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/order/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const lib = await import("@/lib/atelier.server");
        const { getOrderBySessionId, retrieveCheckoutSession, fulfillPaidOrder, buildOrderStatus, isStripeConfigured } = lib;

        const sessionId = new URL(request.url).searchParams.get("session_id");
        if (!sessionId) return Response.json({ error: "session_id required" }, { status: 400 });

        const baseUrl = new URL(request.url).origin;
        let order = await getOrderBySessionId(String(sessionId));

        if (isStripeConfigured()) {
          const session = await retrieveCheckoutSession(String(sessionId));
          if (session && session.payment_status === "paid") {
            if (!order) return Response.json({ error: "Bestellung nicht gefunden." }, { status: 404 });
            if (order.status !== "paid") {
              try {
                order = await fulfillPaidOrder(
                  {
                    id: session.id,
                    payment_intent: session.payment_intent ?? null,
                    metadata: session.metadata ?? null,
                  },
                  baseUrl,
                );
              } catch (err) {
                console.error("fulfill error:", err);
                return Response.json(
                  { error: err instanceof Error ? err.message : "Erfüllung fehlgeschlagen." },
                  { status: 500 },
                );
              }
            }
            return Response.json(buildOrderStatus(order, baseUrl));
          }
        }

        if (!order) return Response.json({ error: "Bestellung nicht gefunden." }, { status: 404 });
        return Response.json(buildOrderStatus(order, baseUrl));
      },
    },
  },
});
