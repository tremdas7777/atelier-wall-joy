import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/products")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const lib = await import("@/lib/atelier.server");
        const { isAdminAuthorized, listProductsInfo } = lib;
        if (!isAdminAuthorized(request)) {
          return Response.json({ error: "Não autenticado." }, { status: 401 });
        }
        const products = await listProductsInfo();
        return Response.json({ products });
      },
    },
  },
});
