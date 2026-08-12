import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyAdminPassword, signSession, buildAdminCookieHeader } = await import(
          "@/lib/atelier.server"
        );
        let body: { password?: string } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          /* ignore */
        }
        const ok = await verifyAdminPassword(body.password || "");
        if (!ok) return Response.json({ error: "Senha incorreta." }, { status: 401 });

        const token = signSession();
        const res = Response.json({ ok: true });
        res.headers.set("set-cookie", buildAdminCookieHeader(token, request));
        return res;
      },
    },
  },
});
