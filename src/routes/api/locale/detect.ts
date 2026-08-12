import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/locale/detect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { detectVisitorLocale, localeHtmlLang } = await import("@/lib/eu-locale.server");
        const { getMarketPricing } = await import("@/lib/eu-pricing.server");
        const url = new URL(request.url);
        const countryParam = url.searchParams.get("country");
        const languageParam = url.searchParams.get("language");
        let result = detectVisitorLocale(request, countryParam);
        if (languageParam) {
          const { normalizeLangCode } = await import("@/lib/eu-locale.server");
          const override = normalizeLangCode(languageParam);
          if (override) result = { ...result, language: override };
        }
        const pricing = await getMarketPricing({
          country: result.country,
          language: result.language,
        });

        return Response.json(
          {
            ...result,
            htmlLang: localeHtmlLang(result.language),
            pricing,
          },
          {
            headers: { "Cache-Control": "private, max-age=300" },
          },
        );
      },
    },
  },
});
