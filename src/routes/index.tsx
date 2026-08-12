import { createFileRoute } from "@tanstack/react-router";
import indexHtml from "../../public/index.html?raw";

// The hosted site is the static Atelier Wallpapers build living in public/.
// Serve its index.html directly at "/" so all internal links keep working.
export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: () =>
        new Response(indexHtml, {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    },
  },
});
