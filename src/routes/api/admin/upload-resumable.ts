import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/upload-resumable")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const lib = await import("@/lib/atelier.server");
        const { isAdminAuthorized, createSignedUploadToken, normalizeProductPlan } = lib;
        if (!isAdminAuthorized(request)) {
          return Response.json({ error: "Não autenticado." }, { status: 401 });
        }

        let body: { plan?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Payload inválido." }, { status: 400 });
        }

        const plan = normalizeProductPlan(body.plan);
        try {
          const result = await createSignedUploadToken(plan);
          return Response.json({ ok: true, ...result });
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "Falha ao iniciar upload." },
            { status: 500 },
          );
        }
      },
    },
  },
});
