(function () {
  const API = "/api/admin";
  const titles = {
    dashboard: "Dashboard",
    live: "Live View",
    orders: "Pedidos",
    analytics: "Análises",
    settings: "Configurações",
  };

  const statusLabels = {
    paid: "Pago",
    pending: "Pendente",
    failed: "Falhou",
    refunded: "Reembolsado",
  };

  const planLabels = {
    essentiell: "Essencial",
    premium: "Premium",
  };

  const funnelLabels = {
    landing_view: "Visitou a landing",
    add_to_cart: "Adicionou ao carrinho",
    checkout_view: "Abriu checkout",
    checkout_created: "Iniciou pagamento",
    purchase_completed: "Comprou",
    purchase: "Comprou",
  };

  const $ = (sel) => document.querySelector(sel);
  const loginScreen = $("#login-screen");
  const app = $("#app");
  const TOKEN_KEY = "atelier_admin_token";

  function getStoredToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }

  function setStoredToken(token) {
    try {
      if (token) sessionStorage.setItem(TOKEN_KEY, token);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }

  function authHeaders(extra = {}) {
    const headers = { ...extra };
    const token = getStoredToken();
    if (token) headers["Authorization"] = "Bearer " + token;
    return headers;
  }

  async function api(path, opts = {}) {
    let res;
    try {
      res = await fetch(API + path, {
        credentials: "same-origin",
        headers: authHeaders({ "Content-Type": "application/json", ...(opts.headers || {}) }),
        ...opts,
      });
    } catch {
      throw new Error(
        "Servidor indisponível. Rode npm run dev e acesse /admin/ no mesmo servidor."
      );
    }
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json")
      ? await res.json().catch(() => ({}))
      : {};
    if (!res.ok) {
      if (res.status === 401 && path !== "/login") {
        setStoredToken("");
        showLogin();
      }
      if (!ct.includes("application/json")) {
        throw new Error(
          "API não encontrada. Use npm run dev, não python -m http.server."
        );
      }
      throw new Error(data.error || "Falha na requisição");
    }
    return data;
  }

  function eur(cents) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "EUR",
    }).format((cents || 0) / 100);
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("pt-BR");
  }

  function statusLabel(status) {
    return statusLabels[status] || status;
  }

  function planLabel(plan) {
    return planLabels[plan] || plan;
  }

  function funnelLabel(step) {
    return funnelLabels[step] || step;
  }

  function renderFunnel(el, funnel) {
    if (!el || !funnel?.steps?.length) {
      if (el) el.innerHTML = "<p class='muted'>Sem dados de funil ainda</p>";
      return;
    }
    const max = Math.max(...funnel.steps.map((s) => s.count), 1);
    el.innerHTML = funnel.steps
      .map((s) => {
        const width = Math.max(Math.round((s.count / max) * 100), s.count ? 4 : 0);
        const prevRate = s.rateFromPrev != null ? s.rateFromPrev + "%" : "—";
        const landingRate = s.rateFromLanding != null ? s.rateFromLanding + "%" : "—";
        return `<div class="funnel-row">
          <span class="label">${s.label}</span>
          <div class="bar-wrap"><div class="bar-fill" style="width:${width}%"></div></div>
          <span class="count">${s.count}</span>
          <span class="rate" title="Conversão da etapa anterior">${prevRate} · ${landingRate}</span>
        </div>`;
      })
      .join("");
  }

  async function tryAuth() {
    try {
      await api("/me");
      showApp();
      return true;
    } catch {
      return false;
    }
  }

  function showLogin() {
    loginScreen.classList.remove("hidden");
    app.classList.add("hidden");
  }

  function showApp() {
    loginScreen.classList.add("hidden");
    app.classList.remove("hidden");
    loadDashboard();
    loadProducts();
    $("#webhook-url").textContent = location.origin + "/api/public/stripe/webhook";
  }

  $("#login-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const err = $("#login-error");
    err.classList.add("hidden");
    try {
      const data = await api("/login", {
        method: "POST",
        body: JSON.stringify({ password: fd.get("password") }),
      });
      if (data.token) setStoredToken(data.token);
      await api("/me");
      showApp();
    } catch (e) {
      err.textContent = e.message;
      err.classList.remove("hidden");
    }
  });

  $("#logout-btn").addEventListener("click", async () => {
    setStoredToken("");
    await api("/logout", { method: "POST" });
    location.reload();
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const view = btn.dataset.view;
      $("#view-title").textContent = titles[view];
      document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
      $("#view-" + view).classList.remove("hidden");
      if (view === "dashboard") loadDashboard();
      if (view === "live") loadLive();
      if (view === "orders") loadOrders();
      if (view === "analytics") loadAnalytics();
      if (view === "settings") {
        loadSettings();
        loadProducts();
      }
    });
  });

  async function loadDashboard() {
    const d = await api("/dashboard");
    $("#stat-revenue").textContent = eur(d.analytics.revenueCents);
    $("#stat-today-revenue").textContent = eur(d.today.revenueCents);
    $("#stat-today-orders").textContent = d.today.orders;
    $("#stat-today-views").textContent = d.today.views;

    $("#status-list").innerHTML = (d.statusCounts || [])
      .map((s) => `<li><span>${statusLabel(s.status)}</span><strong>${s.count}</strong></li>`)
      .join("");

    $("#system-list").innerHTML = [
      `<li><span>Stripe configurado</span><strong>${d.stripeConfigured ? "Sim" : "Não"}</strong></li>`,
      `<li><span>Meta Pixel ativo</span><strong>${d.metaPixelConfigured ? "Sim" : "Não"}</strong></li>`,
      `<li><span>Utmify ativo</span><strong>${d.utmifyConfigured ? "Sim" : "Não"}</strong></li>`,
      `<li><span>ZIP Essencial</span><strong>${d.products.essentiell ? "Sim" : "Não"}</strong></li>`,
      `<li><span>ZIP Premium</span><strong>${d.products.premium ? "Sim" : "Não"}</strong></li>`,
    ].join("");

    renderFunnel($("#funnel-chart"), d.funnel);
  }

  async function loadLive() {
    const d = await api("/live");
    renderFunnel($("#live-funnel"), d.funnel);
    $("#live-feed").innerHTML = d.feed
      .map((item) => {
        if (item.type === "order") {
          return `<li><strong>${statusLabel(item.status)}</strong> · ${item.email} · ${planLabel(item.plan)} · ${eur(item.amount_cents)}<div class="time">${fmtDate(item.created_at)}</div></li>`;
        }
        if (item.type === "funnel") {
          const plan = item.plan ? " · " + planLabel(item.plan) : "";
          const email = item.email ? " · " + item.email : "";
          const path = item.path ? `<code>${item.path}</code>` : "";
          return `<li><strong>${funnelLabel(item.step)}</strong>${plan}${email}${path ? " · " + path : ""}<div class="time">${fmtDate(item.created_at)}</div></li>`;
        }
        return `<li>Visita em <code>${item.ref}</code><div class="time">${fmtDate(item.created_at)}</div></li>`;
      })
      .join("") || "<li class='muted'>Nenhuma atividade ainda</li>";
  }

  $("#refresh-live").addEventListener("click", loadLive);

  async function loadOrders() {
    const d = await api("/orders?limit=100");
    $("#orders-body").innerHTML = d.orders
      .map(
        (o) => `<tr>
          <td>${o.order_uid}</td>
          <td>${o.email}</td>
          <td>${planLabel(o.plan)}</td>
          <td>${eur(o.amount_cents)}</td>
          <td><span class="badge ${o.status}">${statusLabel(o.status)}</span></td>
          <td>${fmtDate(o.paid_at)}</td>
        </tr>`
      )
      .join("");
  }

  function renderChart(el, rows, valueKey) {
    if (!rows.length) {
      el.innerHTML = "<p class='muted'>Sem dados</p>";
      return;
    }
    const max = Math.max(...rows.map((r) => r[valueKey] || 0), 1);
    el.innerHTML = rows
      .map((r) => {
        const h = Math.round(((r[valueKey] || 0) / max) * 100);
        return `<div class="bar" style="height:${Math.max(h, 4)}%" title="${r.day}"><span>${(r.day || "").slice(5)}</span></div>`;
      })
      .join("");
  }

  async function loadAnalytics() {
    const d = await api("/analytics?days=30");
    $("#an-revenue").textContent = eur(d.revenueCents);
    const ess = d.planBreakdown.find((p) => p.plan === "essentiell");
    const prem = d.planBreakdown.find((p) => p.plan === "premium");
    $("#an-essential").textContent = ess ? ess.count + " · " + eur(ess.revenue) : "0";
    $("#an-premium").textContent = prem ? prem.count + " · " + eur(prem.revenue) : "0";
    renderChart($("#chart-revenue"), d.ordersByDay, "revenue");
    renderChart($("#chart-views"), d.viewsByDay, "views");
  }

  async function loadProducts() {
    const d = await api("/products");
    d.products.forEach((p) => {
      const el = document.getElementById("product-status-" + p.plan);
      if (!el) return;
      if (p.exists) {
        el.className = "product-status ok";
        el.textContent =
          "✓ " +
          p.filename +
          " · " +
          p.sizeHuman +
          " · atualizado " +
          fmtDate(p.updatedAt);
      } else {
        el.className = "product-status missing";
        el.textContent = "Nenhum ZIP enviado ainda";
      }
    });
  }

  const pendingUploads = { essentiell: null, premium: null };

  function bindUpload(plan) {
    const input = document.getElementById("upload-" + plan);
    const btn = document.querySelector('.upload-submit[data-plan="' + plan + '"]');
    if (!input || !btn) return;

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      pendingUploads[plan] = file || null;
      btn.disabled = !file;
      if (file) {
        btn.textContent =
          "Enviar " + (plan === "premium" ? "Premium" : "Essencial") +
          " (" + formatFileSize(file.size) + ")";
      }
    });

    btn.addEventListener("click", async () => {
      const file = pendingUploads[plan];
      if (!file) return;
      const msg = document.getElementById("upload-msg");
      btn.disabled = true;
      btn.textContent = "Enviando…";
      msg.textContent = "";

      try {
        // 1. Get a short-lived signed upload token from the server
        const startRes = await fetch("/api/admin/upload-resumable", {
          method: "POST",
          credentials: "same-origin",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const startData = await startRes.json().catch(() => ({}));
        if (!startRes.ok) throw new Error(startData.error || "Falha ao iniciar upload.");

        // 2. Upload directly from browser → Supabase Storage via TUS (resumable, 6 MB chunks)
        await new Promise((resolve, reject) => {
          const upload = new tus.Upload(file, {
            endpoint: startData.endpoint,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
              "x-signature": startData.token,
              "x-upsert": "true",
            },
            metadata: {
              bucketName: startData.bucketName,
              objectName: startData.objectName,
              contentType: startData.contentType || "application/zip",
              cacheControl: "3600",
            },
            chunkSize: 6 * 1024 * 1024,
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            onProgress: function (bytesUploaded, bytesTotal) {
              var pct = ((bytesUploaded / bytesTotal) * 100).toFixed(1);
              btn.textContent = "Enviando… " + pct + "%";
              msg.textContent =
                formatFileSize(bytesUploaded) + " / " + formatFileSize(bytesTotal);
            },
            onError: function (error) {
              reject(new Error(error?.message || "Falha no upload resumável."));
            },
            onSuccess: function () {
              resolve();
            },
          });

          // Check for previous uploads to resume from
          upload.findPreviousUploads().then(function (prev) {
            if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
            upload.start();
          });
        });

        msg.textContent = "Upload concluído: " + file.name;
        input.value = "";
        pendingUploads[plan] = null;
        btn.textContent = "Enviar " + (plan === "premium" ? "Premium" : "Essencial");
        btn.disabled = true;
        loadProducts();
        loadDashboard();
      } catch (e) {
        msg.textContent = e.message;
        btn.disabled = false;
        btn.textContent = "Enviar " + (plan === "premium" ? "Premium" : "Essencial");
      }
    });
  }

  function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  }

  bindUpload("essentiell");
  bindUpload("premium");

  $("#settings-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const body = Object.fromEntries(fd.entries());
    body.meta_pixel_enabled = fd.get("meta_pixel_enabled") ? "1" : "0";
    body.utmify_enabled = fd.get("utmify_enabled") ? "1" : "0";
    const btn = ev.target.querySelector('button[type="submit"]');
    const msg = $("#settings-msg");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Salvando…";
    }
    msg.textContent = "";
    try {
      await api("/settings", { method: "PUT", body: JSON.stringify(body) });
      msg.textContent = "✓ Configurações salvas com sucesso.";
      msg.style.color = "var(--ok)";
      await loadSettings();
      loadDashboard();
    } catch (e) {
      msg.textContent = e.message;
      msg.style.color = "var(--danger)";
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Salvar configurações";
      }
    }
  });

  async function loadSettings() {
    try {
      const d = await api("/settings");
      const form = $("#settings-form");
      const secretFields = new Set([
        "stripe_publishable_key",
        "stripe_secret_key",
        "stripe_webhook_secret",
        "meta_pixel_access_token",
        "utmify_api_token",
      ]);
      Object.entries(d.settings).forEach(([key, val]) => {
        const input = form.elements.namedItem(key);
        if (!input) return;
        if (key === "meta_pixel_enabled") {
          input.checked = val === "1";
          return;
        }
        if (key === "utmify_enabled") {
          input.checked = val === "1";
          return;
        }
        if (secretFields.has(key)) {
          input.value = "";
          input.placeholder = val
            ? `${val} (configurado — deixe em branco para manter)`
            : input.placeholder.replace(" (configurado — deixe em branco para manter)", "");
        } else {
          input.value = val ?? "";
        }
      });
    } catch (e) {
      const msg = $("#settings-msg");
      if (msg) {
        msg.textContent = e.message;
        msg.style.color = "var(--danger)";
      }
    }
  }

  setInterval(() => {
    if (app.classList.contains("hidden")) return;
    const active = document.querySelector(".nav-btn.is-active")?.dataset.view;
    if (active === "live") loadLive();
    if (active === "dashboard") loadDashboard();
  }, 15000);

  tryAuth();
})();
