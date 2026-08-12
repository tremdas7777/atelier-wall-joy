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
      "common.backOffer": "Zurück zum Angebot",
      "common.backGallery": "Zur Galerie",
      "common.gallery": "Galerie",
      "common.offer": "Angebot",
      "common.imprint": "Impressum",
      "checkout.label": "Kasse",
      "checkout.heading": "Sichere Zahlung in Euro",
      "checkout.intro": "Digitales Produkt — kein Versand, kein Adresse nötig. Sofortiger Download direkt nach Zahlungsbestätigung.",
      "checkout.cancelled": "Zahlung abgebrochen. Du kannst es jederzeit erneut versuchen.",
      "checkout.formTitle": "Deine Daten",
      "checkout.formHint": "Nur E-Mail und Name — als Infoprodukt brauchen wir keine Lieferadresse.",
      "checkout.email": "E-Mail",
      "checkout.name": "Name (optional)",
      "checkout.emailPlaceholder": "deine@email.de",
      "checkout.namePlaceholder": "Max Mustermann",
      "checkout.paySecure": "100 % sichere Zahlung · Stripe · Karte, PayPal, Klarna · EUR",
      "checkout.orderLabel": "Bestellung",
      "checkout.total": "Gesamt (EUR)",
      "checkout.invoiceNote": "Einmalzahlung. Rechnung per E-Mail von Stripe.",
      "checkout.payBtn": "Weiter zu Stripe — ",
      "checkout.payRedirect": "Weiterleitung zu Stripe…",
      "checkout.checkoutFailed": "Checkout fehlgeschlagen",
      "success.backGallery": "Zur Galerie",
      "success.loading": "Zahlung wird bestätigt…",
      "success.loadingHint": "Einen Moment — wir bereiten deinen Download vor.",
      "success.loadingAlmost": "Fast fertig…",
      "success.eyebrow": "Zahlung bestätigt",
      "success.title": "Danke für deinen Kauf!",
      "success.subtitleDefault": "Deine Kollektion ist bereit zum Download.",
      "success.product": "Produkt",
      "success.orderId": "Bestellnummer",
      "success.email": "E-Mail",
      "success.download": "Jetzt herunterladen",
      "success.downloadSub": "ZIP · Sofort verfügbar",
      "success.downloadPending": "Download wird vorbereitet — bitte in Kürze neu laden.",
      "success.errorTitle": "Etwas ist schiefgelaufen",
      "success.retry": "Seite neu laden",
      "success.planHint.essentiell": "100 Wallpapers in 4K · Laptop & Smartphone",
      "success.planHint.premium": "200+ Wallpapers · Ultrawide, iPad & Bonus-Guide",
      "success.planHint.default": "Deine Wallpapers warten auf dich.",
      "help.title": "Hilfe",
      "help.intro": "Kurze Antworten zu Download, Geräten und Zahlung — für Kundinnen und Kunden in Deutschland.",
      "help.h2.download": "Wie erhalte ich die Wallpapers?",
      "help.h2.devices": "Welche Geräte werden unterstützt?",
      "help.h2.currency": "In welcher Währung zahle ich?",
      "help.h2.setup": "Wie setze ich ein Wallpaper?",
      "help.h2.guarantee": "Garantie",
      "help.h2.contact": "Kontakt",
      "footer.widerruf": "Widerruf",
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
      "common.backOffer": "Back to offer",
      "common.backGallery": "Back to gallery",
      "common.gallery": "Gallery",
      "common.offer": "Offer",
      "common.imprint": "Imprint",
      "checkout.label": "Checkout",
      "checkout.heading": "Secure payment in Euro",
      "checkout.intro": "Digital product — no shipping, no address needed. Instant download right after payment confirmation.",
      "checkout.cancelled": "Payment cancelled. You can try again at any time.",
      "checkout.formTitle": "Your details",
      "checkout.formHint": "Email and name only — as a digital product we don't need a delivery address.",
      "checkout.email": "Email",
      "checkout.name": "Name (optional)",
      "checkout.emailPlaceholder": "you@email.com",
      "checkout.namePlaceholder": "Jane Doe",
      "checkout.paySecure": "100% secure payment · Stripe · Card, PayPal, Klarna · EUR",
      "checkout.orderLabel": "Order",
      "checkout.total": "Total (EUR)",
      "checkout.invoiceNote": "One-time payment. Invoice by email from Stripe.",
      "checkout.payBtn": "Continue to Stripe — ",
      "checkout.payRedirect": "Redirecting to Stripe…",
      "checkout.checkoutFailed": "Checkout failed",
      "success.backGallery": "Back to gallery",
      "success.loading": "Confirming payment…",
      "success.loadingHint": "One moment — we're preparing your download.",
      "success.loadingAlmost": "Almost done…",
      "success.eyebrow": "Payment confirmed",
      "success.title": "Thank you for your purchase!",
      "success.subtitleDefault": "Your collection is ready to download.",
      "success.product": "Product",
      "success.orderId": "Order number",
      "success.email": "Email",
      "success.download": "Download now",
      "success.downloadSub": "ZIP · Available instantly",
      "success.downloadPending": "Preparing download — please reload shortly.",
      "success.errorTitle": "Something went wrong",
      "success.retry": "Reload page",
      "success.planHint.essentiell": "100 wallpapers in 4K · Laptop & smartphone",
      "success.planHint.premium": "200+ wallpapers · Ultrawide, iPad & bonus guide",
      "success.planHint.default": "Your wallpapers are waiting for you.",
      "help.title": "Help",
      "help.intro": "Quick answers about download, devices, and payment.",
      "help.h2.download": "How do I get the wallpapers?",
      "help.h2.devices": "Which devices are supported?",
      "help.h2.currency": "Which currency do I pay in?",
      "help.h2.setup": "How do I set a wallpaper?",
      "help.h2.guarantee": "Guarantee",
      "help.h2.contact": "Contact",
      "footer.widerruf": "Withdrawal",
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
      "checkout.digitalConsent":
        'Ich stimme zu, dass der Download sofort beginnt, und weiß, dass ich damit mein Widerrufsrecht für diese digitalen Inhalte verliere. (<a href="widerruf.html" class="text-gold underline">Widerrufsbelehrung</a>)',
      "checkout.agbConsent":
        'Ich akzeptiere die <a href="agb.html" class="text-gold underline">AGB</a> und die <a href="datenschutz.html" class="text-gold underline">Datenschutzerklärung</a>.',
      "success.footnote":
        "Der Link ist <strong>7 Tage gültig</strong>. Speichere diese Seite im Browser, falls du später erneut herunterladen möchtest.",
      "success.help":
        'Fragen? <a href="hilfe.html">Download-Hilfe</a> · <a href="mailto:kontakt@atelierwallpapers.de">Support</a>',
      "help.p.download":
        "Nach der Zahlung wirst du zur Bestätigungsseite weitergeleitet und kannst dort sofort herunterladen. Die Dateien sind nach Gerät sortiert (Laptop, Smartphone, weitere Formate in Premium).",
      "help.p.devices":
        "Mac, Windows, iPhone und Android. Die Premium-Kollektion enthält zusätzlich Ultrawide 21:9, iPad und Sperrbildschirm.",
      "help.p.currency":
        "Alle Preise sind in Euro (EUR). Die Essenzielle Kollektion kostet 9,90 €, die Premium-Kollektion 19,90 €. Einmalzahlung, kein Abo. Optional in 3 Raten mit Klarna, sofern im Checkout angeboten.",
      "help.p.setup":
        "<ul><li><strong>Mac:</strong> Systemeinstellungen → Hintergrundbild → Bild hinzufügen.</li><li><strong>Windows:</strong> Rechtsklick auf die Datei → Als Desktophintergrund festlegen.</li><li><strong>iPhone:</strong> Bild in der Fotos-App öffnen → Teilen → Als Hintergrundbild festlegen.</li><li><strong>Android:</strong> Lange auf den Startbildschirm tippen → Hintergrund → Foto auswählen.</li></ul>",
      "help.p.guarantee":
        '14 Tage Geld-zurück bei der Essenziellen Kollektion, 30 Tage bei Premium. Details stehen in den <a href="agb.html">AGB</a> und der <a href="widerruf.html">Widerrufsbelehrung</a>.',
      "help.p.contact":
        'Schreib uns: <a href="mailto:kontakt@atelierwallpapers.de">kontakt@atelierwallpapers.de</a>',
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
      "checkout.digitalConsent":
        'I agree that the download starts immediately and understand that I lose my right of withdrawal for these digital contents. (<a href="widerruf.html" class="text-gold underline">Withdrawal policy</a>)',
      "checkout.agbConsent":
        'I accept the <a href="agb.html" class="text-gold underline">Terms</a> and the <a href="datenschutz.html" class="text-gold underline">Privacy Policy</a>.',
      "success.footnote":
        "The link is valid for <strong>7 days</strong>. Save this page in your browser if you want to download again later.",
      "success.help":
        'Questions? <a href="hilfe.html">Download help</a> · <a href="mailto:kontakt@atelierwallpapers.de">Support</a>',
      "help.p.download":
        "After payment you'll be redirected to the confirmation page where you can download instantly. Files are sorted by device (laptop, smartphone, extra formats in Premium).",
      "help.p.devices":
        "Mac, Windows, iPhone, and Android. The Premium collection also includes ultrawide 21:9, iPad, and lock screen formats.",
      "help.p.currency":
        "All prices are in Euro (EUR). The Essential collection is €9.90, the Premium collection is €19.90. One-time payment, no subscription. Optional 3 installments with Klarna when offered at checkout.",
      "help.p.setup":
        "<ul><li><strong>Mac:</strong> System Settings → Wallpaper → Add picture.</li><li><strong>Windows:</strong> Right-click the file → Set as desktop background.</li><li><strong>iPhone:</strong> Open in Photos → Share → Use as wallpaper.</li><li><strong>Android:</strong> Long-press home screen → Wallpaper → Choose photo.</li></ul>",
      "help.p.guarantee":
        '14-day money-back on Essential, 30 days on Premium. Details in our <a href="agb.html">Terms</a> and <a href="widerruf.html">Withdrawal policy</a>.',
      "help.p.contact":
        'Email us: <a href="mailto:kontakt@atelierwallpapers.de">kontakt@atelierwallpapers.de</a>',
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
      pageTitle: {
        checkout: "Kasse — Atelier Wallpapers",
        success: "Zahlung bestätigt — Atelier Wallpapers",
        help: "Hilfe — Atelier Wallpapers",
      },
    },
    en: {
      title: "Atelier Wallpapers — Exclusive 4K Wallpapers",
      description:
        "Over 100 exclusive 4K impasto oil-painting wallpapers for laptop and smartphone. Thick texture, deep colors, gallery aesthetic.",
      ogDescription:
        "Turn your screen into a work of art with exclusive impasto oil-painting wallpapers.",
      locale: "en_US",
      htmlLang: "en",
      pageTitle: {
        checkout: "Checkout — Atelier Wallpapers",
        success: "Payment confirmed — Atelier Wallpapers",
        help: "Help — Atelier Wallpapers",
      },
    },
  };

  var CHECKOUT_PLANS = {
    de: {
      essentiell: {
        name: "Essenzielle Kollektion",
        price: "9,90 €",
        desc: "100 Wallpapers in 4K für Laptop und Smartphone. Sofortiger Download.",
        perks: [
          "100 Wallpapers in 4K",
          "Mac, Windows, iPhone und Android",
          "Sofortiger Download",
          "14 Tage Geld-zurück-Garantie",
        ],
      },
      premium: {
        name: "Premium-Kollektion",
        price: "19,90 €",
        desc: "Über 200 Wallpapers in 4K, Ultrawide, iPad, Sperrbildschirm und Bonus-Guide.",
        perks: [
          "Über 200 Wallpapers in 4K",
          "Ultrawide, iPad, Sperrbildschirm",
          "Bonus-Guide",
          "30 Tage erweiterte Garantie",
        ],
      },
    },
    en: {
      essentiell: {
        name: "Essential Collection",
        price: "€9.90",
        desc: "100 wallpapers in 4K for laptop and smartphone. Instant download.",
        perks: [
          "100 wallpapers in 4K",
          "Mac, Windows, iPhone and Android",
          "Instant download",
          "14-day money-back guarantee",
        ],
      },
      premium: {
        name: "Premium Collection",
        price: "€19.90",
        desc: "Over 200 wallpapers in 4K, ultrawide, iPad, lock screen, and bonus guide.",
        perks: [
          "Over 200 wallpapers in 4K",
          "Ultrawide, iPad, lock screen",
          "Bonus guide",
          "30-day extended guarantee",
        ],
      },
    },
  };

  var SUCCESS_MSGS = {
    de: {
      noSession:
        'Keine Bestellung gefunden. Falls du gerade bezahlt hast, warte einen Moment und lade die Seite neu. Sonst: <a href="mailto:kontakt@atelierwallpapers.de">kontakt@atelierwallpapers.de</a>',
      notFound:
        'Bestellung nicht gefunden. Falls du gerade bezahlt hast, warte einen Moment und lade die Seite neu. Bei Problemen: <a href="mailto:kontakt@atelierwallpapers.de">kontakt@atelierwallpapers.de</a>',
      timeout:
        'Die Bestätigung dauert ungewöhnlich lange. Bitte lade die Seite neu. Bei Problemen: <a href="mailto:kontakt@atelierwallpapers.de">kontakt@atelierwallpapers.de</a>',
      connection:
        'Verbindung zum Server fehlgeschlagen. Lade die Seite neu oder kontaktiere <a href="mailto:kontakt@atelierwallpapers.de">kontakt@atelierwallpapers.de</a>.',
    },
    en: {
      noSession:
        'No order found. If you just paid, wait a moment and reload the page. Otherwise: <a href="mailto:kontakt@atelierwallpapers.de">kontakt@atelierwallpapers.de</a>',
      notFound:
        'Order not found. If you just paid, wait a moment and reload the page. Problems? <a href="mailto:kontakt@atelierwallpapers.de">kontakt@atelierwallpapers.de</a>',
      timeout:
        'Confirmation is taking unusually long. Please reload the page. Problems? <a href="mailto:kontakt@atelierwallpapers.de">kontakt@atelierwallpapers.de</a>',
      connection:
        'Connection to the server failed. Reload the page or contact <a href="mailto:kontakt@atelierwallpapers.de">kontakt@atelierwallpapers.de</a>.',
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

  function renderCheckoutPlan(lang) {
    var root = document.body;
    if (!root || root.getAttribute("data-i18n-page") !== "checkout") return;
    var plan = (root.getAttribute("data-checkout-plan") || "essentiell").toLowerCase();
    if (plan !== "premium") plan = "essentiell";
    var data = CHECKOUT_PLANS[lang][plan];
    if (!data) return;
    var nameEl = document.getElementById("plan-name");
    var descEl = document.getElementById("plan-desc");
    var priceEl = document.getElementById("plan-price");
    var btnPriceEl = document.getElementById("btn-price");
    var perksEl = document.getElementById("plan-perks");
    var payBtn = document.getElementById("pay-btn");
    if (nameEl) nameEl.textContent = data.name;
    if (descEl) descEl.textContent = data.desc;
    if (priceEl) priceEl.textContent = data.price;
    if (btnPriceEl) btnPriceEl.textContent = data.price;
    if (payBtn && !payBtn.disabled) {
      payBtn.innerHTML = T[lang]["checkout.payBtn"] + '<span id="btn-price">' + data.price + "</span>";
    }
    if (perksEl) {
      perksEl.innerHTML = data.perks
        .map(function (p) {
          return "<li>✓ " + p + "</li>";
        })
        .join("");
    }
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

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (T[lang][key] != null) el.setAttribute("placeholder", T[lang][key]);
    });

    document.querySelectorAll("[data-i18n-dot]").forEach(function (el) {
      var n = el.getAttribute("data-i18n-dot");
      el.setAttribute("aria-label", socialDotLabel(lang, n));
    });

    var pageKey = document.body && document.body.getAttribute("data-i18n-page");
    var m = META[lang];
    if (pageKey && m.pageTitle && m.pageTitle[pageKey]) {
      document.title = m.pageTitle[pageKey];
    } else {
      document.title = m.title;
    }
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", m.description);
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", document.title);
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

    renderCheckoutPlan(lang);

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
    successMsg: function (key) {
      return SUCCESS_MSGS[getLang()][key] || "";
    },
    checkoutPlan: function (plan) {
      var p = plan === "premium" ? "premium" : "essentiell";
      return CHECKOUT_PLANS[getLang()][p];
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
