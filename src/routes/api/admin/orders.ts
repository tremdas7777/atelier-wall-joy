import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/orders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const lib = await import("@/lib/atelier.server");
        const { isAdminAuthorized, listOrders, sanitizeOrder } = lib;
        if (!isAdminAuthorized(request)) {
          return Response.json({ error: "Não autenticado." }, { status: 401 });
        }
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
        const offset = Number(url.searchParams.get("offset") || 0);
        const orders = (await listOrders(limit, offset)).map((o) => sanitizeOrder(o as never));
        return Response.json({ orders });
      },
    },
  },
});
