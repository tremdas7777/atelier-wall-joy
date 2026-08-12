import { detectVisitorLocale, localeHtmlLang } from "@/lib/eu-locale.server";
import { getMarketPricing } from "@/lib/eu-pricing.server";

export type LocaleBootPayload = Awaited<ReturnType<typeof buildLocaleBoot>>;

export async function buildLocaleBoot(request: Request, countryParam?: string | null) {
  const url = new URL(request.url);
  const country = countryParam ?? url.searchParams.get("country");
  const result = detectVisitorLocale(request, country);
  const pricing = await getMarketPricing({
    country: result.country,
    language: result.language,
  });

  return {
    ...result,
    htmlLang: localeHtmlLang(result.language),
    pricing,
  };
}

export function injectLocaleBoot(html: string, boot: LocaleBootPayload): string {
  const safe = JSON.stringify(boot).replace(/</g, "\\u003c");
  const lang = boot.language || "de";
  const injection =
    `<script>window.__ATELIER_BOOT__=${safe};</script>\n` +
    `<link rel="preload" href="assets/locales/${lang}.json" as="fetch" crossorigin="anonymous">\n`;

  if (html.includes("<!--ATELIER_LOCALE_BOOT-->")) {
    return html.replace("<!--ATELIER_LOCALE_BOOT-->", injection);
  }

  return html.replace("</head>", injection + "</head>");
}
