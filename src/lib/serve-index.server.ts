import indexHtml from "../../public/index.html?raw";

export async function serveIndexPage(request: Request) {
  const { buildLocaleBoot, injectLocaleBoot } = await import("@/lib/locale-boot.server");
  const boot = await buildLocaleBoot(request);
  const html = injectLocaleBoot(indexHtml, boot);
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-cache",
    },
  });
}
