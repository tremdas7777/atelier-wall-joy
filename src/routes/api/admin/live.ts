import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/live")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const lib = await import("@/lib/atelier.server");
        const { isAdminAuthorized, getLiveFeed } = lib;
        if (!isAdminAuthorized(request)) {
          return Response.json({ error: "Não autenticado." }, { status: 401 });
        }
        const limit = Number(new URL(request.url).searchParams.get("limit") || 40);
        return Response.json({ feed: await getLiveFeed(limit) });
      },
    },
  },
});
