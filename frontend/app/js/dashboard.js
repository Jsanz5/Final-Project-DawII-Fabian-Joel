const PANEL_IDS = ["audit", "history", "content", "analyze"];

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

function bindSidebarToggle() {
  const shell = document.querySelector(".dashboard-shell");
  const sidebar = document.querySelector(".dashboard-sidebar");
  const toggle = document.getElementById("sidebarToggle");
  const rail = document.querySelector(".sidebar-toggle-rail");
  const firstItem = document.querySelector(".sidebar-item");
  if (!shell || !sidebar || !toggle || !rail || !firstItem) return;

  const updateRailPosition = () => {
    const sidebarRect = sidebar.getBoundingClientRect();
    const itemRect = firstItem.getBoundingClientRect();
    const railHeight = rail.offsetHeight || 140;
    const center = itemRect.top + itemRect.height / 2;
    const top = center - sidebarRect.top - railHeight / 2;
    rail.style.top = `${Math.max(24, Math.round(top))}px`;
  };

  toggle.addEventListener("click", () => {
    const isCollapsed = sidebar.classList.toggle("is-collapsed");
    shell.classList.toggle("is-collapsed", isCollapsed);
    toggle.setAttribute(
      "aria-label",
      isCollapsed ? "Expandir barra lateral" : "Contraer barra lateral",
    );
    updateRailPosition();
  });

  updateRailPosition();
  window.addEventListener("resize", updateRailPosition);
  setTimeout(updateRailPosition, 0);
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

function updateCharCount(countId, length, max) {
  const el = document.getElementById(countId);
  if (!el) return;
  el.textContent = `${length} / ${max}`;
  el.classList.toggle("is-over", length > max);
}

function animateResultIslands(container) {
  const islands = container.querySelectorAll(".results-island");
  islands.forEach((island, i) => {
    island.style.animation = "none";
    island.offsetHeight;
    island.style.animation = "";
    island.style.animationName = "islandReveal";
    island.style.animationDuration = "0.4s";
    island.style.animationTimingFunction = "ease";
    island.style.animationFillMode = "both";
    island.style.animationDelay = `${i * 0.07}s`;
  });
}

function bindCopyButtons() {
  document.querySelectorAll(".btn-copy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetId = btn.dataset.copy;
      const mode = btn.dataset.copyMode || "innerText";
      const el = document.getElementById(targetId);
      if (!el) return;

      const text = el.innerText.trim();
      if (!text || text === "N/A") {
        showToast("warning", "No hay contenido para copiar");
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        const icon = btn.querySelector("i");
        const original = icon.className;
        icon.className = "ri-check-line";
        btn.classList.add("is-copied");
        showToast("success", "Copiado al portapapeles");
        setTimeout(() => {
          icon.className = original;
          btn.classList.remove("is-copied");
        }, 1600);
      } catch {
        showToast("error", "No se pudo copiar");
      }
    });
  });
}

function buildPdfSection(accentColor, label, contentHtml) {
  return `<div style="margin-bottom:18px">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
      <span style="width:3px;height:12px;border-radius:2px;background:${accentColor};display:inline-block;flex-shrink:0"></span>
      <span style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280">${label}</span>
    </div>
    <div style="background:#f9fafb;border-radius:8px;padding:12px 14px;border:1px solid #e5e7eb;font-size:13px;color:#1f2937;line-height:1.6">${contentHtml}</div>
  </div>`;
}

