const PANEL_IDS = ["audit", "history", "content", "settings"];

function setActivePanel(panelId) {
  PANEL_IDS.forEach((id) => {
    const panel = document.getElementById(`panel-${id}`);
    const btn = document.querySelector(`.sidebar-item[data-panel='${id}']`);
    if (panel) {
      panel.classList.toggle("active", id === panelId);
    }
    if (btn) {
      btn.classList.toggle("active", id === panelId);
    }
  });
}

function normalizeUrl(input) {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return Boolean(url.hostname && url.protocol.startsWith("http"));
  } catch (error) {
    return false;
  }
}

function updateResultsEmpty() {
  const status = document.getElementById("auditStatus");
  const score = document.getElementById("auditScore");
  const errors = document.getElementById("auditErrors");
  const warnings = document.getElementById("auditWarnings");
  const good = document.getElementById("auditGood");
  const keywords = document.getElementById("auditKeywords");
  const content = document.getElementById("auditContent");

  if (status) status.textContent = "Listo para auditar";
  if (score) score.textContent = "--";
  if (errors) errors.innerHTML = "<li>Sin datos aun</li>";
  if (warnings) warnings.innerHTML = "<li>Sin datos aun</li>";
  if (good) good.innerHTML = "<li>Sin datos aun</li>";
  if (keywords) keywords.innerHTML = "<li>Sin datos aun</li>";
  if (content) content.textContent = "Sin datos aun";
}

function renderList(target, items) {
  if (!target) return;
  if (!items || items.length === 0) {
    target.innerHTML = "<li>Sin datos</li>";
    return;
  }
  target.innerHTML = items
    .slice(0, 5)
    .map((item) => `<li>${item}</li>`)
    .join("");
}

function renderAuditResults(payload) {
  const status = document.getElementById("auditStatus");
  const score = document.getElementById("auditScore");
  const errors = document.getElementById("auditErrors");
  const warnings = document.getElementById("auditWarnings");
  const good = document.getElementById("auditGood");
  const keywords = document.getElementById("auditKeywords");
  const content = document.getElementById("auditContent");
  const resultsWrap = document.getElementById("auditResults");

  if (!payload || !payload.seo_analysis) {
    updateResultsEmpty();
    return;
  }

  if (status) status.textContent = payload.status || "Completado";
  if (score) score.textContent = payload.seo_analysis.global_score ?? "--";

  renderList(errors, payload.seo_analysis.errors);
  renderList(warnings, payload.seo_analysis.warnings);
  renderList(good, payload.seo_analysis.good_practices);
  renderList(keywords, payload.seo_analysis.keyword_suggestions);
  if (content) {
    content.textContent =
      payload.seo_analysis.content_generation || "Sin datos";
  }
  if (resultsWrap) resultsWrap.classList.remove("is-hidden");
}

function bindSidebar() {
  document.querySelectorAll(".sidebar-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panelId = btn.dataset.panel;
      if (panelId) setActivePanel(panelId);
    });
  });
}

function bindAuditForm() {
  const input = document.getElementById("auditUrlInput");
  const button = document.getElementById("auditSubmitBtn");
  const frame = document.getElementById("canvasFrame");
  const loading = document.getElementById("auditLoading");

  if (!input || !button) return;

  const setLoading = (isLoading) => {
    if (frame) frame.classList.toggle("is-loading", isLoading);
    if (loading) loading.setAttribute("aria-hidden", String(!isLoading));
    if (input) input.disabled = isLoading;
  };

  const submit = async () => {
    const rawValue = input.value;
    const normalized = normalizeUrl(rawValue);

    if (!normalized || !isValidUrl(normalized)) {
      showToast("warning", "Ingresa una URL valida");
      return;
    }

    input.value = normalized;
    button.disabled = true;
    button.classList.add("is-loading");
    setLoading(true);
    showToast("info", "Iniciando auditoria...");

    try {
      const result = await window.pySeoService.auditSeoUrl(normalized);
      renderAuditResults(result);
      showToast("success", "Auditoria completada");
    } catch (error) {
      console.error("Audit error:", error);
      showToast("error", "No se pudo completar la auditoria");
    } finally {
      button.disabled = false;
      button.classList.remove("is-loading");
      setLoading(false);
    }
  };

  button.addEventListener("click", submit);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  });
}

