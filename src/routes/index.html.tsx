import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/index/html")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { serveIndexPage } = await import("@/lib/serve-index.server");
        return serveIndexPage(request);
      },
    },
  },
});
