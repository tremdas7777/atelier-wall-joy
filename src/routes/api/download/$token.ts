import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/download/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const lib = await import("@/lib/atelier.server");
        const { getOrderByToken, isTokenValid, streamLocalProduct, normalizeProductPlan } = lib;

        const order = await getOrderByToken(params.token);
        if (order && isTokenValid(order)) {
          return streamLocalProduct(normalizeProductPlan(order.plan));
        }

        const plan = normalizeProductPlan(params.token);
        if (plan === "essentiell" || plan === "premium") {
          return streamLocalProduct(plan);
        }

        return new Response("Download nicht verfügbar.", { status: 404 });
      },
    },
  },
});
