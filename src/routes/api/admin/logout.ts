import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { buildAdminCookieHeader } = await import("@/lib/atelier.server");
        const res = Response.json({ ok: true });
        res.headers.set("set-cookie", buildAdminCookieHeader("", request, 0));
        return res;
      },
    },
  },
});
