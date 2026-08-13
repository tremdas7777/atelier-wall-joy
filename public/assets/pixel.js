(function () {
  "use strict";

  var loaded = false;
  var pixelId = null;
  var clickBound = false;

  function skipPage() {
    var path = window.location.pathname || "";
    return /\/admin(\/|$)/.test(path) || /unavailable\.html$/i.test(path);
  }

  function loadFbSdk() {
    if (window.fbq) return;
    var n = (window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    var t = document.createElement("script");
    t.async = true;
    t.src = "https://connect.facebook.net/en_US/fbevents.js";
    var s = document.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(t, s);
  }

  function track(event, params) {
    if (!window.fbq || !pixelId) return;
    if (params) window.fbq("track", event, params);
    else window.fbq("track", event);
  }

  function planValue(plan) {
    var pricing = window.ATELIER_PRICING;
    if (!pricing) return null;
    var p = plan === "premium" ? pricing.premium : pricing.essential;
    if (!p) return null;
    return {
      value: p.cents ? p.cents / 100 : undefined,
      currency: (p.currency || pricing.currency || "EUR").toUpperCase(),
    };
  }

  function bindCheckoutClicks() {
    if (clickBound) return;
    clickBound = true;
    document.addEventListener(
      "click",
      function (ev) {
        var link = ev.target && ev.target.closest ? ev.target.closest('a[href*="kasse.html"]') : null;
        if (!link) return;
        var href = link.getAttribute("href") || "";
        var plan = href.indexOf("premium") >= 0 ? "premium" : "essentiell";
        var price = planValue(plan);
        var params = {
          content_name: plan === "premium" ? "Premium" : "Essential",
          content_type: "product",
          content_ids: [plan],
        };
        if (price && price.value != null) {
          params.value = price.value;
          params.currency = price.currency;
        }
        track("AddToCart", params);
      },
      true,
    );
  }

  function trackPageEvents() {
    var page = document.body && document.body.getAttribute("data-i18n-page");
    if (page === "checkout") {
      var plan =
        (document.body.getAttribute("data-checkout-plan") || "essentiell").toLowerCase() ===
        "premium"
          ? "premium"
          : "essentiell";
      var price = planValue(plan);
      var params = { content_category: "digital_product", content_ids: [plan] };
      if (price && price.value != null) {
        params.value = price.value;
        params.currency = price.currency;
      }
      track("InitiateCheckout", params);
      return;
    }
    if (!page && (location.pathname === "/" || /index\.html$/i.test(location.pathname))) {
      track("ViewContent", {
        content_type: "product",
        content_name: "Atelier Wallpapers",
        content_ids: ["essentiell", "premium"],
      });
    }
  }

  function initPixel(id) {
    if (loaded || !id) return;
    pixelId = String(id);
    loadFbSdk();
    window.fbq("init", pixelId);
    window.fbq("track", "PageView");
    loaded = true;
    bindCheckoutClicks();
    trackPageEvents();
  }

  function trackPurchase(data) {
    if (!data) return;
    var params = {
      content_type: "product",
      content_name: data.contentName || data.plan || "Wallpapers",
      currency: (data.currency || "EUR").toUpperCase(),
    };
    if (data.value != null && !isNaN(data.value)) params.value = Number(data.value);
    if (data.orderId) params.order_id = String(data.orderId);
    if (data.plan) params.content_ids = [data.plan];
    if (data.eventId && window.fbq) {
      window.fbq("track", "Purchase", params, { eventID: String(data.eventId) });
      return;
    }
    track("Purchase", params);
  }

  window.ATELIER_PIXEL = {
    track: track,
    trackPurchase: trackPurchase,
    isReady: function () {
      return loaded;
    },
  };

  if (skipPage()) return;

  fetch("/api/marketing/config", { credentials: "same-origin" })
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(function (cfg) {
      if (!cfg || !cfg.enabled || !cfg.pixelId) return;
      initPixel(String(cfg.pixelId));
    })
    .catch(function () {});
})();
