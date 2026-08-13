/* ============================================================
 * EU geo-localization — country → language (UK excluded)
 * ============================================================ */

export const DEFAULT_LANG = "de";
export const FALLBACK_LANG = "en";

/** Active sales market (expand when launching in more countries) */
export const ALLOWED_COUNTRIES = new Set(["DE"]);

/** ISO 3166-1 alpha-2 codes excluded from the market */
export const BLOCKED_COUNTRIES = new Set(["GB", "UK"]);

export function isAllowedMarketCountry(country: string | null | undefined): boolean {
  if (!country) return true;
  const cc = country.trim().toUpperCase();
  if (BLOCKED_COUNTRIES.has(cc)) return false;
  return ALLOWED_COUNTRIES.has(cc);
}

/**
 * Official / primary languages per target country (priority order).
 * Multi-lingual countries list candidates; Accept-Language picks the best match.
 */
export const EU_COUNTRY_LANGUAGES: Record<string, readonly string[]> = {
  DE: ["de"],
  AT: ["de"],
  LI: ["de"],
  BE: ["nl", "fr", "de"],
  BG: ["bg"],
  HR: ["hr"],
  DK: ["da"],
  SK: ["sk"],
  SI: ["sl"],
  ES: ["es"],
  EE: ["et"],
  FI: ["fi"],
  FR: ["fr"],
  GR: ["el"],
  HU: ["hu"],
  IE: ["en"],
  IS: ["is"],
  IT: ["it"],
  LV: ["lv"],
  LT: ["lt"],
  LU: ["fr", "de", "lb"],
  MT: ["mt", "en"],
  MC: ["fr"],
  ME: ["sr"],
  NO: ["no"],
  NL: ["nl"],
  PL: ["pl"],
  PT: ["pt"],
  CZ: ["cs"],
  RO: ["ro"],
  SM: ["it"],
  RS: ["sr"],
  SE: ["sv"],
  CH: ["de", "fr", "it", "rm"],
  UA: ["uk"],
  VA: ["it"],
  AL: ["sq", "en"],
  AM: ["hy", "en"],
  AZ: ["az", "en"],
  BA: ["bs", "hr", "sr"],
  BY: ["be", "ru", "en"],
  GE: ["ka", "en"],
  MD: ["ro", "en"],
  MK: ["mk", "en"],
  TR: ["tr", "en"],
  XK: ["sq", "sr", "en"],
  AD: ["ca", "es"],
  CY: ["el", "en"],
};

/** Languages we ship UI bundles for (lb/rm fall back to fr/de/it at runtime) */
export const SUPPORTED_LANGS = new Set([
  "de",
  "en",
  "nl",
  "fr",
  "bg",
  "hr",
  "da",
  "sk",
  "sl",
  "es",
  "et",
  "fi",
  "el",
  "hu",
  "is",
  "it",
  "lv",
  "lt",
  "mt",
  "no",
  "pl",
  "pt",
  "cs",
  "ro",
  "sr",
  "sv",
  "uk",
  "ca",
]);

const LANG_ALIASES: Record<string, string> = {
  lb: "fr",
  rm: "it",
  cnr: "sr",
  mo: "ro",
};

export function normalizeLangCode(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const base = raw.trim().toLowerCase().split("-")[0]?.split("_")[0];
  if (!base) return null;
  if (LANG_ALIASES[base]) return LANG_ALIASES[base];
  if (SUPPORTED_LANGS.has(base)) return base;
  return null;
}

export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [tag, qPart] = part.trim().split(";q=");
      const q = qPart ? Number(qPart) : 1;
      const lang = normalizeLangCode(tag);
      return lang ? { lang, q: Number.isFinite(q) ? q : 0 } : null;
    })
    .filter((x): x is { lang: string; q: number } => x !== null)
    .sort((a, b) => b.q - a.q)
    .map((x) => x.lang);
}

export function detectCountryFromRequest(request: Request): string | null {
  const headers = request.headers;
  const candidates = [
    headers.get("cf-ipcountry"),
    headers.get("x-vercel-ip-country"),
    headers.get("x-country-code"),
    headers.get("cloudfront-viewer-country"),
  ];
  for (const c of candidates) {
    if (!c) continue;
    const code = c.trim().toUpperCase();
    if (code.length === 2 && code !== "XX" && code !== "T1") return code;
  }
  return null;
}

export function countryFromAcceptLanguage(header: string | null | undefined): string | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const tag = part.trim().split(";")[0] ?? "";
    const region = tag.split("-")[1]?.toUpperCase();
    if (region && region.length === 2 && EU_COUNTRY_LANGUAGES[region]) return region;
  }
  return null;
}

export function resolveLanguageForCountry(
  country: string | null,
  acceptLanguage: string | null | undefined,
): string {
  const prefs = parseAcceptLanguage(acceptLanguage);
  const candidates = country ? EU_COUNTRY_LANGUAGES[country.toUpperCase()] : null;

  if (candidates?.length) {
    for (const pref of prefs) {
      if (candidates.includes(pref)) return pref;
      const aliased = LANG_ALIASES[pref];
      if (aliased && candidates.includes(aliased)) return aliased;
    }
    for (const candidate of candidates) {
      const normalized = normalizeLangCode(candidate);
      if (normalized) return normalized;
    }
    return FALLBACK_LANG;
  }

  for (const pref of prefs) {
    if (SUPPORTED_LANGS.has(pref)) return pref;
  }

  return DEFAULT_LANG;
}

export type LocaleDetectResult = {
  country: string | null;
  language: string;
  blocked: boolean;
  source: "geo" | "accept-language" | "default";
};

export function detectVisitorLocale(
  request: Request,
  countryOverride?: string | null,
): LocaleDetectResult {
  const accept = request.headers.get("accept-language");
  let country =
    countryOverride?.trim().toUpperCase() || detectCountryFromRequest(request);
  let source: LocaleDetectResult["source"] = country
    ? countryOverride
      ? "geo"
      : "geo"
    : "default";

  if (!country) {
    country = countryFromAcceptLanguage(accept);
    if (country) source = "accept-language";
  }

  const detectedCountry = country?.toUpperCase() || null;
  if (detectedCountry && !isAllowedMarketCountry(detectedCountry)) {
    return { country: detectedCountry, language: DEFAULT_LANG, blocked: true, source };
  }

  const language = resolveLanguageForCountry("DE", accept);
  return { country: "DE", language, blocked: false, source };
}

export function localeHtmlLang(lang: string): string {
  const map: Record<string, string> = {
    de: "de-DE",
    en: "en-IE",
    fr: "fr-FR",
    nl: "nl-NL",
    es: "es-ES",
    it: "it-IT",
    pt: "pt-PT",
    pl: "pl-PL",
    cs: "cs-CZ",
    sk: "sk-SK",
    sl: "sl-SI",
    hr: "hr-HR",
    bg: "bg-BG",
    ro: "ro-RO",
    hu: "hu-HU",
    el: "el-GR",
    fi: "fi-FI",
    sv: "sv-SE",
    da: "da-DK",
    no: "no-NO",
    et: "et-EE",
    lv: "lv-LV",
    lt: "lt-LT",
    uk: "uk-UA",
    sr: "sr-RS",
    mt: "mt-MT",
    is: "is-IS",
    ca: "ca-AD",
  };
  return map[lang] || lang;
}
