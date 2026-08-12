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
          buildStatusFromStripeSession,
          isStripeConfigured,
          isCheckoutSessionPaid,
          resolveBaseUrl,
        } = lib;

        const sessionId = new URL(request.url).searchParams.get("session_id");
        if (!sessionId) return Response.json({ error: "session_id required" }, { status: 400 });

        const baseUrl = resolveBaseUrl(request);

        if (await isStripeConfigured()) {
          const session = await retrieveCheckoutSession(String(sessionId));
          if (session && isCheckoutSessionPaid(session)) {
            let order = await getOrderBySessionId(String(sessionId));
            if (!order) {
              return Response.json(await buildStatusFromStripeSession(session));
            }
            if (order.status !== "paid") {
              try {
                order = await fulfillPaidOrder(
                  {
                    id: session.id,
                    payment_intent: session.payment_intent ?? null,
                    metadata: session.metadata ?? null,
                    customer_email: session.customer_email ?? null,
                    client_reference_id: session.client_reference_id ?? null,
                  },
                  baseUrl,
                );
              } catch (err) {
                console.error("fulfill error:", err);
                order = await getOrderBySessionId(String(sessionId));
                if (!order || order.status !== "paid") {
                  return Response.json(await buildStatusFromStripeSession(session));
                }
              }
            }
            return Response.json(await buildOrderStatusWithDelivery(order, baseUrl));
          }
        }

        const order = await getOrderBySessionId(String(sessionId));
        if (!order) return Response.json({ error: "Bestellung nicht gefunden." }, { status: 404 });
        return Response.json(await buildOrderStatusWithDelivery(order, baseUrl));
      },
    },
  },
});
