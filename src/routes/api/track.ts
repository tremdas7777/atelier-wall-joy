import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { trackPageView, ipHash } = await import("@/lib/atelier.server");
        let body: { path?: string; referrer?: string } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          /* ignore */
        }
        const pagePath = body.path;
        if (!pagePath) return Response.json({ error: "path required" }, { status: 400 });
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
        await trackPageView({
          path: pagePath,
          referrer: body.referrer,
          userAgent: request.headers.get("user-agent") || undefined,
          ipHash: ip ? ipHash(ip) : undefined,
        });
        return Response.json({ ok: true });
      },
    },
  },
});
