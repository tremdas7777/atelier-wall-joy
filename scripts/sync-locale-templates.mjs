/**
 * Ensure pricing template keys contain required {{placeholders}} from de.json.
 * Does not overwrite translated prose — only fixes keys still missing placeholders.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, "../public/assets/locales");

const KEYS = [
  "hero.cta",
  "sticky.price",
  "checkout.heading",
  "checkout.paySecure",
  "checkout.total",
  "help.p.currency",
];

const REQUIRED = {
  "hero.cta": ["{{price.essential}}"],
  "sticky.price": ["{{price.essential}}"],
  "checkout.heading": ["{{currency}}"],
  "checkout.paySecure": ["{{currency}}"],
  "checkout.total": ["{{currency}}"],
  "help.p.currency": ["{{currency}}", "{{price.essential}}", "{{price.premium}}"],
};

/** Minimal correct templates per language (fallback when auto-fix fails) */
const FALLBACK = {
  en: {
    "checkout.heading": "Secure payment in {{currency}}",
    "checkout.paySecure": "100% secure payment · Stripe · Card, PayPal, Klarna · {{currency}}",
    "checkout.total": "Total ({{currency}})",
    "help.p.currency":
      "Stripe Checkout charges in your local currency ({{currency}}) at the fixed EUR equivalent: Essential {{price.essential}}, Premium {{price.premium}}. One-time payment, no subscription.",
  },
  nl: {
    "checkout.heading": "Veilig betalen in {{currency}}",
    "checkout.paySecure": "100% veilige betaling · Stripe · Kaart, PayPal, Klarna · {{currency}}",
    "checkout.total": "Totaal ({{currency}})",
    "help.p.currency":
      "Bij Stripe Checkout betaal je in je lokale valuta ({{currency}}) tegen de vaste EUR-prijs: Essential {{price.essential}}, Premium {{price.premium}}. Eenmalige betaling, geen abonnement.",
    "hero.cta": "IK WIL DE COLLECTIE VOOR {{price.essential}}",
    "sticky.price": "+100 Achtergronden 4K · {{price.essential}}",
  },
};

function needsFix(value, placeholders) {
  if (!value) return true;
  return placeholders.some((ph) => !value.includes(ph));
}

const master = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, "de.json"), "utf8"));

for (const file of fs.readdirSync(LOCALES_DIR)) {
  if (!file.endsWith(".json") || file === "manifest.json" || file === "de.json") continue;
  const lang = file.replace(".json", "");
  const p = path.join(LOCALES_DIR, file);
  const bundle = JSON.parse(fs.readFileSync(p, "utf8"));
  let changed = false;

  for (const key of KEYS) {
    const cur = bundle.t?.[key];
    const req = REQUIRED[key];
    if (!needsFix(cur, req)) continue;

    const fallback = FALLBACK[lang]?.[key] || FALLBACK.en[key] || master.t[key];
    bundle.t[key] = fallback;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(p, JSON.stringify(bundle, null, 2));
    console.log("fixed", file);
  }
}

console.log("template fix complete");
