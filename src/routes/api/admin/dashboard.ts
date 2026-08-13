import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/dashboard")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const lib = await import("@/lib/atelier.server");
        const { isAdminAuthorized, countOrdersByStatus, getAnalytics, getLiveFeed, todayStats, isStripeConfigured, isMetaPixelConfigured, productFileExists } = lib;
        if (!isAdminAuthorized(request)) {
          return Response.json({ error: "Não autenticado." }, { status: 401 });
        }
        const [statusCounts, analytics, live, today] = await Promise.all([
          countOrdersByStatus(),
          getAnalytics(30),
          getLiveFeed(30),
          todayStats(),
        ]);
        return Response.json({
          statusCounts,
          analytics,
          live,
          today,
          stripeConfigured: await isStripeConfigured(),
          metaPixelConfigured: await isMetaPixelConfigured(),
          products: {
            essentiell: await productFileExists("essentiell"),
            premium: await productFileExists("premium"),
          },
        });
      },
    },
  },
});
