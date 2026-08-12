(function () {
  "use strict";

  var STORAGE_KEY = "atelier-lang";
  var DEFAULT_LANG = "de";

  var T = {
    de: {
      "nav.gallery": "Galerie",
      "nav.manifest": "Manifest",
      "nav.pack": "Das Pack",
      "hero.subtitle":
        "Über 100 exklusive Wallpapers in Impasto-Ölmalerei, für Laptop und Smartphone. Dicke Textur, tiefe Farben und Galerielicht auf all deinen Bildschirmen.",
      "hero.cta": "ICH WILL DIE KOLLEKTION FÜR 9,90 €",
      "hero.bullet1": "Sofortiger Download",
      "hero.bullet2": "· Mac, Windows, iPhone und Android",
      "gallery.label": "Die Kollektion",
      "gallery.desc":
        "Eine Auswahl der Werke aus dem Pack. Besondere Formate, Relief und Farbe, die dich stundenlang nur auf deinen Bildschirm blicken lassen – ohne Eile, in voller Auflösung.",
      "gallery.more": "+ über 100 weitere Werke warten im vollständigen Pack auf dich",
      "manifesto.label": "Manifest",
      "manifesto.p1":
        "Jedes Wallpaper entsteht wie ein echtes Gemälde: mit dicken Farbschichten, Relief und Licht, die deinem Bildschirm die Präsenz eines Originals geben.",
      "manifesto.p2":
        "Keine generischen Verläufe, keine sich wiederholenden Muster: jedes Bild wurde geschaffen, um deinen Bildschirm der Kunst näherzubringen.",
      "compare.label": "Kunst x Bildschirm",
      "compare.desc":
        "Ziehe und vergleiche: derselbe Raum mit dem Werks-Wallpaper und mit unserer Kunst, die den Pinsel aufdrückt.",
      "compare.sliderLabel": "Vorher-Nachher-Bild vergleichen",
      "compare.before": "Vorher",
      "compare.after": "Nachher",
      "pack.label": "Das Pack",
      "pack.f01.title": "100 exklusive Kunstwerke",
      "pack.f01.desc":
        "Vollständige Kollektion in hoher Qualität – nirgendwo sonst im Internet zu finden.",
      "pack.f02.title": "4K für Laptop",
      "pack.f02.desc":
        "Auflösung 3840×2160, scharf auf jedem Monitor, ohne Treppchenbildung.",
      "pack.f03.title": "Versionen fürs Smartphone",
      "pack.f03.desc":
        "Jedes Werk neu komponiert für Hochkant-Displays, ohne die Komposition zu verlieren.",
      "pack.f04.title": "Sofortiger Download",
      "pack.f04.desc":
        "Zahlen, herunterladen. Dateien nach Gerät sortiert, sofort einsatzbereit.",
      "social.label": "Wer es schon auf dem Bildschirm hat",
      "social.desc":
        "Sieh, wie die Werke auf echten Bildschirmen lebendig werden. Dasselbe Gemälde, zwei Geräte, eine visuelle Wirkung.",
      "social.prev": "Vorherige Folie",
      "social.next": "Nächste Folie",
      "offer.label": "Angebot",
      "offer.desc":
        "Wähle deinen Zugang. Einmalzahlung, ohne Abo und ohne monatliche Gebühren.",
      "offer.pay1": "· Einmalzahlung",
      "offer.pay2": "oder in 3 Raten mit Klarna",
      "offer.secure": "100 % sichere Zahlung",
      "offer.guarantee":
        "Bedingungslose Garantie: wenn du sie nicht liebst, bekommst du dein Geld zurück.",
      "plan.essential.title": "Essenzielle Kollektion",
      "plan.from": "ab",
      "plan.essential.f1": "100 Wallpapers in 4K",
      "plan.essential.f2": "Kompatibel mit Mac, Windows, iPhone und Android",
      "plan.essential.f3": "Sofortiger Download nach dem Kauf",
      "plan.essential.f4": "14 Tage Geld-zurück-Garantie",
      "plan.essential.cta": "Ich will Essenziell",
      "plan.bestseller": "Bestseller",
      "plan.premium.title": "Premium-Kollektion",
      "plan.premium.f1":
        "Über 200 Wallpapers in 4K: jedes Gemälde in Original, Gold und weiteren Formaten",
      "plan.premium.f2": "Kompatibel mit Mac, Windows, iPhone und Android",
      "plan.premium.f3": "Ultrawide 21:9, iPad und Sperrbildschirm",
      "plan.premium.f4":
        "Bonus-Guide: jeden Tag automatisch ein neues Wallpaper",
      "plan.premium.f5": "Künftige Updates mit Vorabzugang",
      "plan.premium.f6": "30 Tage erweiterte Garantie",
      "plan.premium.cta": "Ich will die Premium-Kollektion",
      "footer.questions": "Fragen?",
      "footer.copyright": "© 2026 Atelier Wallpapers. Alle Rechte vorbehalten.",
      "footer.agb": "AGB",
      "footer.privacy": "Datenschutz",
      "footer.imprint": "Impressum",
      "footer.help": "Hilfe",
      "sticky.price": "+100 Wallpapers 4K · 9,90 €",
      "sticky.cta": "ICH WILL DIE KOLLEKTION",
      "lang.label": "Sprache",
      "social.alt1": "Kundenfoto: Kunstwerk auf Drei-Monitor-Setup",
      "social.alt2": "Kundenfoto: Kunstwerk auf Laptop und Handy",
      "social.alt3": "Kundenfoto: Kunstwerk auf Laptop und Monitor",
      "social.alt4": "Kundenfoto: Lob für das Kunstwerk auf dem Laptop",
      "social.alt5": "Kundenfoto: Kunstwerk auf dem Laptop",
      "social.alt6": "Kundenfoto: Tutto Passa auf dem Laptop",
    },
    en: {
      "nav.gallery": "Gallery",
      "nav.manifest": "Manifest",
      "nav.pack": "The Pack",
      "hero.subtitle":
        "Over 100 exclusive impasto oil-painting wallpapers for laptop and smartphone. Thick texture, deep colors, and gallery lighting on every screen.",
      "hero.cta": "GET THE COLLECTION FOR €9.90",
      "hero.bullet1": "Instant download",
      "hero.bullet2": "· Mac, Windows, iPhone and Android",
      "gallery.label": "The Collection",
      "gallery.desc":
        "A selection of works from the pack. Special formats, texture, and color that keep your eyes on the screen for hours — no rush, full resolution.",
      "gallery.more": "+ over 100 more works await in the full pack",
      "manifesto.label": "Manifest",
      "manifesto.p1":
        "Every wallpaper is created like a real painting: with thick layers of paint, relief, and light that give your screen the presence of an original.",
      "manifesto.p2":
        "No generic gradients, no repeating patterns: every image was made to bring your screen closer to art.",
      "compare.label": "Art x Screen",
      "compare.desc":
        "Drag and compare: the same room with a stock wallpaper and with our art that pushes the brush into the surface.",
      "compare.sliderLabel": "Compare before and after",
      "compare.before": "Before",
      "compare.after": "After",
      "pack.label": "The Pack",
      "pack.f01.title": "100 exclusive artworks",
      "pack.f01.desc":
        "Complete collection in high quality — nowhere else on the internet.",
      "pack.f02.title": "4K for laptop",
      "pack.f02.desc":
        "3840×2160 resolution, sharp on every monitor, without stairstepping.",
      "pack.f03.title": "Smartphone versions",
      "pack.f03.desc":
        "Every work recomposed for portrait displays without losing the composition.",
      "pack.f04.title": "Instant download",
      "pack.f04.desc":
        "Pay, download. Files sorted by device, ready to use immediately.",
      "social.label": "Already on their screens",
      "social.desc":
        "See how the works come alive on real screens. Same painting, two devices, one visual impact.",
      "social.prev": "Previous slide",
      "social.next": "Next slide",
      "offer.label": "Offer",
      "offer.desc":
        "Choose your access. One-time payment, no subscription and no monthly fees.",
      "offer.pay1": "· One-time payment",
      "offer.pay2": "or pay in 3 installments with Klarna",
      "offer.secure": "100% secure payment",
      "offer.guarantee":
        "Unconditional guarantee: if you don't love them, you get your money back.",
      "plan.essential.title": "Essential Collection",
      "plan.from": "from",
      "plan.essential.f1": "100 wallpapers in 4K",
      "plan.essential.f2": "Compatible with Mac, Windows, iPhone and Android",
      "plan.essential.f3": "Instant download after purchase",
      "plan.essential.f4": "14-day money-back guarantee",
      "plan.essential.cta": "I want Essential",
      "plan.bestseller": "Bestseller",
      "plan.premium.title": "Premium Collection",
      "plan.premium.f1":
        "Over 200 wallpapers in 4K: every painting in original, gold, and more formats",
      "plan.premium.f2": "Compatible with Mac, Windows, iPhone and Android",
      "plan.premium.f3": "Ultrawide 21:9, iPad and lock screen",
      "plan.premium.f4": "Bonus guide: a new wallpaper automatically every day",
      "plan.premium.f5": "Future updates with early access",
      "plan.premium.f6": "30-day extended guarantee",
      "plan.premium.cta": "I want the Premium Collection",
      "footer.questions": "Questions?",
      "footer.copyright": "© 2026 Atelier Wallpapers. All rights reserved.",
      "footer.agb": "Terms",
      "footer.privacy": "Privacy",
      "footer.imprint": "Imprint",
      "footer.help": "Help",
      "sticky.price": "+100 wallpapers 4K · €9.90",
      "sticky.cta": "GET THE COLLECTION",
      "lang.label": "Language",
      "social.alt1": "Customer photo: artwork on triple-monitor setup",
      "social.alt2": "Customer photo: artwork on laptop and phone",
      "social.alt3": "Customer photo: artwork on laptop and monitor",
      "social.alt4": "Customer photo: praise for the artwork on laptop",
      "social.alt5": "Customer photo: artwork on laptop",
      "social.alt6": "Customer photo: Tutto Passa on laptop",
    },
  };

  var HTML = {
    de: {
      "hero.title":
        'Verwandle deinen Bildschirm<br/>in ein <span class="font-serif-italic text-gold">Kunstwerk</span>',
      "gallery.heading":
        'Jeder Bildschirm, ein <span class="font-serif-italic text-gold">Gemälde.</span>',
      "compare.heading":
        'Der Unterschied, den <span class="font-serif-italic text-gold">Kunst</span> macht',
      "pack.heading":
        'Alles, was du <span class="font-serif-italic text-gold">erhältst</span>',
      "social.heading":
        'Echte Kundenfotos mit den Werken auf <span class="font-serif-italic text-gold">Laptop</span> und <span class="font-serif-italic text-gold">Handy</span>.',
      "offer.heading":
        'Nimm die <span class="font-serif-italic text-gold">Galerie</span> mit',
    },
    en: {
      "hero.title":
        'Turn your screen<br/>into a <span class="font-serif-italic text-gold">work of art</span>',
      "gallery.heading":
        'Every screen, a <span class="font-serif-italic text-gold">painting.</span>',
      "compare.heading":
        'The difference <span class="font-serif-italic text-gold">art</span> makes',
      "pack.heading":
        'Everything you <span class="font-serif-italic text-gold">get</span>',
      "social.heading":
        'Real customer photos with the artworks on <span class="font-serif-italic text-gold">laptop</span> and <span class="font-serif-italic text-gold">phone</span>.',
      "offer.heading":
        'Take the <span class="font-serif-italic text-gold">gallery</span> with you',
    },
  };

  var META = {
    de: {
      title: "Atelier Wallpapers — Exklusive 4K-Wallpapers",
      description:
        "Über 100 exklusive 4K-Wallpapers in Impasto-Ölmalerei für Laptop und Smartphone. Dicke Textur, tiefe Farben, Galerieästhetik.",
      ogDescription:
        "Verwandle deinen Bildschirm in ein Kunstwerk mit exklusiven Wallpapers in Impasto-Ölmalerei.",
      locale: "de_DE",
      htmlLang: "de-DE",
    },
    en: {
      title: "Atelier Wallpapers — Exclusive 4K Wallpapers",
      description:
        "Over 100 exclusive 4K impasto oil-painting wallpapers for laptop and smartphone. Thick texture, deep colors, gallery aesthetic.",
      ogDescription:
        "Turn your screen into a work of art with exclusive impasto oil-painting wallpapers.",
      locale: "en_US",
      htmlLang: "en",
    },
  };

  function getLang() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "de") return saved;
    } catch (e) {}
    return DEFAULT_LANG;
  }

  function sliderValueText(lang, percent) {
    if (lang === "en") {
      return percent + "% of the original image visible";
    }
    return percent + " % des Originalbildes sichtbar";
  }

  function socialDotLabel(lang, n) {
    if (lang === "en") return "Go to slide " + n;
    return "Zu Folie " + n;
  }

  function applyLang(lang) {
    if (lang !== "de" && lang !== "en") lang = DEFAULT_LANG;

    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}

    document.documentElement.lang = META[lang].htmlLang;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (T[lang][key] != null) el.textContent = T[lang][key];
    });

    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (HTML[lang][key] != null) el.innerHTML = HTML[lang][key];
    });

    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-alt");
      if (T[lang][key] != null) el.alt = T[lang][key];
    });

    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      if (T[lang][key] != null) el.setAttribute("aria-label", T[lang][key]);
    });

    document.querySelectorAll("[data-i18n-dot]").forEach(function (el) {
      var n = el.getAttribute("data-i18n-dot");
      el.setAttribute("aria-label", socialDotLabel(lang, n));
    });

    var m = META[lang];
    document.title = m.title;
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", m.description);
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", m.title);
    var ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", m.ogDescription);
    var ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute("content", m.locale);

    document.querySelectorAll(".lang-switch-btn").forEach(function (btn) {
      var active = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });

    var slider = document.getElementById("ba-slider");
    if (slider) {
      slider.setAttribute("aria-label", T[lang]["compare.sliderLabel"]);
      var now = slider.getAttribute("aria-valuenow") || "50";
      slider.setAttribute("aria-valuetext", sliderValueText(lang, now));
    }

    window.ATELIER_LANG = lang;
    window.dispatchEvent(
      new CustomEvent("atelier:lang", { detail: { lang: lang } })
    );
  }

  function initSwitcher() {
    document.querySelectorAll(".lang-switch-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyLang(btn.getAttribute("data-lang"));
      });
    });
  }

  window.ATELIER_I18N = {
    getLang: getLang,
    applyLang: applyLang,
    t: function (key) {
      return T[getLang()][key] || key;
    },
    sliderValueText: function (percent) {
      return sliderValueText(getLang(), percent);
    },
  };

  document.addEventListener("DOMContentLoaded", function () {
    initSwitcher();
    applyLang(getLang());
  });
})();
