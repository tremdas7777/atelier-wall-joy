(function () {
  "use strict";

  var STORAGE_KEY = "atelier-lang";
  var DEFAULT_LANG = "de";
  var FALLBACK_LANG = "en";
  var BLOCKED_PATH = "unavailable.html";

  var SUPPORTED_LANGS = [
    "de", "en", "nl", "fr", "es", "it", "pt", "pl", "cs", "sk", "sl", "hr", "bg",
    "ro", "hu", "el", "fi", "sv", "da", "no", "et", "lv", "lt", "uk", "sr", "mt", "is", "ca",
  ];

  var LANG_LABELS = {
    de: "DE", en: "EN", nl: "NL", fr: "FR", es: "ES", it: "IT", pt: "PT", pl: "PL",
    cs: "CS", sk: "SK", sl: "SL", hr: "HR", bg: "BG", ro: "RO", hu: "HU", el: "EL",
    fi: "FI", sv: "SV", da: "DA", no: "NO", et: "ET", lv: "LV", lt: "LT", uk: "UK",
    sr: "SR", mt: "MT", is: "IS", ca: "CA",
  };

  var bundleCache = Object.create(null);
  var currentLang = DEFAULT_LANG;
  var currentBundle = null;
  var currentDetect = null;
  var currentPricing = null;
  var socialManifest = null;

  var socialManifestPromise = fetchJson("assets/social/manifest.json")
    .then(function (m) {
      socialManifest = m;
      return m;
    })
    .catch(function () {
      return null;
    });

  function resolveSocialSet(lang, country) {
    if (!socialManifest) return "de";
    var cc = (country || "").toLowerCase();
    var l = (lang || DEFAULT_LANG).toLowerCase();
    if (cc && socialManifest.languageMap[cc]) return socialManifest.languageMap[cc];
    if (socialManifest.languages[l]) return l;
    var fb = socialManifest.fallback || ["en", "de"];
    for (var i = 0; i < fb.length; i++) {
      if (socialManifest.languages[fb[i]]) return fb[i];
    }
    return "de";
  }

  function applySocialImages(lang, country) {
    if (!socialManifest) return;
    var set = resolveSocialSet(lang, country);
    var files = socialManifest.languages[set] || socialManifest.languages.de;
    if (!files) return;
    document.querySelectorAll("#social-track img").forEach(function (img, i) {
      if (!files[i]) return;
      var next = "assets/social/" + files[i];
      if (img.getAttribute("src") !== next) img.setAttribute("src", next);
    });
  }

  function getQueryLang() {
    try {
      var q = new URLSearchParams(window.location.search).get("lang");
      if (q) return q.toLowerCase().split("-")[0];
    } catch (e) {}
    return null;
  }

  function getQueryCountry() {
    try {
      var q = new URLSearchParams(window.location.search).get("country");
      if (q) return q.trim().toUpperCase();
    } catch (e) {}
    return null;
  }

  function getSavedLang() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function saveLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
  }

  function isBlockedPage() {
    return /(^|\/)unavailable\.html$/i.test(window.location.pathname);
  }

  function deepMerge(primary, fallback) {
    if (!fallback) return primary;
    if (!primary) return fallback;
    if (typeof primary === "string") return primary || fallback;
    if (Array.isArray(primary)) return primary.length ? primary : fallback;
    if (typeof primary === "object") {
      var out = {};
      Object.keys(fallback)
        .concat(Object.keys(primary))
        .forEach(function (k) {
          if (!(k in out)) out[k] = deepMerge(primary[k], fallback[k]);
        });
      return out;
    }
    return primary != null ? primary : fallback;
  }

  function mergeBundles(primary, secondary) {
    return {
      t: deepMerge(primary.t, secondary.t),
      html: deepMerge(primary.html, secondary.html),
      meta: deepMerge(primary.meta, secondary.meta),
      checkoutPlans: deepMerge(primary.checkoutPlans, secondary.checkoutPlans),
      successMsgs: deepMerge(primary.successMsgs, secondary.successMsgs),
    };
  }

  function fetchJson(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (res) {
      if (!res.ok) throw new Error("missing " + url);
      return res.json();
    });
  }

  function loadBundle(lang) {
    if (bundleCache[lang]) return Promise.resolve(bundleCache[lang]);
    var chain = [lang];
    if (lang !== FALLBACK_LANG) chain.push(FALLBACK_LANG);
    if (lang !== DEFAULT_LANG) chain.push(DEFAULT_LANG);
    var seen = Object.create(null);
    chain = chain.filter(function (l) {
      if (seen[l]) return false;
      seen[l] = true;
      return true;
    });
    return chain
      .reduce(function (acc, code) {
        return acc.then(function (merged) {
          return fetchJson("assets/locales/" + code + ".json")
            .then(function (bundle) {
              return merged ? mergeBundles(bundle, merged) : bundle;
            })
            .catch(function () {
              return merged;
            });
        });
      }, Promise.resolve(null))
      .then(function (bundle) {
        if (!bundle) return fetchJson("assets/locales/" + DEFAULT_LANG + ".json");
        bundleCache[lang] = bundle;
        return bundle;
      });
  }

  function fetchDetect(country, lang) {
    var url = "/api/locale/detect";
    var qs = [];
    if (country) qs.push("country=" + encodeURIComponent(country));
    if (lang) qs.push("language=" + encodeURIComponent(lang));
    if (qs.length) url += "?" + qs.join("&");
    return fetch(url, { credentials: "same-origin" }).then(function (res) {
      if (!res.ok) throw new Error("detect failed");
      return res.json();
    });
  }

  function clientGeoCountry() {
    return fetch("https://ipapi.co/country_code/", {
      credentials: "omit",
      signal: typeof AbortSignal !== "undefined" ? AbortSignal.timeout(4000) : undefined,
    })
      .then(function (res) {
        return res.ok ? res.text() : Promise.reject();
      })
      .then(function (code) {
        code = (code || "").trim().toUpperCase();
        return code.length === 2 ? code : null;
      })
      .catch(function () {
        return null;
      });
  }

  function resolveLocale(langOverride) {
    var countryOverride = getQueryCountry();
    return fetchDetect(countryOverride, langOverride || null)
      .catch(function () {
        return {
          country: countryOverride || null,
          language: langOverride || DEFAULT_LANG,
          blocked: false,
          source: countryOverride ? "geo" : "default",
          pricing: null,
        };
      })
      .then(function (det) {
        if (det.country || det.source !== "default" || langOverride || countryOverride) return det;
        return clientGeoCountry().then(function (cc) {
          if (!cc) return det;
          return fetchDetect(cc, langOverride || null).catch(function () {
            return det;
          });
        });
      });
  }

  function formatPriceLabel(planPrice) {
    if (!planPrice) return "";
    if (planPrice.currency && planPrice.currency !== "EUR" && planPrice.eurFormatted) {
      return planPrice.formatted + " (≈ " + planPrice.eurFormatted + ")";
    }
    return planPrice.formatted || "";
  }

  function pricingVars() {
    var p = currentPricing;
    if (!p) {
      return {
        "price.essential": "9,90 €",
        "price.premium": "19,90 €",
        currency: "EUR",
      };
    }
    return {
      "price.essential": formatPriceLabel(p.essential),
      "price.premium": formatPriceLabel(p.premium),
      currency: p.currency || "EUR",
    };
  }

  function interpolate(text) {
    if (!text || text.indexOf("{{") === -1) return text;
    var vars = pricingVars();
    return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, function (_, key) {
      return vars[key] != null ? vars[key] : "";
    });
  }

  function sliderValueText(lang, percent) {
    var tpl =
      currentBundle &&
      currentBundle.t &&
      currentBundle.t["compare.sliderValue"];
    if (tpl) return tpl.replace("{{percent}}", percent);
    if (lang === "en") return percent + "% of the original image visible";
    return percent + " % des Originalbildes sichtbar";
  }

  function socialDotLabel(lang, n) {
    var tpl =
      currentBundle && currentBundle.t && currentBundle.t["social.dotLabel"];
    if (tpl) return tpl.replace("{{n}}", n);
    if (lang === "en") return "Go to slide " + n;
    return "Zu Folie " + n;
  }

  function getPlanPricing(plan) {
    var p = plan === "premium" ? "premium" : "essentiell";
    var bundlePlan =
      currentBundle && currentBundle.checkoutPlans && currentBundle.checkoutPlans[p];
    var price =
      currentPricing && currentPricing[p === "premium" ? "premium" : "essential"];
    var displayPrice = price ? formatPriceLabel(price) : bundlePlan ? bundlePlan.price : "";
    return {
      name: bundlePlan ? bundlePlan.name : p,
      desc: bundlePlan ? bundlePlan.desc : "",
      perks: bundlePlan ? bundlePlan.perks : [],
      price: displayPrice,
      eurPrice: price ? price.eurFormatted : "",
      cents: price ? price.cents : null,
      currency: price ? price.currency : "EUR",
    };
  }

  function renderCheckoutPlan() {
    var root = document.body;
    if (!root || root.getAttribute("data-i18n-page") !== "checkout") return;
    var plan = (root.getAttribute("data-checkout-plan") || "essentiell").toLowerCase();
    if (plan !== "premium") plan = "essentiell";
    var data = getPlanPricing(plan);
    var t = (currentBundle && currentBundle.t) || {};
    var nameEl = document.getElementById("plan-name");
    var descEl = document.getElementById("plan-desc");
    var priceEl = document.getElementById("plan-price");
    var btnPriceEl = document.getElementById("btn-price");
    var perksEl = document.getElementById("plan-perks");
    var payBtn = document.getElementById("pay-btn");
    var totalLabel = document.querySelector("[data-i18n='checkout.total']");
    var paySecure = document.querySelector("[data-i18n='checkout.paySecure']");

    if (nameEl) nameEl.textContent = data.name;
    if (descEl) descEl.textContent = data.desc;
    if (priceEl) priceEl.textContent = data.price;
    if (btnPriceEl) btnPriceEl.textContent = data.price;
    if (totalLabel && t["checkout.total"]) totalLabel.textContent = interpolate(t["checkout.total"]);
    if (paySecure && t["checkout.paySecure"]) paySecure.textContent = interpolate(t["checkout.paySecure"]);
    if (payBtn && !payBtn.disabled) {
      payBtn.innerHTML =
        (t["checkout.payBtn"] || "Weiter zu Stripe — ") +
        '<span id="btn-price">' +
        data.price +
        "</span>";
    }
    if (perksEl && data.perks) {
      perksEl.innerHTML = data.perks
        .map(function (item) {
          return "<li>✓ " + item + "</li>";
        })
        .join("");
    }
  }

  function applyDynamicPrices() {
    document.querySelectorAll("[data-i18n-price]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-price");
      var plan = getPlanPricing(key === "premium" ? "premium" : "essentiell");
      el.textContent = plan.price;
    });
    renderCheckoutPlan();
  }

  function ensureLangSwitcher() {
    if (document.getElementById("atelier-lang-switch")) return;
    var host =
      document.querySelector("header .flex.items-center") ||
      document.querySelector("header") ||
      document.body;
    if (!host) return;

    var wrap = document.createElement("div");
    wrap.id = "atelier-lang-switch";
    wrap.className = "lang-switch";

    var select = document.createElement("select");
    select.className = "lang-switch-select";
    select.setAttribute("aria-label", "Language");

    SUPPORTED_LANGS.forEach(function (code) {
      var opt = document.createElement("option");
      opt.value = code;
      opt.textContent = LANG_LABELS[code] || code.toUpperCase();
      select.appendChild(opt);
    });

    select.addEventListener("change", function () {
      switchLanguage(select.value);
    });

    wrap.appendChild(select);
    host.appendChild(wrap);
  }

  function updateLangSwitcher(lang) {
    var select = document.querySelector("#atelier-lang-switch select");
    if (select) select.value = lang;
  }

  function switchLanguage(lang) {
    saveLang(lang);
    return resolveLocale(lang).then(function (det) {
      currentDetect = det;
      currentPricing = det.pricing || currentPricing;
      window.ATELIER_COUNTRY = det.country || window.ATELIER_COUNTRY;
      window.ATELIER_PRICING = currentPricing;
      syncConfig();
      return loadBundle(lang).then(function (bundle) {
        currentBundle = bundle;
        applyLang(lang, det.htmlLang);
      });
    });
  }

  function syncConfig() {
    if (!currentPricing || !window.ATELIER_CONFIG) return;
    window.ATELIER_CONFIG.currency = currentPricing.currency || "EUR";
    window.ATELIER_CONFIG.prices = {
      essentiell: {
        amount: currentPricing.essential.formatted,
        cents: currentPricing.essential.cents,
        eurCents: currentPricing.essential.eurCents,
        name:
          (currentBundle &&
            currentBundle.checkoutPlans &&
            currentBundle.checkoutPlans.essentiell &&
            currentBundle.checkoutPlans.essentiell.name) ||
          "Essential",
      },
      premium: {
        amount: currentPricing.premium.formatted,
        cents: currentPricing.premium.cents,
        eurCents: currentPricing.premium.eurCents,
        name:
          (currentBundle &&
            currentBundle.checkoutPlans &&
            currentBundle.checkoutPlans.premium &&
            currentBundle.checkoutPlans.premium.name) ||
          "Premium",
      },
    };
  }

  function applyLang(lang, htmlLang) {
    if (!currentBundle) return;
    currentLang = lang;
    saveLang(lang);

    var T = currentBundle.t || {};
    var HTML = currentBundle.html || {};
    var META = currentBundle.meta || {};

    document.documentElement.lang = htmlLang || META.htmlLang || lang;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (T[key] != null) el.textContent = interpolate(T[key]);
    });

    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (HTML[key] != null) el.innerHTML = interpolate(HTML[key]);
    });

    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-alt");
      if (T[key] != null) el.alt = interpolate(T[key]);
    });

    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      if (T[key] != null) el.setAttribute("aria-label", interpolate(T[key]));
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (T[key] != null) el.setAttribute("placeholder", interpolate(T[key]));
    });

    document.querySelectorAll("[data-i18n-dot]").forEach(function (el) {
      el.setAttribute("aria-label", socialDotLabel(lang, el.getAttribute("data-i18n-dot")));
    });

    var pageKey = document.body && document.body.getAttribute("data-i18n-page");
    if (pageKey && META.pageTitle && META.pageTitle[pageKey]) {
      document.title = META.pageTitle[pageKey];
    } else if (META.title) {
      document.title = META.title;
    }

    var desc = document.querySelector('meta[name="description"]');
    if (desc && META.description) desc.setAttribute("content", META.description);
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", document.title);
    var ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && META.ogDescription) ogDesc.setAttribute("content", META.ogDescription);
    var ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale && META.locale) ogLocale.setAttribute("content", META.locale);

    var slider = document.getElementById("ba-slider");
    if (slider) {
      slider.setAttribute("aria-label", T["compare.sliderLabel"] || "");
      slider.setAttribute(
        "aria-valuetext",
        sliderValueText(lang, slider.getAttribute("aria-valuenow") || "50")
      );
    }

    ensureLangSwitcher();
    updateLangSwitcher(lang);
    applyDynamicPrices();
    applySocialImages(lang, window.ATELIER_COUNTRY);
    syncConfig();

    window.ATELIER_LANG = lang;
    window.ATELIER_PRICING = currentPricing;
    window.dispatchEvent(
      new CustomEvent("atelier:lang", {
        detail: { lang: lang, country: window.ATELIER_COUNTRY, pricing: currentPricing },
      })
    );
  }

  function boot() {
    if (isBlockedPage()) return;

    var lang = getQueryLang() || getSavedLang() || null;
    resolveLocale(lang).then(function (det) {
      if (det.blocked) {
        window.location.replace(BLOCKED_PATH);
        return;
      }

      currentDetect = det;
      currentPricing = det.pricing;
      window.ATELIER_COUNTRY = det.country || null;
      window.ATELIER_LOCALE_SOURCE = det.source || "default";
      window.ATELIER_PRICING = currentPricing;

      var resolvedLang = getQueryLang() || lang || det.language || DEFAULT_LANG;
      return socialManifestPromise.then(function () {
        return loadBundle(resolvedLang).then(function (bundle) {
          currentBundle = bundle;
          applyLang(resolvedLang, det.htmlLang);
        });
      });
    });
  }

  window.ATELIER_I18N = {
    getLang: function () {
      return currentLang;
    },
    getCountry: function () {
      return window.ATELIER_COUNTRY || null;
    },
    getPricing: function () {
      return currentPricing;
    },
    applyLang: switchLanguage,
    t: function (key) {
      return interpolate((currentBundle && currentBundle.t && currentBundle.t[key]) || key);
    },
    successMsg: function (key) {
      return (currentBundle && currentBundle.successMsgs && currentBundle.successMsgs[key]) || "";
    },
    checkoutPlan: function (plan) {
      return getPlanPricing(plan);
    },
    sliderValueText: function (percent) {
      return sliderValueText(currentLang, percent);
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