function bindContentExport() {
  const btn = document.getElementById("contentExportBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (!window.jspdf || !window.html2canvas) {
      showToast("error", "Librerías PDF no disponibles aún, espera un momento");
      return;
    }

    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ri-loader-4-line"></i> Generando...';
    btn.disabled = true;

    try {
      const metaTitle = document.getElementById("resMetaTitle")?.innerText.trim() || "N/A";
      const metaDesc  = document.getElementById("resMetaDesc")?.innerText.trim()  || "N/A";
      const h1        = document.getElementById("resH1")?.innerText.trim()        || "N/A";
      const bodyText  = document.getElementById("resBody")?.innerText.trim()      || "N/A";
      const cta       = document.getElementById("resCta")?.innerText.trim()       || "N/A";
      const keywords  = [...document.querySelectorAll("#resKeywords li")].map((li) => li.innerText.trim()).filter(Boolean);
      const topic     = document.getElementById("contentTopic")?.value.trim()     || "";
      const type      = document.getElementById("contentType")?.value             || "";
      const now       = new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });

      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:white;font-family:Arial,Helvetica,sans-serif;color:#111827;z-index:-1";

      container.innerHTML = `<div style="padding:52px 48px">

        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:20px;border-bottom:2px solid #f3e8ff">
          <div style="font-size:22px;font-weight:800;color:#7c3aed">Echo<span style="color:#a855f7">SEO</span></div>
          <div style="text-align:right;font-size:11px;color:#6b7280;line-height:1.8">
            <div style="font-weight:700;color:#374151;font-size:12px">Reporte de Contenido SEO</div>
            <div>${now}</div>
            ${topic ? `<div>Tema: ${topic}</div>` : ""}
            ${type ? `<div>Tipo: ${type.charAt(0).toUpperCase() + type.slice(1)}</div>` : ""}
          </div>
        </div>

        <div style="background:#f5f3ff;border-radius:12px;padding:28px 32px;margin-bottom:32px;border:1px solid #ddd6fe">
          <div style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#7c3aed;font-weight:700;margin-bottom:10px">Contenido generado con Inteligencia Artificial</div>
          <div style="font-size:20px;font-weight:700;color:#1e1b4b;line-height:1.3;margin-bottom:${metaDesc !== "N/A" ? "10px" : "0"}">${metaTitle !== "N/A" ? metaTitle : (topic || "Contenido SEO")}</div>
          ${metaDesc !== "N/A" ? `<div style="font-size:12px;color:#4c1d95;line-height:1.65">${metaDesc}</div>` : ""}
        </div>

        <div style="display:flex;gap:16px;margin-bottom:4px">
          <div style="flex:1">${buildPdfSection("#3b82f6", "Meta Título", metaTitle)}</div>
          <div style="flex:1">${buildPdfSection("#f59e0b", "Meta Descripción", metaDesc)}</div>
        </div>

        <div style="display:flex;gap:16px;margin-bottom:4px">
          <div style="flex:1">${buildPdfSection("#10b981", "H1 Recomendado", h1)}</div>
          <div style="flex:1">${buildPdfSection("#ec4899", "Call to Action", cta)}</div>
        </div>

        ${keywords.length ? `
        <div style="margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
            <span style="width:3px;height:12px;border-radius:2px;background:#06b6d4;display:inline-block;flex-shrink:0"></span>
            <span style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280">Keywords Principales</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${keywords.map((kw) => `<span style="background:#e0f2fe;color:#0369a1;padding:5px 12px;border-radius:100px;font-size:12px;font-weight:600">${kw}</span>`).join("")}
          </div>
        </div>` : ""}

        <div style="height:1px;background:#f3f4f6;margin:24px 0"></div>

        <div style="margin-bottom:24px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
            <span style="width:3px;height:12px;border-radius:2px;background:#8b5cf6;display:inline-block;flex-shrink:0"></span>
            <span style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280">Cuerpo de Contenido</span>
          </div>
          <div style="background:#f9fafb;border-radius:8px;padding:16px;border:1px solid #e5e7eb;font-size:13px;color:#1f2937;line-height:1.75;white-space:pre-wrap">${bodyText}</div>
        </div>

        <div style="margin-top:32px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;color:#7c3aed;font-weight:700">EchoSEO</span>
          <span style="font-size:11px;color:#9ca3af">Generado con IA · EchoSEO Dashboard · ${now}</span>
        </div>

      </div>`;

      document.body.appendChild(container);

      const canvas = await window.html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 794,
      });

      document.body.removeChild(container);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const imgH = (canvas.height * pageW) / canvas.width;

      let posY = 0;
      let page = 0;
      while (posY < imgH) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -posY, pageW, imgH);
        posY += pageH;
        page++;
      }

      pdf.save(`reporte-seo-echoseo.pdf`);
      showToast("success", "PDF descargado correctamente");
    } catch (err) {
      console.error("PDF export error:", err);
      showToast("error", "No se pudo generar el PDF");
    } finally {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }
  });
}

