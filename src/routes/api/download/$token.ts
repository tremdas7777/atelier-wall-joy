import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/download/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const lib = await import("@/lib/atelier.server");
        const { DELIVERY_URL } = lib;
        void params;
        // Lieferung erfolgt über den Google-Drive-Ordner.
        return Response.redirect(DELIVERY_URL, 302);
      },
    },
  },
});
