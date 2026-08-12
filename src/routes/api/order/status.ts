import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/order/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const lib = await import("@/lib/atelier.server");
        const {
          getOrderBySessionId,
          retrieveCheckoutSession,
          fulfillPaidOrder,
          buildOrderStatusWithDelivery,
          isStripeConfigured,
          isCheckoutSessionPaid,
          resolveBaseUrl,
        } = lib;

        const sessionId = new URL(request.url).searchParams.get("session_id");
        if (!sessionId) return Response.json({ error: "session_id required" }, { status: 400 });

        const baseUrl = resolveBaseUrl(request);
        let order = await getOrderBySessionId(String(sessionId));

        if (await isStripeConfigured()) {
          const session = await retrieveCheckoutSession(String(sessionId));
          if (session && isCheckoutSessionPaid(session)) {
            if (!order) {
              return Response.json({ error: "Bestellung nicht gefunden." }, { status: 404 });
            }
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
                order = await getOrderBySessionId(String(sessionId));
                if (!order || order.status !== "paid") {
                  return Response.json(
                    { error: err instanceof Error ? err.message : "Erfüllung fehlgeschlagen." },
                    { status: 500 },
                  );
                }
              }
            }
            return Response.json(await buildOrderStatusWithDelivery(order, baseUrl));
          }
        }

        if (!order) return Response.json({ error: "Bestellung nicht gefunden." }, { status: 404 });
        return Response.json(await buildOrderStatusWithDelivery(order, baseUrl));
      },
    },
  },
});
