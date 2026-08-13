import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { trackPageView, trackCheckoutEvent, ipHash } = await import(
          "@/lib/atelier.server"
        );
        const funnelEvents = new Set(["landing_view", "add_to_cart", "checkout_view"]);
        let body: { path?: string; referrer?: string; event?: string; plan?: string } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          /* ignore */
        }

        if (body.event) {
          if (!funnelEvents.has(body.event)) {
            return Response.json({ error: "invalid event" }, { status: 400 });
          }
          const plan =
            body.plan === "premium" ? "premium" : body.plan === "essentiell" ? "essentiell" : null;
          await trackCheckoutEvent(body.event, plan, null, {
            path: body.path || null,
            referrer: body.referrer || null,
          });
          return Response.json({ ok: true });
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
