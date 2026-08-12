/**
 * Sync legal page <main> content from HTML into de.json master bundle.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DE_PATH = path.join(ROOT, "public/assets/locales/de.json");

const PAGES = [
  { file: "agb.html", key: "agb", title: "AGB — Atelier Wallpapers" },
  { file: "datenschutz.html", key: "datenschutz", title: "Datenschutz — Atelier Wallpapers" },
  { file: "impressum.html", key: "impressum", title: "Impressum — Atelier Wallpapers" },
  { file: "widerruf.html", key: "widerruf", title: "Widerrufsbelehrung — Atelier Wallpapers" },
];

const de = JSON.parse(fs.readFileSync(DE_PATH, "utf8"));
de.html = de.html || {};
de.meta = de.meta || {};
de.meta.pageTitle = de.meta.pageTitle || {};

for (const page of PAGES) {
  const html = fs.readFileSync(path.join(ROOT, "public", page.file), "utf8");
  const match = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  if (!match) {
    console.error(`No <main> in ${page.file}`);
    process.exit(1);
  }
  de.html[`legal.${page.key}`] = match[1].trim();
  de.meta.pageTitle[page.key] = page.title;
}

fs.writeFileSync(DE_PATH, JSON.stringify(de, null, 2));
console.log("Updated de.json with legal.* html blocks and page titles.");
