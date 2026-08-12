import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/upload-product")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const lib = await import("@/lib/atelier.server");
        const { isAdminAuthorized, uploadProduct } = lib;
        if (!isAdminAuthorized(request)) {
          return Response.json({ error: "Não autenticado." }, { status: 401 });
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json({ error: "Falha no upload." }, { status: 400 });
        }
        const plan = String(form.get("plan") || "");
        const file = form.get("file");
        if (plan !== "essentiell" && plan !== "premium") {
          return Response.json({ error: "Plano inválido." }, { status: 400 });
        }
        if (!(file instanceof File)) {
          return Response.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
        }
        if (!file.name.toLowerCase().endsWith(".zip")) {
          return Response.json({ error: "Envie apenas arquivos .zip" }, { status: 400 });
        }

        try {
          const product = await uploadProduct(plan, await file.arrayBuffer(), file.type || "application/zip");
          return Response.json({ ok: true, product });
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "Falha no upload." },
            { status: 400 },
          );
        }
      },
    },
  },
});
