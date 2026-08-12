#!/usr/bin/env node
/**
 * Render localized Instagram-style customer screenshots.
 * Requires: npm i -D playwright && npx playwright install chromium
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, "social/slides-data.json"), "utf8"));
const TEMPLATE = fs.readFileSync(path.join(__dirname, "social/template.html"), "utf8");
const OUT_DIR = path.join(ROOT, "public/assets/social");
const PHOTOS_DIR = path.join(OUT_DIR, "photos");

const LANGS = process.argv.slice(2).length ? process.argv.slice(2) : ["en", "fr", "es", "it", "nl", "pl"];

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMessages(lang, slide) {
  const msgs = slide.messages[lang] || slide.messages.en;
  return msgs
    .map((m) => {
      if (m.photo) {
        const src = path.basename(DATA.photos[m.photo]);
        return `<div class="photo"><img src="file://${path.join(PHOTOS_DIR, src)}" alt=""/></div>`;
      }
      const cls = m.from === "me" ? "me" : "them";
      return `<div class="bubble ${cls}">${escapeHtml(m.text)}</div>`;
    })
    .join("");
}

function buildHtml(lang, slide) {
  const ui = DATA.ui[lang] || DATA.ui.en;
  const [followers, posts] = String(slide.stats).split("·").map((s) => s.trim());
  return TEMPLATE.replace(/\{\{LANG\}\}/g, lang)
    .replace("{{STATS}}", `${followers}`)
    .replace("{{FOLLOWERS}}", ui.followers)
    .replace("{{POSTS}}", ui.posts)
    .replace("{{NO_FOLLOW}}", escapeHtml(ui.noFollow))
    .replace("{{VIEW_PROFILE}}", escapeHtml(ui.viewProfile))
    .replace("{{MESSAGE_PH}}", escapeHtml(ui.message))
    .replace("{{MESSAGES}}", renderMessages(lang, slide));
}

async function main() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();

  fs.mkdirSync(PHOTOS_DIR, { recursive: true });

  for (const lang of LANGS) {
    const dir = path.join(OUT_DIR, lang);
    fs.mkdirSync(dir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 610, height: 1298 } });

    for (const slide of DATA.slides) {
      const html = buildHtml(lang, slide);
      const tmp = path.join(OUT_DIR, `_tmp-${lang}-${slide.id}.html`);
      fs.writeFileSync(tmp, html);
      await page.goto("file://" + tmp);
      await page.waitForTimeout(150);
      await page.screenshot({
        path: path.join(dir, `${slide.id}.webp`),
        type: "webp",
        quality: 88,
      });
      fs.unlinkSync(tmp);
      process.stdout.write(`  ${lang}/${slide.id}.webp\n`);
    }
    await page.close();
  }

  await browser.close();
  console.log("Social screenshots rendered.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
