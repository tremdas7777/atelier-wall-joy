import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/marketing/config")({
  server: {
    handlers: {
      GET: async () => {
        const { metaPixelConfig } = await import("@/lib/atelier.server");
        const cfg = await metaPixelConfig();
        return Response.json(
          { pixelId: cfg.pixelId, enabled: cfg.enabled },
          {
            headers: { "Cache-Control": "public, max-age=60" },
          },
        );
      },
    },
  },
});
