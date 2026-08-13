import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/live")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const lib = await import("@/lib/atelier.server");
        const { isAdminAuthorized, getLiveFeed, getFunnelStats } = lib;
        if (!isAdminAuthorized(request)) {
          return Response.json({ error: "Não autenticado." }, { status: 401 });
        }
        const limit = Number(new URL(request.url).searchParams.get("limit") || 40);
        const [feed, funnel] = await Promise.all([getLiveFeed(limit), getFunnelStats(7)]);
        return Response.json({ feed, funnel });
      },
    },
  },
});