function bindContentForm() {
  const form = document.getElementById("contentForm");
  const submitBtn = document.getElementById("contentSubmitBtn");
  const loading = document.getElementById("contentLoading");
  const results = document.getElementById("contentResults");
  const typeInput = document.getElementById("contentType");
  const chipGroup = document.getElementById("contentTypeChips");
  const actionStatus = document.getElementById("contentActionStatus");

  if (!form) return;

  const setActiveChip = (value) => {
    if (!chipGroup) return;
    const chips = chipGroup.querySelectorAll(".content-chip");
    chips.forEach((chip) => {
      const isActive = chip.dataset.value === value;
      chip.classList.toggle("is-active", isActive);
      chip.setAttribute("aria-pressed", String(isActive));
    });
    if (typeInput) typeInput.value = value;
  };

  if (chipGroup) {
    chipGroup.querySelectorAll(".content-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const value = chip.dataset.value || "articulo";
        setActiveChip(value);
      });
    });
  }

  if (typeInput && typeInput.value) {
    setActiveChip(typeInput.value);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const topic = document.getElementById("contentTopic").value;
    const type = typeInput ? typeInput.value : "articulo";
    const locationField = document.getElementById("contentLocation").value;
    let didSucceed = false;

    submitBtn.disabled = true;
    submitBtn.classList.add("is-loading");
    submitBtn.innerHTML = '<i class="ri-sparkling-2-line"></i> Generando...';
    form.classList.add("is-loading");
    showToast("info", "Generando contenido...");
    loading.classList.remove("is-hidden");
    loading.setAttribute("aria-hidden", "false");
    results.classList.add("is-hidden");

    try {
      const data = await window.pySeoService.generateContent(
        topic,
        type,
        locationField,
      );

      const p = data.generated_content || {};

      const metaTitleEl = document.getElementById("resMetaTitle");
      const metaDescEl = document.getElementById("resMetaDesc");

      metaTitleEl.innerText = p.meta_title || "N/A";
      metaDescEl.innerText = p.meta_description || "N/A";
      document.getElementById("resH1").innerText = p.h1 || "N/A";

      const bodyBox = document.getElementById("resBody");
      if (bodyBox) bodyBox.innerHTML = p.body_content || p.body || "N/A";

      const ctaBox = document.getElementById("resCta");
      if (ctaBox) ctaBox.innerText = p.cta || "N/A";

      const keywords = Array.isArray(p.main_keywords) ? p.main_keywords : [];
      const keywordList = document.getElementById("resKeywords");
      if (keywordList) {
        keywordList.innerHTML = keywords.length
          ? keywords.map((word) => `<li>${word}</li>`).join("")
          : "<li>N/A</li>";
      }

      const keywordCount = document.getElementById("keywordCount");
      if (keywordCount) {
        keywordCount.textContent = keywords.length ? `${keywords.length} palabras` : "";
      }

      updateCharCount("metaTitleCount", (p.meta_title || "").length, 60);
      updateCharCount("metaDescCount", (p.meta_description || "").length, 160);

      results.classList.remove("is-hidden");
      animateResultIslands(results);
      showToast("success", "Contenido generado con éxito");
      didSucceed = true;
    } catch (err) {
      showToast("error", err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove("is-loading");
      submitBtn.textContent = "Generar Contenido";

      form.classList.remove("is-loading");
      loading.classList.add("is-hidden");
      loading.setAttribute("aria-hidden", "true");
    }
  });
}

function bindAnalyzeForm() {
  const form = document.getElementById("analyzeForm");
  const submitBtn = document.getElementById("analyzeSubmitBtn");
  const loading = document.getElementById("analyzeLoading");
  const results = document.getElementById("analyzeResults");


bindSidebarToggle();
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const keyword = document.getElementById("analyzeKeyword").value;
    const locationField = document.getElementById("analyzeLocation").value;

    submitBtn.disabled = true;
    submitBtn.classList.add("is-loading");
    loading.classList.remove("is-hidden");
    loading.setAttribute("aria-hidden", "false");
    results.classList.add("is-hidden");

    try {
      const data = await window.pySeoService.analyzeSeo(keyword, locationField);

      const analy = data.seo_analysis || {};
      document.getElementById("resSearchIntent").innerText =
        analy.search_intent || "N/A";
      document.getElementById("resAnalyzeH1").innerText =
        analy.h1_sugerido || "N/A";
      document.getElementById("resContentGap").innerText =
        analy.content_gap || "N/A";

      const h2List = analy.h2_lista || [];
      const h2Ul = document.getElementById("resAnalyzeH2");
      h2Ul.innerHTML = "";
      if (h2List.length) {
        h2List.forEach((h) => {
          const li = document.createElement("li");
          li.innerText = h;
          h2Ul.appendChild(li);
        });
      } else {
        h2Ul.innerHTML = "<li>No data</li>";
      }

      const comps = data.competitors || [];
      const listDiv = document.getElementById("resCompetitorsList");
      listDiv.innerHTML = comps
        .map((c) => {
          return `
          <div class="competitor-card">
            <div>
              <span class="competitor-rank">#${c.ranking || "?"}</span>
              <h4 class="competitor-title">${c.title || "Sin Título"}</h4>
            </div>
            <a href="${c.url}" class="competitor-url" target="_blank">${c.url || "#"}</a>
            <p class="competitor-snippet">${c.snippet || ""}</p>
          </div>
        `;
        })
        .join("");

      results.classList.remove("is-hidden");
      showToast("success", "Análisis de competencia listo");
    } catch (err) {
      showToast("error", err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove("is-loading");
      loading.classList.add("is-hidden");
      loading.setAttribute("aria-hidden", "true");
    }
  });
}

function loadHistory() {
  console.log("History panel defer");
}

document.addEventListener("DOMContentLoaded", () => {
  enforceSession();
  bindSidebar();
  bindAuditForm();
  initWarpCanvas();
  updateResultsEmpty();
  bindContentForm();
  bindAnalyzeForm();
  bindCopyButtons();
  bindContentExport();
  loadHistory();
});
