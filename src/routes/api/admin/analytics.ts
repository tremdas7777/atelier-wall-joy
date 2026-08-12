import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/analytics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const lib = await import("@/lib/atelier.server");
        const { isAdminAuthorized, getAnalytics } = lib;
        if (!isAdminAuthorized(request)) {
          return Response.json({ error: "Não autenticado." }, { status: 401 });
        }
        const days = Math.min(Number(new URL(request.url).searchParams.get("days") || 30), 365);
        return Response.json(await getAnalytics(days));
      },
    },
  },
});
