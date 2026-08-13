(function () {
  "use strict";

  var STORAGE_KEY = "atelier-utm";
  var KEYS = ["src", "sck", "utm_source", "utm_campaign", "utm_medium", "utm_content", "utm_term"];

  function readStored() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveStored(data) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function captureFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var stored = readStored();
    var changed = false;
    KEYS.forEach(function (key) {
      var val = params.get(key);
      if (val) {
        stored[key] = val;
        changed = true;
      }
    });
    if (changed) saveStored(stored);
    return stored;
  }

  function get() {
    var stored = readStored();
    var out = {};
    KEYS.forEach(function (key) {
      out[key] = stored[key] || null;
    });
    return out;
  }

  captureFromUrl();
  window.ATELIER_UTM = { get: get, capture: captureFromUrl };
})();
