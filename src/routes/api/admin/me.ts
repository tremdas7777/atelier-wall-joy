import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { isAdminAuthorized } = await import("@/lib/atelier.server");
        if (!isAdminAuthorized(request)) {
          return Response.json({ error: "Não autenticado." }, { status: 401 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
