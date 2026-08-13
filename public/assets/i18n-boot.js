(function () {
  "use strict";

  var DEFAULT = "de";

  function norm(raw) {
    if (!raw) return null;
    var code = String(raw).toLowerCase().split("-")[0];
    return code === "de" ? "de" : null;
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

    // Germany-only market — default UI language is German
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
