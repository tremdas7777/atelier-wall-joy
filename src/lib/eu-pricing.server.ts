/**
 * EU market pricing — fixed EUR base tickets, charged in visitor local currency.
 *
 * Essential = 9,90 € / Premium = 19,90 € (admin settings).
 * Stripe Checkout uses local currency + language; amounts are EUR-equivalent conversions.
 */

import { getAllSettings } from "@/lib/atelier.server";
import { localeHtmlLang, normalizeLangCode } from "@/lib/eu-locale.server";

export type PlanId = "essentiell" | "premium";

export type PlanPrice = {
  /** Amount charged in checkout currency (minor units) */
  cents: number;
  /** Checkout/charge currency */
  currency: string;
  /** Formatted price in checkout currency */
  formatted: string;
  /** Fixed EUR base (990 / 1990) — for reconciliation */
  eurCents: number;
  /** EUR formatted reference */
  eurFormatted: string;
};

export type MarketPricing = {
  country: string | null;
  /** Currency used in Stripe Checkout */
  currency: string;
  locale: string;
  htmlLang: string;
  stripeLocale: string;
  essential: PlanPrice;
  premium: PlanPrice;
};

export const EU_COUNTRY_CURRENCY: Record<string, string> = {
  AD: "EUR",
  AL: "EUR",
  AM: "EUR",
  AT: "EUR",
  AZ: "EUR",
  BA: "EUR",
  BE: "EUR",
  BG: "EUR",
  BY: "EUR",
  CH: "CHF",
  CY: "EUR",
  CZ: "CZK",
  DE: "EUR",
  DK: "DKK",
  EE: "EUR",
  ES: "EUR",
  FI: "EUR",
  FR: "EUR",
  GE: "EUR",
  GR: "EUR",
  HR: "EUR",
  HU: "HUF",
  IE: "EUR",
  IS: "EUR",
  IT: "EUR",
  LI: "CHF",
  LT: "EUR",
  LU: "EUR",
  LV: "EUR",
  MC: "EUR",
  MD: "EUR",
  ME: "EUR",
  MK: "EUR",
  MT: "EUR",
  NL: "EUR",
  NO: "NOK",
  PL: "PLN",
  PT: "EUR",
  RO: "RON",
  RS: "EUR",
  SE: "SEK",
  SI: "EUR",
  SK: "EUR",
  SM: "EUR",
  TR: "TRY",
  UA: "EUR",
  VA: "EUR",
  XK: "EUR",
};

/** 1 EUR → local currency */
const EUR_RATES: Record<string, number> = {
  EUR: 1,
  PLN: 4.28,
  CZK: 25.15,
  SEK: 11.35,
  DKK: 7.46,
  HUF: 395,
  RON: 4.97,
  CHF: 0.94,
  NOK: 11.55,
  TRY: 36.5,
};

const ZERO_DECIMAL = new Set(["HUF"]);

const STRIPE_SUPPORTED = new Set([
  "EUR",
  "PLN",
  "CZK",
  "SEK",
  "DKK",
  "HUF",
  "RON",
  "CHF",
  "NOK",
  "TRY",
]);

const STRIPE_LOCALES: Record<string, string> = {
  de: "de",
  en: "en",
  fr: "fr",
  nl: "nl",
  es: "es",
  it: "it",
  pt: "pt",
  pl: "pl",
  cs: "cs",
  sk: "sk",
  sl: "sl",
  hr: "hr",
  bg: "bg",
  ro: "ro",
  hu: "hu",
  el: "el",
  fi: "fi",
  sv: "sv",
  da: "da",
  no: "nb",
  et: "et",
  lv: "lv",
  lt: "lt",
  uk: "en",
  sr: "en",
  mt: "mt",
  is: "en",
  ca: "es",
};

