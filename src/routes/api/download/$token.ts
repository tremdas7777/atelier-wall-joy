import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/download/$token")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const lib = await import("@/lib/atelier.server");
        const { getOrderByToken, isTokenValid, createDownloadSignedUrl } = lib;

        const order = await getOrderByToken(params.token);
        if (!isTokenValid(order)) {
          return new Response(
            `<!DOCTYPE html><html lang="de"><body style="font-family:sans-serif;background:#111;color:#fff;padding:40px;text-align:center">
            <h1>Link ungültig oder abgelaufen</h1>
            <p>Bitte kontaktiere <a href="mailto:kontakt@atelierwallpapers.de" style="color:#c9a962">kontakt@atelierwallpapers.de</a></p>
            </body></html>`,
            { status: 403, headers: { "content-type": "text/html; charset=utf-8" } },
          );
        }

        try {
          const signedUrl = await createDownloadSignedUrl(order.plan as "essentiell" | "premium", 120);
          return Response.redirect(signedUrl, 302);
        } catch (err) {
          console.error("download error:", err);
          return new Response("Produktdatei vorübergehend nicht verfügbar.", { status: 503 });
        }
      },
    },
  },
});
