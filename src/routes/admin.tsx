import { createFileRoute } from "@tanstack/react-router";
import adminHtml from "../../public/admin/index.html?raw";

// Serve the static admin panel (public/admin/index.html) at /admin.
export const Route = createFileRoute("/admin")({
  server: {
    handlers: {
      GET: () =>
        new Response(adminHtml, {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    },
  },
});