const LOCALE_FOR_COUNTRY: Record<string, string> = {
  DE: "de-DE",
  AT: "de-AT",
  CH: "de-CH",
  LI: "de-LI",
  FR: "fr-FR",
  BE: "fr-BE",
  NL: "nl-NL",
  ES: "es-ES",
  IT: "it-IT",
  PT: "pt-PT",
  PL: "pl-PL",
  CZ: "cs-CZ",
  SK: "sk-SK",
  HU: "hu-HU",
  RO: "ro-RO",
  BG: "bg-BG",
  HR: "hr-HR",
  SI: "sl-SI",
  SE: "sv-SE",
  DK: "da-DK",
  NO: "nb-NO",
  FI: "fi-FI",
  EE: "et-EE",
  LV: "lv-LV",
  LT: "lt-LT",
  IE: "en-IE",
  GR: "el-GR",
  MT: "en-MT",
  LU: "fr-LU",
  IS: "is-IS",
  UA: "uk-UA",
  RS: "sr-RS",
  TR: "tr-TR",
};

export function resolveCheckoutCurrency(country: string | null | undefined): string {
  const cc = country?.trim().toUpperCase();
  if (!cc) return "EUR";
  const candidate = EU_COUNTRY_CURRENCY[cc] || "EUR";
  return STRIPE_SUPPORTED.has(candidate) ? candidate : "EUR";
}

export function stripeLocaleForLanguage(lang: string | null | undefined): string {
  const code = normalizeLangCode(lang) || "de";
  return STRIPE_LOCALES[code] || "auto";
}

export function intlLocale(country: string | null | undefined, lang: string | null | undefined): string {
  const cc = country?.trim().toUpperCase();
  if (cc && LOCALE_FOR_COUNTRY[cc]) return LOCALE_FOR_COUNTRY[cc];
  return localeHtmlLang(normalizeLangCode(lang) || "de");
}

export function formatMoney(cents: number, currency: string, locale: string): string {
  const zeroDecimal = ZERO_DECIMAL.has(currency);
  const value = zeroDecimal ? cents : cents / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: zeroDecimal ? 0 : 2,
      maximumFractionDigits: zeroDecimal ? 0 : 2,
    }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
}

/** Convert fixed EUR ticket price to local charge amount (minor units) */
export function convertEurCentsToLocal(eurCents: number, currency: string): number {
  if (currency === "EUR") return eurCents;
  const rate = EUR_RATES[currency];
  if (!rate) return eurCents;

  const localAmount = (eurCents / 100) * rate;
  if (ZERO_DECIMAL.has(currency)) return Math.max(1, Math.round(localAmount));
  return Math.max(1, Math.round(localAmount * 100));
}

function buildPlanPrice(
  eurCents: number,
  currency: string,
  locale: string,
): PlanPrice {
  const chargeCents = convertEurCentsToLocal(eurCents, currency);
  return {
    cents: chargeCents,
    currency,
    formatted: formatMoney(chargeCents, currency, locale),
    eurCents,
    eurFormatted: formatMoney(eurCents, "EUR", locale),
  };
}

export async function getMarketPricing(args: {
  country?: string | null;
  language?: string | null;
}): Promise<MarketPricing> {
  const settings = await getAllSettings();
  const essentialEur = Number(settings["essential_price_cents"] || "990");
  const premiumEur = Number(settings["premium_price_cents"] || "1990");
  const country = args.country?.trim().toUpperCase() || null;
  const language = normalizeLangCode(args.language) || "de";
  const currency = resolveCheckoutCurrency(country);
  const locale = intlLocale(country, language);

  return {
    country,
    currency,
    locale,
    htmlLang: localeHtmlLang(language),
    stripeLocale: stripeLocaleForLanguage(language),
    essential: buildPlanPrice(essentialEur, currency, locale),
    premium: buildPlanPrice(premiumEur, currency, locale),
  };
}

export function planPrice(pricing: MarketPricing, plan: PlanId): PlanPrice {
  return plan === "premium" ? pricing.premium : pricing.essential;
}

export function formatPriceLabel(plan: PlanPrice): string {
  if (plan.currency === "EUR") return plan.formatted;
  return `${plan.formatted} (≈ ${plan.eurFormatted})`;
}
