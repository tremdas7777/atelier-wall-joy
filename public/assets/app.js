(function () {
  var cfg = window.ATELIER_CONFIG || {};

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* Checkout URLs from config */
  if (cfg.checkoutEssential) {
    qsa('a[href*="kasse.html?plan=essentiell"]').forEach(function (a) {
      a.href = cfg.checkoutEssential;
    });
  }
  if (cfg.checkoutPremium) {
    qsa('a[href*="kasse.html?plan=premium"]').forEach(function (a) {
      a.href = cfg.checkoutPremium;
    });
  }

  /* Reveal on scroll */
  var reveals = qsa(".reveal-hidden");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("reveal-visible");
        e.target.classList.remove("reveal-hidden");
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("reveal-visible");
      el.classList.remove("reveal-hidden");
    });
  }

  /* Sticky CTA */
  var sticky = qs("#sticky-cta");
  var heroCta = qs("#hero-cta");
  if (sticky && heroCta && "IntersectionObserver" in window) {
    var sio = new IntersectionObserver(function (entries) {
      var visible = entries[0] && entries[0].isIntersecting;
      sticky.classList.toggle("translate-y-full", visible);
      sticky.classList.toggle("translate-y-0", !visible);
    }, { threshold: 0.2 });
    sio.observe(heroCta);
  } else if (sticky) {
    window.addEventListener("scroll", function () {
      var show = window.scrollY > 500;
      sticky.classList.toggle("translate-y-full", !show);
      sticky.classList.toggle("translate-y-0", show);
    }, { passive: true });
  }

  /* Before / after slider */
  var slider = qs("#ba-slider");
  if (slider) {
    var beforeImg = slider.querySelector('img[alt="Vorher"]');
    var line = slider.querySelector(".absolute.inset-y-0");
    var handle = slider.querySelector(".absolute.top-1\\/2") || slider.querySelector('[aria-hidden="true"]');
    var handles = slider.querySelectorAll(".absolute");
    var divider = null;
    var knob = null;
    handles.forEach(function (el) {
      if (el.className.indexOf("inset-y-0") !== -1 && el.className.indexOf("w-px") !== -1) divider = el;
      if (el.className.indexOf("top-1/2") !== -1) knob = el;
    });

    var pos = 50;
    function setPos(p) {
      pos = Math.max(0, Math.min(100, p));
      if (beforeImg) beforeImg.style.clipPath = "inset(0 " + (100 - pos) + "% 0 0)";
      if (divider) divider.style.left = pos + "%";
      if (knob) knob.style.left = pos + "%";
      slider.setAttribute("aria-valuenow", String(Math.round(pos)));
      var valText = window.ATELIER_I18N
        ? window.ATELIER_I18N.sliderValueText(Math.round(pos))
        : Math.round(pos) + " % des Originalbildes sichtbar";
      slider.setAttribute("aria-valuetext", valText);
    }

    function fromEvent(ev) {
      var rect = slider.getBoundingClientRect();
      var x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
      setPos((x / rect.width) * 100);
    }

    var dragging = false;
    slider.addEventListener("pointerdown", function (ev) {
      dragging = true;
      slider.setPointerCapture(ev.pointerId);
      fromEvent(ev);
    });
    slider.addEventListener("pointermove", function (ev) {
      if (!dragging) return;
      fromEvent(ev);
    });
    slider.addEventListener("pointerup", function () { dragging = false; });
    slider.addEventListener("pointercancel", function () { dragging = false; });
    slider.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowLeft") { setPos(pos - 3); ev.preventDefault(); }
      if (ev.key === "ArrowRight") { setPos(pos + 3); ev.preventDefault(); }
    });
  }

  /* Social proof carousel */
  var track = qs("#social-track");
  var prev = qs("#social-prev");
  var next = qs("#social-next");
  var dotsWrap = qs("#social-dots");
  if (track) {
    var slides = qsa(":scope > *", track);
    var dots = dotsWrap ? qsa("button", dotsWrap) : [];

    function perView() {
      return window.matchMedia("(min-width: 768px)").matches ? 3 : 1;
    }
    function slideWidth() {
      return slides[0] ? slides[0].getBoundingClientRect().width : track.clientWidth;
    }
    function currentIndex() {
      return Math.round(track.scrollLeft / slideWidth());
    }
    function go(i) {
      var max = Math.max(0, slides.length - perView());
      i = Math.max(0, Math.min(max, i));
      track.scrollTo({ left: i * slideWidth(), behavior: "smooth" });
    }
    function paintDots() {
      var i = currentIndex();
      dots.forEach(function (d, idx) {
        var on = idx === i;
        d.classList.toggle("w-6", on);
        d.classList.toggle("bg-gold", on);
        d.classList.toggle("w-2", !on);
        d.classList.toggle("bg-white/30", !on);
      });
    }
    if (prev) prev.addEventListener("click", function () { go(currentIndex() - 1); });
    if (next) next.addEventListener("click", function () { go(currentIndex() + 1); });
    dots.forEach(function (d, idx) {
      d.addEventListener("click", function () { go(idx); });
    });
    track.addEventListener("scroll", paintDots, { passive: true });
    window.addEventListener("resize", paintDots);
    paintDots();
  }

  /* Smooth hash links */
  qsa('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (ev) {
      var id = a.getAttribute("href").slice(1);
      var el = id && document.getElementById(id);
      if (!el) return;
      ev.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();
