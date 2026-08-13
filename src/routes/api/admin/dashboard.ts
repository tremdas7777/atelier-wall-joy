import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/dashboard")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const lib = await import("@/lib/atelier.server");
        const { isAdminAuthorized, countOrdersByStatus, getAnalytics, getLiveFeed, getFunnelStats, todayStats, isStripeConfigured, isMetaPixelConfigured, isUtmifyConfigured, productFileExists } = lib;
        if (!isAdminAuthorized(request)) {
          return Response.json({ error: "Não autenticado." }, { status: 401 });
        }
        const [statusCounts, analytics, live, today, funnel, funnelToday] = await Promise.all([
          countOrdersByStatus(),
          getAnalytics(30),
          getLiveFeed(30),
          todayStats(),
          getFunnelStats(30),
          getFunnelStats(1),
        ]);
        return Response.json({
          statusCounts,
          analytics,
          live,
          today,
          funnel,
          funnelToday,
          stripeConfigured: await isStripeConfigured(),
          metaPixelConfigured: await isMetaPixelConfigured(),
          utmifyConfigured: await isUtmifyConfigured(),
          products: {
            essentiell: await productFileExists("essentiell"),
            premium: await productFileExists("premium"),
          },
        });
      },
    },
  },
});
