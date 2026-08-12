(function () {
  "use strict";

  var DEFAULT = "de";
  var SUPPORTED =
    "de en nl fr es it pt pl cs sk sl hr bg ro hu el fi sv da no et lv lt uk sr mt is ca".split(
      " ",
    );
  var COUNTRY = {
    DE: "de",
    AT: "de",
    LI: "de",
    BE: "nl",
    BG: "bg",
    HR: "hr",
    DK: "da",
    SK: "sk",
    SI: "sl",
    ES: "es",
    EE: "et",
    FI: "fi",
    FR: "fr",
    GR: "el",
    HU: "hu",
    IE: "en",
    IS: "is",
    IT: "it",
    LV: "lv",
    LT: "lt",
    LU: "fr",
    MT: "mt",
    MC: "fr",
    ME: "sr",
    NL: "nl",
    PL: "pl",
    PT: "pt",
    CZ: "cs",
    RO: "ro",
    SM: "it",
    RS: "sr",
    SE: "sv",
    CH: "de",
    UA: "uk",
    VA: "it",
    AD: "ca",
    CY: "el",
    NO: "no",
  };

  function norm(raw) {
    if (!raw) return null;
    var code = String(raw).toLowerCase().split("-")[0];
    return SUPPORTED.indexOf(code) >= 0 ? code : null;
  }

  function query(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch (e) {
      return null;
    }
  }

  function pickLang() {
    var boot = window.__ATELIER_BOOT__;
    if (boot && boot.language) return norm(boot.language) || DEFAULT;

    var fromQuery = norm(query("lang"));
    if (fromQuery) return fromQuery;

    try {
      if (localStorage.getItem("atelier-lang-manual") === "1") {
        var saved = norm(localStorage.getItem("atelier-lang"));
        if (saved) return saved;
      }
    } catch (e) {}

    var country = (query("country") || "").toUpperCase();
    if (country && COUNTRY[country]) return COUNTRY[country];

    try {
      var cached = sessionStorage.getItem("atelier-detect-v1");
      if (cached) {
        var parsed = JSON.parse(cached);
        if (
          parsed &&
          parsed.payload &&
          parsed.payload.language &&
          Date.now() - parsed.ts < 300000
        ) {
          return norm(parsed.payload.language) || DEFAULT;
        }
      }
    } catch (e2) {}

    var nav = navigator.languages || (navigator.language ? [navigator.language] : []);
    for (var i = 0; i < nav.length; i++) {
      var guess = norm(nav[i]);
      if (guess) return guess;
    }

    return DEFAULT;
  }

  var lang = pickLang();
  window.__ATELIER_GUESS_LANG__ = lang;
  document.documentElement.classList.add("i18n-pending");
  document.documentElement.setAttribute("data-i18n-guess", lang);

  if (!document.querySelector('link[rel="preload"][href="assets/locales/' + lang + '.json"]')) {
    var preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "fetch";
    preload.href = "assets/locales/" + lang + ".json";
    preload.crossOrigin = "anonymous";
    document.head.appendChild(preload);
  }

  window.__ATELIER_BUNDLE_PREFETCH__ = fetch("assets/locales/" + lang + ".json", {
    credentials: "same-origin",
  });
})();
