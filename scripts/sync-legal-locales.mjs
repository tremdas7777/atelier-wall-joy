/**
 * Translate legal page blocks from de.json into all EU locale bundles.
 * Run after updating html.legal.* or meta.pageTitle legal keys in de.json.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, "../public/assets/locales");
const MASTER_PATH = path.join(LOCALES_DIR, "de.json");
const CONCURRENCY = 6;

const TARGET_LANGS = [
  "en", "nl", "fr", "bg", "hr", "da", "sk", "sl", "es", "et", "fi", "el", "hu",
  "is", "it", "lv", "lt", "mt", "no", "pl", "pt", "cs", "ro", "sr", "sv", "uk", "ca",
];

const LEGAL_HTML_KEYS = [
  "legal.agb",
  "legal.datenschutz",
  "legal.impressum",
  "legal.widerruf",
];

const LEGAL_TITLE_KEYS = ["agb", "datenschutz", "impressum", "widerruf"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translateOne(text, target) {
  const PH = /\{\{[\w.]+\}\}/g;
  const BR = /\[([^\]]+)\]/g;
  const tokens = [];
  let safe = text.replace(PH, (m) => {
    tokens.push({ type: "ph", value: m });
    return `__T${tokens.length - 1}__`;
  });
  safe = safe.replace(BR, (m) => {
    tokens.push({ type: "br", value: m });
    return `__T${tokens.length - 1}__`;
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
    out = out.replace(`__T${i}__`, tok.value);
  });
  return out;
}

async function translateStrings(strings, target) {
  const map = new Map();
  let i = 0;

  async function worker() {
    while (i < strings.length) {
      const idx = i++;
      const src = strings[idx];
      try {
        map.set(src, await translateOne(src, target));
      } catch {
        map.set(src, src);
      }
      await sleep(60);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return map;
}

async function patchLang(master, lang, force) {
  const file = path.join(LOCALES_DIR, `${lang}.json`);
  const bundle = JSON.parse(fs.readFileSync(file, "utf8"));
  bundle.html = bundle.html || {};
  bundle.meta = bundle.meta || {};
  bundle.meta.pageTitle = bundle.meta.pageTitle || {};

  const toTranslate = [];
  for (const key of LEGAL_HTML_KEYS) {
    const src = master.html[key];
    if (!src) continue;
    if (force || bundle.html[key] !== src) toTranslate.push(src);
  }
  for (const key of LEGAL_TITLE_KEYS) {
    const src = master.meta.pageTitle[key];
    if (!src) continue;
    if (force || bundle.meta.pageTitle[key] !== src) toTranslate.push(src);
  }

  const unique = [...new Set(toTranslate)];
  if (!unique.length) {
    console.log(`  ${lang}: up to date`);
    return;
  }

  console.log(`  ${lang}: translating ${unique.length} legal strings…`);
  const map = await translateStrings(unique, lang);

  for (const key of LEGAL_HTML_KEYS) {
    const src = master.html[key];
    if (src && map.has(src)) bundle.html[key] = map.get(src);
  }
  for (const key of LEGAL_TITLE_KEYS) {
    const src = master.meta.pageTitle[key];
    if (src && map.has(src)) bundle.meta.pageTitle[key] = map.get(src);
  }

  fs.writeFileSync(file, JSON.stringify(bundle, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.filter((a) => a !== "--force");
  const langs = only.length ? only : TARGET_LANGS;
  const master = JSON.parse(fs.readFileSync(MASTER_PATH, "utf8"));

  for (const key of LEGAL_HTML_KEYS) {
    if (!master.html?.[key]) {
      console.error(`Missing master html.${key} in de.json — run npm run legal:extract first`);
      process.exit(1);
    }
  }

  for (const lang of langs) await patchLang(master, lang, force);
  console.log("Legal locale sync complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
