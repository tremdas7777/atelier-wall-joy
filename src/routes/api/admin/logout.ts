import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/logout")({
  server: {
    handlers: {
      POST: async () => {
        const { getAdminCookieName } = await import("@/lib/atelier.server");
        const res = Response.json({ ok: true });
        res.headers.set(
          "set-cookie",
          `${getAdminCookieName()}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
        );
        return res;
      },
    },
  },
});
