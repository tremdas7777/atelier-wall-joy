(function () {
  "use strict";

  function skipPage() {
    var path = window.location.pathname || "";
    return /\/admin(\/|$)/.test(path) || /unavailable\.html$/i.test(path);
  }

  function storageKey(key) {
    return "atelier_funnel_" + key;
  }

  function oncePerSession(key) {
    try {
      if (sessionStorage.getItem(storageKey(key))) return false;
      sessionStorage.setItem(storageKey(key), "1");
    } catch {
      /* ignore */
    }
    return true;
  }

  function send(payload) {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    }).catch(function () {});
  }

  function trackPageView() {
    send({
      path: (location.pathname || "/") + (location.search || ""),
      referrer: document.referrer || undefined,
    });
  }

  function trackFunnel(event, plan) {
    var payload = {
      event: event,
      path: (location.pathname || "/") + (location.search || ""),
      referrer: document.referrer || undefined,
    };
    if (plan) payload.plan = plan;
    send(payload);
  }

  function resolvePlanFromHref(href) {
    return href.indexOf("premium") >= 0 ? "premium" : "essentiell";
  }

  function resolveCheckoutPlan() {
    var fromBody = document.body && document.body.getAttribute("data-checkout-plan");
    if (fromBody) {
      return fromBody.toLowerCase() === "premium" ? "premium" : "essentiell";
    }
    var params = new URLSearchParams(location.search || "");
    return params.get("plan") === "premium" ? "premium" : "essentiell";
  }

  if (skipPage()) return;

  trackPageView();

  var page = document.body && document.body.getAttribute("data-i18n-page");
  var isLanding =
    !page && (location.pathname === "/" || /index\.html$/i.test(location.pathname));

  if (isLanding && oncePerSession("landing")) {
    trackFunnel("landing_view");
  }

  if (page === "checkout") {
    var checkoutPlan = resolveCheckoutPlan();
    if (oncePerSession("checkout_" + checkoutPlan)) {
      trackFunnel("checkout_view", checkoutPlan);
    }
  }

  document.addEventListener(
    "click",
    function (ev) {
      var link =
        ev.target && ev.target.closest ? ev.target.closest('a[href*="kasse.html"]') : null;
      if (!link) return;
      var plan = resolvePlanFromHref(link.getAttribute("href") || "");
      if (!oncePerSession("cart_" + plan)) return;
      trackFunnel("add_to_cart", plan);
    },
    true,
  );
})();