function enforceSession() {
  const session = localStorage.getItem("user_session");
  if (!session) {
    showToast("warning", "Inicia sesion para acceder al dashboard");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 800);
  }
}

function initWarpCanvas() {
  const canvas = document.getElementById("auditWarpCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const state = {
    width: 0,
    height: 0,
    centerX: 0,
    centerY: 0,
    radius: 0,
    mouseX: 0,
    mouseY: 0,
    targetMouseX: 0,
    targetMouseY: 0,
    hasMouse: false,
    tick: 0,
  };

  const resize = () => {
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.width = rect.width;
    state.height = rect.height;
    state.centerX = rect.width / 2;
    state.centerY = rect.height / 2;
    state.radius = Math.min(rect.width, rect.height) * 0.46;
  };

  const handleMove = (event) => {
    const rect = canvas.getBoundingClientRect();
    state.targetMouseX = event.clientX - rect.left;
    state.targetMouseY = event.clientY - rect.top;
    if (!state.hasMouse) {
      state.mouseX = state.targetMouseX;
      state.mouseY = state.targetMouseY;
    }
    state.hasMouse = true;
  };

  const handleLeave = () => {
    state.hasMouse = false;
  };

  const draw = () => {
    ctx.clearRect(0, 0, state.width, state.height);

    if (state.hasMouse) {
      state.mouseX += (state.targetMouseX - state.mouseX) * 0.05;
      state.mouseY += (state.targetMouseY - state.mouseY) * 0.05;
    }

    const points = 240;
    const maxWarp = state.radius * 0.15;
    const lineWidth = state.radius * 0.35;

    // Gradiente orgánico simulando el colorido del diseño de Unicorn Studio
    let gradient;
    if (ctx.createConicGradient) {
      gradient = ctx.createConicGradient(
        state.tick * 0.005,
        state.centerX,
        state.centerY,
      );
      gradient.addColorStop(0, "rgba(241, 150, 255, 0.95)"); // Rosa/Amethyst fuerte
      gradient.addColorStop(0.3, "rgba(255, 190, 150, 0.85)"); // Naranja suave
      gradient.addColorStop(0.6, "rgba(145, 224, 255, 0.9)"); // Azul cielo
      gradient.addColorStop(0.8, "rgba(200, 180, 255, 0.9)"); // Purpura etéreo
      gradient.addColorStop(1, "rgba(241, 150, 255, 0.95)");
    } else {
      gradient = ctx.createLinearGradient(0, 0, state.width, state.height);
      gradient.addColorStop(0, "rgba(241, 150, 255, 0.9)");
      gradient.addColorStop(0.5, "rgba(145, 224, 255, 0.9)");
      gradient.addColorStop(1, "rgba(255, 190, 150, 0.8)");
    }

    ctx.beginPath();
    for (let i = 0; i <= points; i += 1) {
      const angle = (i / points) * Math.PI * 2;
      const baseX = state.centerX + Math.cos(angle) * state.radius;
      const baseY = state.centerY + Math.sin(angle) * state.radius;
      let offset = 0;

      if (state.hasMouse) {
        const dx = baseX - state.mouseX;
        const dy = baseY - state.mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist / (state.radius * 1.5));
        offset = influence * maxWarp;
      }

      // Añadir vaporosidad extra simulando ruido mediante ondas superpuestas
      const w1 = Math.sin(state.tick * 0.015 + angle * 3);
      const w2 = Math.cos(state.tick * 0.02 + angle * 4);
      const w3 = Math.sin(state.tick * 0.01 + angle * 2);
      const wave = (w1 * 0.4 + w2 * 0.3 + w3 * 0.3) * (state.radius * 0.12);

      const finalRadius = state.radius + offset + wave;
      const x = state.centerX + Math.cos(angle) * finalRadius;
      const y = state.centerY + Math.sin(angle) * finalRadius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();

    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = gradient;
    ctx.stroke();

    state.tick += 1;
    requestAnimationFrame(draw);
  };

  resize();
  window.addEventListener("resize", resize);
  canvas.addEventListener("mousemove", handleMove);
  canvas.addEventListener("mouseleave", handleLeave);
  draw();
}

document.addEventListener("DOMContentLoaded", () => {
  enforceSession();
  bindSidebar();
  bindAuditForm();
  initWarpCanvas();
  updateResultsEmpty();
});
