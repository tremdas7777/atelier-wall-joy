/**
 * Build EU locale JSON files from German master (de.json).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, "../public/assets/locales");
const MASTER = path.join(LOCALES_DIR, "de.json");
const CONCURRENCY = 8;

const TARGET_LANGS = [
  "en", "nl", "fr", "bg", "hr", "da", "sk", "sl", "es", "et", "fi", "el", "hu",
  "is", "it", "lv", "lt", "mt", "no", "pl", "pt", "cs", "ro", "sr", "sv", "uk", "ca",
];

const HTML_LANG = {
  de: "de-DE", en: "en-IE", fr: "fr-FR", nl: "nl-NL", es: "es-ES", it: "it-IT",
  pt: "pt-PT", pl: "pl-PL", cs: "cs-CZ", sk: "sk-SK", sl: "sl-SI", hr: "hr-HR",
  bg: "bg-BG", ro: "ro-RO", hu: "hu-HU", el: "el-GR", fi: "fi-FI", sv: "sv-SE",
  da: "da-DK", no: "no-NO", et: "et-EE", lv: "lv-LV", lt: "lt-LT", uk: "uk-UA",
  sr: "sr-RS", mt: "mt-MT", is: "is-IS", ca: "ca-AD",
};

const OG_LOCALE = {
  de: "de_DE", en: "en_IE", fr: "fr_FR", nl: "nl_NL", es: "es_ES", it: "it_IT",
  pt: "pt_PT", pl: "pl_PL", cs: "cs_CZ", sk: "sk_SK", sl: "sl_SI", hr: "hr_HR",
  bg: "bg_BG", ro: "ro_RO", hu: "hu_HU", el: "el_GR", fi: "fi_FI", sv: "sv_SE",
  da: "da_DK", no: "no_NO", et: "et_EE", lv: "lv_LV", lt: "lt_LT", uk: "uk_UA",
  sr: "sr_RS", mt: "mt_MT", is: "is_IS", ca: "ca_AD",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function collectStrings(obj, out = []) {
  if (typeof obj === "string") {
    out.push(obj);
    return out;
  }
  if (Array.isArray(obj)) obj.forEach((v) => collectStrings(v, out));
  else if (obj && typeof obj === "object") Object.values(obj).forEach((v) => collectStrings(v, out));
  return out;
}

function applyTranslations(obj, map) {
  if (typeof obj === "string") return map.get(obj) ?? obj;
  if (Array.isArray(obj)) return obj.map((v) => applyTranslations(v, map));
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = applyTranslations(v, map);
    return out;
  }
  return obj;
}

async function translateOne(text, target) {
  const PH = /\{\{[\w.]+\}\}/g;
  const tokens = [];
  const safe = text.replace(PH, (m) => {
    tokens.push(m);
    return `__PH${tokens.length - 1}__`;
  });

  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=de&tl=" +
    encodeURIComponent(target) +
    "&dt=t&q=" +
    encodeURIComponent(safe);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`translate ${target} failed: ${res.status}`);
  const data = await res.json();
  let out = data[0].map((part) => part[0]).join("");
  tokens.forEach((tok, i) => {
    out = out.replace(`__PH${i}__`, tok);
  });
  return out;
}

async function translateAllStrings(strings, target) {
  const unique = [...new Set(strings)];
  const map = new Map();
  let index = 0;

  async function worker() {
    while (index < unique.length) {
      const i = index++;
      const src = unique[i];
      try {
        map.set(src, await translateOne(src, target));
      } catch {
        map.set(src, src);
      }
      if (i % 10 === 0) process.stdout.write(`  ${target}: ${i + 1}/${unique.length}\r`);
      await sleep(40);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`  ${target}: ${unique.length} strings translated`);
  return map;
}

async function buildLang(master, lang, force) {
  const existing = path.join(LOCALES_DIR, `${lang}.json`);
  if (lang === "de") return master;
  if (!force && fs.existsSync(existing)) {
    console.log(`Skipping ${lang} (already exists)`);
    return JSON.parse(fs.readFileSync(existing, "utf8"));
  }

  console.log(`Translating → ${lang}…`);
  const map = await translateAllStrings(collectStrings(master), lang);
  const bundle = applyTranslations(JSON.parse(JSON.stringify(master)), map);
  bundle.meta = bundle.meta || {};
  bundle.meta.htmlLang = HTML_LANG[lang] || lang;
  bundle.meta.locale = OG_LOCALE[lang] || lang;
  fs.writeFileSync(existing, JSON.stringify(bundle, null, 2));
  return bundle;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.filter((a) => a !== "--force");
  const langs = only.length ? only : TARGET_LANGS;
  const master = JSON.parse(fs.readFileSync(MASTER, "utf8"));

  fs.writeFileSync(path.join(LOCALES_DIR, "de.json"), JSON.stringify(master, null, 2));
  for (const lang of langs) await buildLang(master, lang, force);

  fs.writeFileSync(
    path.join(LOCALES_DIR, "manifest.json"),
    JSON.stringify({ version: 1, defaultLang: "de", fallbackLang: "en", languages: ["de", ...TARGET_LANGS] }, null, 2),
  );
  console.log("Locale build complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
