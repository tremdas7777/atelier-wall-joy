import { createFileRoute } from "@tanstack/react-router";
import indexHtml from "../../public/index.html?raw";

// The hosted site is the static Atelier Wallpapers build living in public/.
// Serve its index.html directly at "/" so all internal links keep working.
export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { buildLocaleBoot, injectLocaleBoot } = await import("@/lib/locale-boot.server");
        const boot = await buildLocaleBoot(request);
        const html = injectLocaleBoot(indexHtml, boot);
        return new Response(html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "private, no-cache",
          },
        });
      },
    },
  },
});
