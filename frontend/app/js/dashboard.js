const PANEL_IDS = ["audit", "history", "content", "analyze"];

function setActivePanel(panelId) {
  PANEL_IDS.forEach((id) => {
    const panel = document.getElementById(`panel-${id}`);
    const btn   = document.querySelector(`.sidebar-item[data-panel='${id}']`);
    if (panel) panel.classList.toggle("active", id === panelId);
    if (btn)   btn.classList.toggle("active",   id === panelId);
  });
}

function bindSidebar() {
  document.querySelectorAll(".sidebar-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panelId = btn.dataset.panel;
      if (panelId) {
        setActivePanel(panelId);
        if (panelId === "history") loadHistory();
      }
    });
  });
}

function bindSidebarToggle() {
  const shell     = document.querySelector(".dashboard-shell");
  const sidebar   = document.querySelector(".dashboard-sidebar");
  const toggle    = document.getElementById("sidebarToggle");
  const rail      = document.querySelector(".sidebar-toggle-rail");
  const firstItem = document.querySelector(".sidebar-item");
  if (!shell || !sidebar || !toggle || !rail || !firstItem) return;

  const updateRailPosition = () => {
    const sidebarRect = sidebar.getBoundingClientRect();
    const itemRect    = firstItem.getBoundingClientRect();
    const railHeight  = rail.offsetHeight || 140;
    const center      = itemRect.top + itemRect.height / 2;
    const top         = center - sidebarRect.top - railHeight / 2;
    rail.style.top    = `${Math.max(24, Math.round(top))}px`;
  };

  toggle.addEventListener("click", () => {
    const isCollapsed = sidebar.classList.toggle("is-collapsed");
    shell.classList.toggle("is-collapsed", isCollapsed);
    toggle.setAttribute("aria-label",
      isCollapsed ? "Expandir barra lateral" : "Contraer barra lateral");
    updateRailPosition();
  });

  updateRailPosition();
  window.addEventListener("resize", updateRailPosition);
  setTimeout(updateRailPosition, 0);
}

function enforceSession() {
  const session = localStorage.getItem("user_session");
  if (!session) {
    showToast("warning", "Inicia sesion para acceder al dashboard");
    setTimeout(() => { window.location.href = "login.html"; }, 800);
  }
}

function loadSidebarUser() {
  const raw = localStorage.getItem("user_session");
  if (!raw) return;
  try {
    const session  = JSON.parse(raw);
    const email    = session.email || "";
    const username = email.split("@")[0] || "Usuario";
    const initial  = username.charAt(0).toUpperCase();
    const avatar    = document.getElementById("sidebarUserAvatar");
    const nameEl    = document.getElementById("sidebarUserName");
    const emailEl   = document.getElementById("sidebarUserEmail");
    const logoutBtn = document.getElementById("sidebarLogout");
    if (nameEl)  nameEl.textContent  = username;
    if (emailEl) emailEl.style.display = "none";
    if (avatar) {
      const savedAvatar = localStorage.getItem("user_avatar");
      if (savedAvatar) {
        avatar.innerHTML = `<img src="${savedAvatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
        avatar.style.overflow = "hidden";
        avatar.style.padding  = "0";
      } else {
        avatar.textContent = initial;
      }
    }
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("user_session");
        window.location.href = "login.html";
      });
    }
  } catch (e) {}
}

function normalizeUrl(input) {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return Boolean(url.hostname && url.protocol.startsWith("http"));
  } catch { return false; }
}

function updateResultsEmpty() {
  const set = (id, html, isText = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (isText) el.textContent = html; else el.innerHTML = html;
  };
  set("auditStatus",   "Listo para auditar", true);
  set("auditScore",    "--",                 true);
  set("auditErrors",   "<li>Sin datos aun</li>");
  set("auditWarnings", "<li>Sin datos aun</li>");
  set("auditGood",     "<li>Sin datos aun</li>");
  set("auditKeywords", "<li>Sin datos aun</li>");
  set("auditContent",  "Sin datos aun",      true);
}

function renderList(target, items, limit = 5) {
  if (!target) return;
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) { target.innerHTML = "<li>Sin datos</li>"; return; }
  const limited = (limit === null || limit === undefined) ? list : list.slice(0, limit);
  target.innerHTML = limited.map((item) => `<li>${item}</li>`).join("");
}

function renderAuditResults(payload) {
  if (!payload || !payload.seo_analysis) { updateResultsEmpty(); return; }
  const get         = (id) => document.getElementById(id);
  const status      = get("auditStatus");
  const score       = get("auditScore");
  const resultsWrap = get("auditResults");
  const content     = get("auditContent");
  if (status) status.textContent = payload.status || "Completado";
  if (score)  score.textContent  = payload.seo_analysis.global_score ?? "--";
  renderList(get("auditErrors"),   payload.seo_analysis.errors);
  renderList(get("auditWarnings"), payload.seo_analysis.warnings);
  renderList(get("auditGood"),     payload.seo_analysis.good_practices);
  renderList(get("auditKeywords"), payload.seo_analysis.keyword_suggestions);
  if (content)     content.textContent = payload.seo_analysis.content_generation || "Sin datos";
  if (resultsWrap) resultsWrap.classList.remove("is-hidden");
}

let historyCache = [];
let historySelected = null;
let historySelectedReport = null;
const HISTORY_PAGE_SIZE = 5;
let historyOffset = 0;
let historyHasMore = false;
let historyLoading = false;

function parseReportData(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch (err) { console.error("Report parse error:", err); return null; }
  }
  return raw;
}

function formatHistoryDate(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-ES", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function simplifyHistoryUrl(value) {
  if (!value) return "URL no disponible";
  try {
    const url = new URL(value);
    const path = url.pathname || "/";
    return `${url.hostname}${path}`;
  } catch {
    return value.replace(/^https?:\/\//i, "");
  }
}

function showHistoryList() {
  const container = document.getElementById("historyContainer");
  const detail    = document.getElementById("historyDetail");
  const loadMore  = document.getElementById("historyLoadMoreWrap");
  if (container) container.style.display = "";
  if (detail) detail.style.display = "none";
  if (loadMore) loadMore.style.display = historyHasMore ? "flex" : "none";
}

function showHistoryDetail() {
  const container = document.getElementById("historyContainer");
  const detail    = document.getElementById("historyDetail");
  const loadMore  = document.getElementById("historyLoadMoreWrap");
  if (container) container.style.display = "none";
  if (detail) {
    detail.style.display = "";
    detail.scrollTop = 0;
  }
  if (loadMore) loadMore.style.display = "none";
  window.scrollTo(0, 0);
}

function renderHistoryDetail(audit) {
  historySelected = audit || null;
  historySelectedReport = parseReportData(audit?.report_data);
  const report   = historySelectedReport || {};
  const analysis = report.seo_analysis || {};
  const get      = (id) => document.getElementById(id);

  const statusEl = get("historyAuditStatus");
  const metaEl   = get("historyAuditMeta");
  const scoreEl  = get("historyAuditScore");
  const content  = get("historyAuditContent");

  if (statusEl) statusEl.textContent = report.status || "Auditoría completada";
  if (metaEl) {
    const urlLabel  = audit?.url ? `URL: ${simplifyHistoryUrl(audit.url)}` : "URL no disponible";
    const dateLabel = audit?.created_at ? `Fecha: ${formatHistoryDate(audit.created_at)}` : "Fecha no disponible";
    metaEl.textContent = `${urlLabel} · ${dateLabel}`;
  }
  if (scoreEl) scoreEl.textContent = analysis.global_score ?? "--";

  renderList(get("historyAuditErrors"), analysis.errors, null);
  renderList(get("historyAuditWarnings"), analysis.warnings, null);
  renderList(get("historyAuditGood"), analysis.good_practices, null);
  renderList(get("historyAuditKeywords"), analysis.keyword_suggestions, null);
  if (content) content.textContent = analysis.content_generation || "Sin datos";

  const detailCard = get("historyDetail");
  if (detailCard) animateResultIslands(detailCard);
  showHistoryDetail();
}

function renderHistoryList(items, { append = false } = {}) {
  const container = document.getElementById("historyContainer");
  if (!container) return;
  if (!items || items.length === 0) {
    if (!append) {
      container.innerHTML = `
        <div class="panel-empty">
          <h3>Sin auditorías guardadas</h3>
          <p>Cuando realices auditorías aparecerán aquí.</p>
        </div>`;
    }
    return;
  }
  const html = items.map((item) => {
    const dateLabel = formatHistoryDate(item.created_at);
    const urlLabel  = simplifyHistoryUrl(item.url);
    const disabled  = !item.report_data;
    const scoreLabel = (item.seo_score !== null && item.seo_score !== undefined)
      ? ` · Score: ${item.seo_score}`
      : "";
    return `
      <div class="history-card" data-history-id="${item.id}">
        <div class="history-info">
          <h3>${urlLabel}</h3>
          <p class="history-meta-line">${dateLabel}${scoreLabel}</p>
        </div>
        <button class="history-view-btn" type="button" data-history-id="${item.id}" aria-label="Ver" ${disabled ? "disabled" : ""}>
          <i class="ri-eye-line" aria-hidden="true"></i>
        </button>
      </div>`;
  }).join("");

  if (append) {
    container.insertAdjacentHTML("beforeend", html);
  } else {
    container.innerHTML = html;
  }
}

function updateHistoryLoadMore() {
  const wrap = document.getElementById("historyLoadMoreWrap");
  const btn  = document.getElementById("historyLoadMore");
  const detail = document.getElementById("historyDetail");
  if (!wrap || !btn) return;
  if (detail && detail.style.display !== "none") {
    wrap.style.display = "none";
  } else {
    wrap.style.display = historyHasMore ? "flex" : "none";
  }
  btn.disabled = historyLoading;
  btn.textContent = historyLoading ? "Cargando..." : "Cargar más";
}

function bindAuditForm() {
  const input   = document.getElementById("auditUrlInput");
  const button  = document.getElementById("auditSubmitBtn");
  const frame   = document.getElementById("canvasFrame");
  const loading = document.getElementById("auditLoading");
  if (!input || !button) return;

  const setLoading = (isLoading) => {
    if (frame)   frame.classList.toggle("is-loading", isLoading);
    if (loading) loading.setAttribute("aria-hidden", String(!isLoading));
    if (input)   input.disabled = isLoading;
  };

  const submit = async () => {
    const normalized = normalizeUrl(input.value);
    if (!normalized || !isValidUrl(normalized)) {
      showToast("warning", "Ingresa una URL valida"); return;
    }
    input.value = normalized;
    button.disabled = true;
    button.classList.add("is-loading");
    setLoading(true);
    showToast("info", "Iniciando auditoria...");
    try {
      const result = await window.pySeoService.auditSeoUrl(normalized);
      const sessionStr = localStorage.getItem("user_session");
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        await window.pySeoService.saveAuditResult(session.id, normalized, result);
      }
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
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); submit(); }
  });
}

function initWarpCanvas() {
  const canvas = document.getElementById("auditWarpCanvas");
  if (!canvas) return;
  const ctx   = canvas.getContext("2d");
  const state = {
    width:0, height:0, centerX:0, centerY:0, radius:0,
    mouseX:0, mouseY:0, targetMouseX:0, targetMouseY:0,
    hasMouse:false, tick:0,
  };
  const resize = () => {
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width  = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Object.assign(state, {
      width:rect.width, height:rect.height,
      centerX:rect.width/2, centerY:rect.height/2,
      radius:Math.min(rect.width, rect.height)*0.46,
    });
  };
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    state.targetMouseX = e.clientX - rect.left;
    state.targetMouseY = e.clientY - rect.top;
    if (!state.hasMouse) { state.mouseX = state.targetMouseX; state.mouseY = state.targetMouseY; }
    state.hasMouse = true;
  });
  canvas.addEventListener("mouseleave", () => { state.hasMouse = false; });
  const draw = () => {
    ctx.clearRect(0, 0, state.width, state.height);
    if (state.hasMouse) {
      state.mouseX += (state.targetMouseX - state.mouseX) * 0.05;
      state.mouseY += (state.targetMouseY - state.mouseY) * 0.05;
    }
    const points=240, maxWarp=state.radius*0.15, lineWidth=state.radius*0.35;
    let gradient;
    if (ctx.createConicGradient) {
      gradient = ctx.createConicGradient(state.tick*0.005, state.centerX, state.centerY);
      gradient.addColorStop(0,   "rgba(241,150,255,0.95)");
      gradient.addColorStop(0.3, "rgba(255,190,150,0.85)");
      gradient.addColorStop(0.6, "rgba(145,224,255,0.9)");
      gradient.addColorStop(0.8, "rgba(200,180,255,0.9)");
      gradient.addColorStop(1,   "rgba(241,150,255,0.95)");
    } else {
      gradient = ctx.createLinearGradient(0, 0, state.width, state.height);
      gradient.addColorStop(0,   "rgba(241,150,255,0.9)");
      gradient.addColorStop(0.5, "rgba(145,224,255,0.9)");
      gradient.addColorStop(1,   "rgba(255,190,150,0.8)");
    }
    ctx.beginPath();
    for (let i=0; i<=points; i++) {
      const angle=i/points*Math.PI*2;
      const baseX=state.centerX+Math.cos(angle)*state.radius;
      const baseY=state.centerY+Math.sin(angle)*state.radius;
      let offset=0;
      if (state.hasMouse) {
        const dx=baseX-state.mouseX, dy=baseY-state.mouseY;
        const dist=Math.sqrt(dx*dx+dy*dy);
        const influence=Math.max(0,1-dist/(state.radius*1.5));
        offset=influence*maxWarp;
      }
      const wave=(Math.sin(state.tick*0.015+angle*3)*0.4+Math.cos(state.tick*0.02+angle*4)*0.3+Math.sin(state.tick*0.01+angle*2)*0.3)*(state.radius*0.12);
      const r=state.radius+offset+wave;
      const x=state.centerX+Math.cos(angle)*r, y=state.centerY+Math.sin(angle)*r;
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.lineWidth=lineWidth; ctx.lineJoin="round"; ctx.lineCap="round";
    ctx.strokeStyle=gradient; ctx.stroke();
    state.tick++;
    requestAnimationFrame(draw);
  };
  resize();
  window.addEventListener("resize", resize);
  draw();
}

function updateCharCount(countId, length, max) {
  const el = document.getElementById(countId);
  if (!el) return;
  el.textContent = `${length} / ${max}`;
  el.classList.toggle("is-over", length > max);
}

function animateResultIslands(container) {
  container.querySelectorAll(".results-island").forEach((island, i) => {
    island.style.animation = "none";
    island.offsetHeight;
    island.style.cssText += [
      "animation-name:islandReveal","animation-duration:0.4s",
      "animation-timing-function:ease","animation-fill-mode:both",
      `animation-delay:${i*0.07}s`,
    ].join(";");
  });
}

function bindCopyButtons() {
  document.querySelectorAll(".btn-copy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const el   = document.getElementById(btn.dataset.copy);
      const text = el?.innerText.trim();
      if (!text || text === "N/A") { showToast("warning", "No hay contenido para copiar"); return; }
      try {
        await navigator.clipboard.writeText(text);
        const icon=btn.querySelector("i"), original=icon.className;
        icon.className="ri-check-line"; btn.classList.add("is-copied");
        showToast("success", "Copiado al portapapeles");
        setTimeout(()=>{ icon.className=original; btn.classList.remove("is-copied"); }, 1600);
      } catch { showToast("error", "No se pudo copiar"); }
    });
  });
}

function bindContentForm() {
  const form      = document.getElementById("contentForm");
  const submitBtn = document.getElementById("contentSubmitBtn");
  const loading   = document.getElementById("contentLoading");
  const results   = document.getElementById("contentResults");
  const typeInput = document.getElementById("contentType");
  const chipGroup = document.getElementById("contentTypeChips");
  if (!form) return;

  const setActiveChip = (value) => {
    if (!chipGroup) return;
    chipGroup.querySelectorAll(".content-chip").forEach((chip) => {
      const isActive = chip.dataset.value === value;
      chip.classList.toggle("is-active", isActive);
      chip.setAttribute("aria-pressed", String(isActive));
    });
    if (typeInput) typeInput.value = value;
  };

  chipGroup?.querySelectorAll(".content-chip").forEach((chip) => {
    chip.addEventListener("click", () => setActiveChip(chip.dataset.value || "articulo"));
  });
  if (typeInput?.value) setActiveChip(typeInput.value);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const topic         = document.getElementById("contentTopic").value;
    const type          = typeInput?.value || "articulo";
    const locationField = document.getElementById("contentLocation").value;
    submitBtn.disabled=true; submitBtn.classList.add("is-loading");
    submitBtn.innerHTML='<i class="ri-sparkling-2-line"></i> Generando...';
    form.classList.add("is-loading");
    loading.classList.remove("is-hidden"); loading.setAttribute("aria-hidden","false");
    results.classList.add("is-hidden");
    showToast("info","Generando contenido...");
    try {
      const data = await window.pySeoService.generateContent(topic, type, locationField);
      const p    = data.generated_content || {};
      document.getElementById("resMetaTitle").innerText = p.meta_title       || "N/A";
      document.getElementById("resMetaDesc").innerText  = p.meta_description || "N/A";
      document.getElementById("resH1").innerText        = p.h1               || "N/A";
      const bodyBox = document.getElementById("resBody");
      if (bodyBox) bodyBox.innerHTML = p.body_content || p.body || "N/A";
      const ctaBox = document.getElementById("resCta");
      if (ctaBox) ctaBox.innerText = p.cta || "N/A";
      const keywords=Array.isArray(p.main_keywords)?p.main_keywords:[];
      const keywordList=document.getElementById("resKeywords");
      if (keywordList) keywordList.innerHTML=keywords.length?keywords.map(w=>`<li>${w}</li>`).join(""):"<li>N/A</li>";
      const keywordCount=document.getElementById("keywordCount");
      if (keywordCount) keywordCount.textContent=keywords.length?`${keywords.length} palabras`:"";
      updateCharCount("metaTitleCount",(p.meta_title||"").length,60);
      updateCharCount("metaDescCount",(p.meta_description||"").length,160);
      results.classList.remove("is-hidden");
      animateResultIslands(results);
      showToast("success","Contenido generado con éxito");
    } catch(err) { showToast("error", err.message); }
    finally {
      submitBtn.disabled=false; submitBtn.classList.remove("is-loading");
      submitBtn.textContent="Generar Contenido";
      form.classList.remove("is-loading");
      loading.classList.add("is-hidden"); loading.setAttribute("aria-hidden","true");
    }
  });
}

function blockStyle() {
  return "background:#f9fafb;border-radius:7px;padding:10px 12px 16px 12px;border:1px solid #e5e7eb";
}

function blockLabel(accentColor, label) {
  return `<div style="display:flex;align-items:center;gap:5px;margin-bottom:6px">
    <span style="width:3px;height:11px;border-radius:2px;background:${accentColor};display:inline-block;flex-shrink:0"></span>
    <span style="font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280">${label}</span>
  </div>`;
}

function blockContent(text) {
  return `<div style="font-size:12px;color:#1f2937;line-height:1.5">${text}</div>`;
}

function bodyTextToHtml(text) {
  return text
    .split(/\n{2,}/)
    .map(p => p.trim()).filter(p => p.length > 0)
    .map(p => `<p style="margin:0 0 8px 0;line-height:1.6;color:#1f2937;font-size:12px">${p.replace(/\n/g,"<br>")}</p>`)
    .join("");
}

function calcPageBreaks(container, pageHpx) {
  const totalH   = container.scrollHeight;
  const contTop  = container.getBoundingClientRect().top;
  const bottoms = [...container.querySelectorAll("*")]
    .map(el => el.getBoundingClientRect().bottom - contTop)
    .filter(b => b > 0 && b < totalH)
    .sort((a, b) => a - b);
  const breaks  = [0];
  let targetEnd = pageHpx;
  while (targetEnd < totalH) {
    let bestY = targetEnd;
    for (let i = bottoms.length - 1; i >= 0; i--) {
      if (bottoms[i] <= targetEnd) { bestY = bottoms[i]; break; }
    }
    const lastBreak = breaks[breaks.length - 1];
    if (bestY <= lastBreak + 20) bestY = targetEnd;
    breaks.push(bestY);
    targetEnd = bestY + pageHpx;
  }
  return breaks;
}

function bindContentExport() {
  const btn = document.getElementById("contentExportBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (!window.jspdf || !window.html2canvas) {
      showToast("error", "Librerías PDF no disponibles aún, espera un momento"); return;
    }
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ri-loader-4-line"></i> Generando...';
    btn.disabled  = true;

    try {
      const getText  = (id) => document.getElementById(id)?.innerText.trim() || "N/A";
      const metaTitle = getText("resMetaTitle");
      const metaDesc  = getText("resMetaDesc");
      const h1        = getText("resH1");
      const bodyText  = getText("resBody");
      const cta       = getText("resCta");
      const keywords  = [...document.querySelectorAll("#resKeywords li")].map(li => li.innerText.trim()).filter(Boolean);
      const topic     = document.getElementById("contentTopic")?.value.trim() || "";
      const type      = document.getElementById("contentType")?.value || "";
      const now       = new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
      const bodyHtml  = bodyTextToHtml(bodyText);

      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:white;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;color:#111827;z-index:-1";
      container.innerHTML = `<div style="padding:32px 36px">
        ${pdfHeader("Reporte de Contenido SEO", `${topic ? "Tema: " + topic : ""}${type ? " · " + type.charAt(0).toUpperCase() + type.slice(1) : ""}`, now)}
        <div style="background:#f5f3ff;border-radius:10px;padding:18px 24px 22px;margin-bottom:16px;border:1px solid #ddd6fe">
          <div style="font-size:17px;font-weight:700;color:#1e1b4b;line-height:1.3;margin-bottom:6px">
            ${metaTitle !== "N/A" ? metaTitle : (topic || "Contenido SEO")}
          </div>
          ${metaDesc !== "N/A" ? `<div style="font-size:11px;color:#4c1d95;line-height:1.55">${metaDesc}</div>` : ""}
        </div>
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1;${blockStyle()}">${blockLabel("#3b82f6", "Meta Título")}${blockContent(metaTitle)}</div>
          <div style="flex:1;${blockStyle()}">${blockLabel("#f59e0b", "Meta Descripción")}${blockContent(metaDesc)}</div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1;${blockStyle()}">${blockLabel("#10b981", "H1 Recomendado")}${blockContent(h1)}</div>
          <div style="flex:1;${blockStyle()}">${blockLabel("#ec4899", "Call to Action")}${blockContent(cta)}</div>
        </div>
        ${keywords.length ? `
        <div style="margin-bottom:14px">
          ${blockLabel("#06b6d4", "Keywords Principales")}
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
            ${keywords.map(kw => `<span style="background:#e0f2fe;color:#0369a1;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600">${kw}</span>`).join("")}
          </div>
        </div>` : ""}
        <div style="height:1px;background:#e5e7eb;margin:14px 0 16px"></div>
        <div style="margin-bottom:16px">
          ${blockLabel("#8b5cf6", "Cuerpo de Contenido")}
          <div style="background:#f9fafb;border-radius:7px;padding:14px 16px;border:1px solid #e5e7eb;margin-top:6px;overflow-wrap:break-word;word-break:break-word">
            ${bodyHtml}
          </div>
        </div>
        <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb">
          <span style="font-size:13px;color:#7c3aed;font-weight:700">EchoSEO</span>
        </div>
      </div>`;
      document.body.appendChild(container);
      await runPdfExport(container, "reporte-seo-echoseo.pdf", btn, originalHtml);
      showToast("success", "PDF descargado correctamente");
    } catch (err) {
      console.error("PDF export error:", err);
      showToast("error", "No se pudo generar el PDF");
      btn.innerHTML = originalHtml;
      btn.disabled  = false;
    }
  });
}

function renderAnalyzeResults(data) {
  const resultsEl = document.getElementById("analyzeResults");
  if (!resultsEl) return;

  const analy  = data.seo_analysis || {};
  const comps  = data.competitors  || [];
  const h2List = analy.h2_lista    || [];

  const copyableField = (id, text, extraClass = "") => `
    <div class="island-header">
      <div id="${id}" class="results-copy ${extraClass}">${text || "N/A"}</div>
      <button class="btn-copy" data-copy="${id}" aria-label="Copiar">
        <i class="ri-file-copy-line"></i>
      </button>
    </div>`;

  const competitorCards = comps.length
    ? comps.map((c, idx) => `
        <div class="results-island analyze-competitor-card">
          <div class="analyze-competitor-header">
            <span class="analyze-rank">#${c.ranking || idx + 1}</span>
            <h4 class="analyze-competitor-title">${c.title || "Sin título"}</h4>
          </div>
          <a href="${c.url || "#"}" class="analyze-competitor-url" target="_blank" rel="noopener">
            <i class="ri-external-link-line"></i>${c.url || "—"}
          </a>
          ${c.snippet ? `<p class="analyze-competitor-snippet">${c.snippet}</p>` : ""}
        </div>`).join("")
    : `<p class="analyze-empty">No se encontraron competidores.</p>`;

  resultsEl.innerHTML = `
    <div class="analyze-results-wrap">

      <div class="analyze-results-header">
        <div>
          <p class="panel-eyebrow">Análisis Completado</p>
          <h2>Resultados de Competencia</h2>
        </div>
        <button class="btn-export" id="analyzeExportBtn" type="button">
          <i class="ri-download-line"></i> Exportar
        </button>
      </div>

      <div class="results-islands">

        <div class="results-island analyze-intent">
          <div class="island-header">
            <div class="island-title"><i class="ri-search-eye-line"></i> Intención de Búsqueda</div>
          </div>
          ${copyableField("resSearchIntent", analy.search_intent, "analyze-intent-copy")}
        </div>

        <div class="results-island analyze-h1-island">
          <div class="island-header">
            <div class="island-title"><i class="ri-heading"></i> H1 Sugerido</div>
          </div>
          ${copyableField("resAnalyzeH1", analy.h1_sugerido, "analyze-h1-copy")}
        </div>

        <div class="results-island results-island-wide analyze-gap">
          <div class="island-header">
            <div class="island-title"><i class="ri-bar-chart-grouped-line"></i> Content Gap</div>
          </div>
          ${copyableField("resContentGap", analy.content_gap, "analyze-gap-copy")}
        </div>

        <div class="results-island results-island-wide analyze-h2-island">
          <div class="island-header">
            <div class="island-title"><i class="ri-list-check-3"></i> Estructura H2 Recomendada</div>
            <span class="keyword-count">${h2List.length} secciones</span>
          </div>
          <ul id="resAnalyzeH2" class="analyze-h2-list">
            ${h2List.length
              ? h2List.map((h, i) => `
                  <li class="analyze-h2-item">
                    <span class="analyze-h2-num">${i + 1}</span>
                    <span>${h}</span>
                  </li>`).join("")
              : `<li class="analyze-h2-item"><span>Sin datos</span></li>`}
          </ul>
        </div>

      </div>

      <div class="analyze-competitors-section">
        <div class="analyze-section-label">
          <i class="ri-trophy-line"></i> Top Competidores
          <span class="keyword-count">${comps.length} resultados</span>
        </div>
        <div id="resCompetitorsList" class="analyze-competitors-grid">
          ${competitorCards}
        </div>
      </div>

    </div>`;

  resultsEl.classList.remove("is-hidden");
  animateResultIslands(resultsEl);
  bindCopyButtons();
  bindAnalyzeExport();
}
async function runPdfExport(container, filename, btn, originalHtml) {
  const pxPerMm = 794 / 210;
  const pageHpx = 297 * pxPerMm;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const breakStarts = calcPageBreaks(container, pageHpx);
  const totalLogH   = container.scrollHeight;
  const SCALE  = 3;
  const canvas = await window.html2canvas(container, {
    scale: SCALE, useCORS: true, backgroundColor: "#ffffff", logging: false, width: 794,
  });
  document.body.removeChild(container);
  const { jsPDF } = window.jspdf;
  const pdf   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  for (let i = 0; i < breakStarts.length; i++) {
    if (i > 0) pdf.addPage();
    const startY = breakStarts[i];
    const endY   = (i + 1 < breakStarts.length) ? breakStarts[i + 1] : totalLogH;
    const sliceH = endY - startY;
    const sliceCanvas  = document.createElement("canvas");
    sliceCanvas.width  = canvas.width;
    sliceCanvas.height = Math.max(1, Math.round(sliceH * SCALE));
    sliceCanvas.getContext("2d").drawImage(
      canvas, 0, Math.round(startY * SCALE), canvas.width, Math.round(sliceH * SCALE),
      0, 0, canvas.width, Math.round(sliceH * SCALE),
    );
    pdf.addImage(sliceCanvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageW, sliceH / pxPerMm);
  }
  pdf.save(filename);
  btn.innerHTML = originalHtml;
  btn.disabled  = false;
}

function pdfHeader(title, subtitle, now) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #f3e8ff">
      <div style="font-size:20px;font-weight:800;color:#7c3aed">Echo<span style="color:#a855f7">SEO</span></div>
      <div style="text-align:right;font-size:10px;color:#6b7280;line-height:1.6">
        <div style="font-weight:700;color:#374151;font-size:11px">${title}</div>
        <div>${now}</div>
        ${subtitle ? `<div>${subtitle}</div>` : ""}
      </div>
    </div>`;
}

function pdfSection(accentColor, label, content) {
  return `
    <div style="background:#f9fafb;border-radius:8px;padding:14px;border:1px solid #e5e7eb;margin-bottom:12px">
      <div style="font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${accentColor};margin-bottom:8px">${label}</div>
      <div style="font-size:11px;color:#374151;line-height:1.6">${content}</div>
    </div>`;
}

function pdfListHtml(items) {
  return items.length
    ? items.map(i => `<li style="padding:3px 0;border-bottom:1px solid #f3f4f6;font-size:11px;color:#374151">${i}</li>`).join("")
    : `<li style="font-size:11px;color:#9ca3af">Sin datos</li>`;
}

async function exportAuditPdf({
  btn,
  filename,
  title,
  url,
  score,
  errors,
  warnings,
  good,
  keywords,
  content,
  logLabel = "Audit",
}) {
  if (!window.jspdf || !window.html2canvas) {
    showToast("error", "Librerías PDF no disponibles aún, espera un momento");
    return;
  }
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="ri-loader-4-line"></i> Generando...';
  btn.disabled  = true;

  try {
    const errorList   = Array.isArray(errors) ? errors : [];
    const warningList = Array.isArray(warnings) ? warnings : [];
    const goodList    = Array.isArray(good) ? good : [];
    const keywordList = Array.isArray(keywords) ? keywords : [];
    const now = new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });

    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:white;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;color:#111827;z-index:-1";
    container.innerHTML = `<div style="padding:32px 36px">
      ${pdfHeader(title, url, now)}
      <div style="background:#f5f3ff;border-radius:10px;padding:18px 24px;margin-bottom:16px;border:1px solid #ddd6fe;display:flex;align-items:center;gap:20px">
        <div style="text-align:center;min-width:70px">
          <div style="font-size:36px;font-weight:800;color:#7c3aed">${score}</div>
          <div style="font-size:10px;color:#6b7280;margin-top:2px">GLOBAL SCORE</div>
        </div>
        <div style="flex:1;font-size:11px;color:#4c1d95">${url ? `<strong>URL:</strong> ${url}` : "Auditoría SEO completada"}</div>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:12px">
        <div style="flex:1;background:#fff1f2;border-radius:8px;padding:14px;border:1px solid #fecdd3">
          <div style="font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#e11d48;margin-bottom:8px">Errores (${errorList.length})</div>
          <ul style="margin:0;padding-left:16px">${pdfListHtml(errorList)}</ul>
        </div>
        <div style="flex:1;background:#fffbeb;border-radius:8px;padding:14px;border:1px solid #fde68a">
          <div style="font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#d97706;margin-bottom:8px">Advertencias (${warningList.length})</div>
          <ul style="margin:0;padding-left:16px">${pdfListHtml(warningList)}</ul>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:12px">
        <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:14px;border:1px solid #bbf7d0">
          <div style="font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#16a34a;margin-bottom:8px">Buenas Prácticas (${goodList.length})</div>
          <ul style="margin:0;padding-left:16px">${pdfListHtml(goodList)}</ul>
        </div>
        <div style="flex:1;background:#f0f9ff;border-radius:8px;padding:14px;border:1px solid #bae6fd">
          <div style="font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#0369a1;margin-bottom:8px">Keywords Sugeridas</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">${keywordList.length ? keywordList.map(k=>`<span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:100px;font-size:10px">${k}</span>`).join("") : `<span style="font-size:11px;color:#9ca3af">Sin datos</span>`}</div>
        </div>
      </div>
      ${content && content !== "N/A" && content !== "Sin datos aun" ? pdfSection("#8b5cf6", "Sugerencia de Contenido IA", content) : ""}
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb">
        <span style="font-size:13px;color:#7c3aed;font-weight:700">EchoSEO</span>
      </div>
    </div>`;
    document.body.appendChild(container);
    await runPdfExport(container, filename, btn, originalHtml);
    showToast("success", "PDF descargado correctamente");
  } catch (err) {
    console.error(`${logLabel} PDF export error:`, err);
    showToast("error", "No se pudo generar el PDF");
    btn.innerHTML = originalHtml;
    btn.disabled  = false;
  }
}

function bindAuditExport() {
  const btn = document.getElementById("auditExportBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const getList = (id) => [...document.querySelectorAll(`#${id} li`)].map(li => li.innerText.trim()).filter(Boolean);
    const getText = (id) => document.getElementById(id)?.innerText.trim() || "N/A";
    const url      = document.getElementById("auditUrlInput")?.value || "";
    const score    = getText("auditScore");
    const errors   = getList("auditErrors");
    const warnings = getList("auditWarnings");
    const good     = getList("auditGood");
    const keywords = getList("auditKeywords");
    const content  = getText("auditContent");

    await exportAuditPdf({
      btn,
      filename: "auditoria-seo-echoseo.pdf",
      title: "Reporte de Auditoría SEO",
      url,
      score,
      errors,
      warnings,
      good,
      keywords,
      content,
      logLabel: "Audit",
    });
  });
}

function bindAnalyzeExport() {
  const btn = document.getElementById("analyzeExportBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    if (!window.jspdf || !window.html2canvas) {
      showToast("error", "Librerías PDF no disponibles aún, espera un momento"); return;
    }
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ri-loader-4-line"></i> Generando...';
    btn.disabled  = true;
    try {
      const getText  = (id) => document.getElementById(id)?.innerText.trim() || "N/A";
      const getList  = (id) => [...document.querySelectorAll(`#${id} li`)].map(li => li.innerText.trim()).filter(Boolean);
      const keyword   = document.getElementById("analyzeKeyword")?.value || "";
      const location  = document.getElementById("analyzeLocation")?.value || "";
      const intent    = getText("resSearchIntent");
      const h1        = getText("resAnalyzeH1");
      const gap       = getText("resContentGap");
      const h2List    = getList("resAnalyzeH2");
      const competitors = [...document.querySelectorAll(".analyze-competitor-card")].map(card => ({
        rank:    card.querySelector(".analyze-rank")?.innerText.trim()            || "",
        title:   card.querySelector(".analyze-competitor-title")?.innerText.trim() || "Sin título",
        url:     card.querySelector(".analyze-competitor-url")?.innerText.trim()   || "",
        snippet: card.querySelector(".analyze-competitor-snippet")?.innerText.trim() || "",
      }));
      const now = new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });

      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:white;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;color:#111827;z-index:-1";
      container.innerHTML = `<div style="padding:32px 36px">
        ${pdfHeader("Reporte de Análisis de Competencia", keyword ? `Keyword: ${keyword}${location ? " · " + location : ""}` : "", now)}
        <div style="display:flex;gap:12px;margin-bottom:12px">
          ${pdfSection("#6366f1", "Intención de Búsqueda", intent)}
          ${pdfSection("#10b981", "H1 Sugerido", h1)}
        </div>
        ${pdfSection("#f59e0b", "Content Gap", gap)}
        <div style="background:#f9fafb;border-radius:8px;padding:14px;border:1px solid #e5e7eb;margin-bottom:16px">
          <div style="font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8b5cf6;margin-bottom:8px">Estructura H2 Recomendada (${h2List.length} secciones)</div>
          <ol style="margin:0;padding-left:18px">${h2List.length ? h2List.map(h=>`<li style="font-size:11px;color:#374151;padding:2px 0">${h}</li>`).join("") : `<li style="font-size:11px;color:#9ca3af">Sin datos</li>`}</ol>
        </div>
        <div style="margin-bottom:12px">
          <div style="font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#374151;margin-bottom:10px">Top Competidores (${competitors.length})</div>
          ${competitors.map(c=>`
            <div style="background:#f9fafb;border-radius:8px;padding:12px;border:1px solid #e5e7eb;margin-bottom:8px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="background:#7c3aed;color:white;font-size:9px;font-weight:700;padding:2px 7px;border-radius:100px">${c.rank}</span>
                <span style="font-size:11px;font-weight:700;color:#1f2937">${c.title}</span>
              </div>
              <div style="font-size:10px;color:#6366f1;margin-bottom:4px">${c.url}</div>
              ${c.snippet ? `<div style="font-size:10px;color:#6b7280">${c.snippet}</div>` : ""}
            </div>`).join("")}
        </div>
        <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb">
          <span style="font-size:13px;color:#7c3aed;font-weight:700">EchoSEO</span>
        </div>
      </div>`;
      document.body.appendChild(container);
      await runPdfExport(container, "competencia-seo-echoseo.pdf", btn, originalHtml);
      showToast("success", "PDF descargado correctamente");
    } catch (err) {
      console.error("Analyze PDF export error:", err);
      showToast("error", "No se pudo generar el PDF");
      btn.innerHTML = originalHtml;
      btn.disabled  = false;
    }
  });
}

function bindAnalyzeForm() {
  const form      = document.getElementById("analyzeForm");
  const submitBtn = document.getElementById("analyzeSubmitBtn");
  const loading   = document.getElementById("analyzeLoading");
  const results   = document.getElementById("analyzeResults");
  const labelEl   = form?.querySelector(".analyze-loader-label");
  if (!form) return;

  const MESSAGES = [
    "Escaneando SERPs",
    "Detectando competidores",
    "Procesando datos",
    "Generando insights",
  ];

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const keyword       = document.getElementById("analyzeKeyword").value;
    const locationField = document.getElementById("analyzeLocation").value;

    submitBtn.disabled = true;
    form.classList.add("is-loading");
    loading.classList.remove("is-hidden");
    loading.setAttribute("aria-hidden", "false");
    results.classList.add("is-hidden");
    showToast("info", "Iniciando análisis de competencia...");

    let msgIdx = 0;
    if (labelEl) labelEl.textContent = MESSAGES[0];

    const cycleMessage = () => {
      if (!labelEl) return;
      labelEl.style.opacity = "0";
      setTimeout(() => {
        msgIdx = (msgIdx + 1) % MESSAGES.length;
        labelEl.textContent = MESSAGES[msgIdx];
        labelEl.style.opacity = "1";
      }, 300);
    };
    const msgInterval = setInterval(cycleMessage, 2000);

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    try {
      const data = await window.pySeoService.analyzeSeo(keyword, locationField);
      renderAnalyzeResults(data);
      showToast("success", "Análisis de competencia listo");
    } catch(err) {
      showToast("error", err.message);
    } finally {
      clearInterval(msgInterval);
      if (labelEl) { labelEl.textContent = MESSAGES[0]; labelEl.style.opacity = "1"; }
      submitBtn.disabled = false;
      form.classList.remove("is-loading");
      loading.classList.add("is-hidden");
      loading.setAttribute("aria-hidden", "true");
    }
  });
}

function bindHistoryControls() {
  const backBtn = document.getElementById("historyBackBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      showHistoryList();
      updateHistoryLoadMore();
      window.scrollTo(0, 0);
    });
  }

  const container = document.getElementById("historyContainer");
  if (container) {
    container.addEventListener("click", (event) => {
      const btn = event.target.closest(".history-view-btn");
      if (!btn) return;
      const id = Number(btn.dataset.historyId);
      const record = historyCache.find((a) => a.id === id);
      if (!record || !record.report_data) {
        showToast("warning", "No hay detalles disponibles para esta auditoría");
        return;
      }
      renderHistoryDetail(record);
    });
  }

  const loadMoreBtn = document.getElementById("historyLoadMore");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      if (!historyHasMore || historyLoading) return;
      fetchHistoryPage({ append: true });
    });
  }

  const exportBtn = document.getElementById("historyExportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", async () => {
      if (!historySelectedReport || !historySelectedReport.seo_analysis) {
        showToast("warning", "Selecciona una auditoría para exportar");
        return;
      }
      const analysis = historySelectedReport.seo_analysis || {};
      await exportAuditPdf({
        btn: exportBtn,
        filename: "auditoria-seo-historial.pdf",
        title: "Reporte de Auditoría SEO",
        url: historySelected?.url || "",
        score: analysis.global_score ?? "--",
        errors: analysis.errors,
        warnings: analysis.warnings,
        good: analysis.good_practices,
        keywords: analysis.keyword_suggestions,
        content: analysis.content_generation,
        logLabel: "History",
      });
    });
  }
}

async function fetchHistoryPage({ append = false } = {}) {
  const container = document.getElementById("historyContainer");
  const loading   = document.getElementById("historyLoading");
  if (!container) return;

  if (!append) {
    showHistoryList();
    historySelected = null;
    historySelectedReport = null;
    historyOffset = 0;
    historyCache = [];
    historyHasMore = false;
  }

  const sessionStr = localStorage.getItem("user_session");
  if (!sessionStr) {
    container.innerHTML = `
      <div class="panel-empty">
        <h3>Inicia sesión para ver tu historial</h3>
        <p>Accede con tu cuenta para cargar las auditorías guardadas.</p>
      </div>`;
    historyHasMore = false;
    updateHistoryLoadMore();
    return;
  }

  let session = null;
  try {
    session = JSON.parse(sessionStr);
  } catch (err) {
    console.error("Session parse error:", err);
    showToast("error", "No se pudo leer la sesión");
    container.innerHTML = `
      <div class="panel-empty">
        <h3>Sesión inválida</h3>
        <p>Vuelve a iniciar sesión para cargar el historial.</p>
      </div>`;
    historyHasMore = false;
    updateHistoryLoadMore();
    return;
  }

  historyLoading = true;
  updateHistoryLoadMore();

  if (!append && loading) {
    loading.style.display = "flex";
    loading.setAttribute("aria-hidden", "false");
  }

  try {
    const response = await fetch(`../../backend/api/seo/history.php?user_id=${encodeURIComponent(session.id)}&limit=${HISTORY_PAGE_SIZE}&offset=${historyOffset}`);
    const data = await response.json();
    if (!response.ok || data.status !== "success") {
      throw new Error(data?.message || "No se pudo cargar el historial");
    }
    const pageItems = Array.isArray(data.data) ? data.data : [];
    historyCache = append ? historyCache.concat(pageItems) : pageItems;
    renderHistoryList(pageItems, { append });
    historyHasMore = Boolean(data.pagination?.has_more);
    const nextOffset = Number(data.pagination?.offset ?? historyOffset) + Number(data.pagination?.limit ?? HISTORY_PAGE_SIZE);
    historyOffset = Number.isNaN(nextOffset) ? historyOffset + HISTORY_PAGE_SIZE : nextOffset;
    updateHistoryLoadMore();
  } catch (err) {
    console.error("History load error:", err);
    if (!append) {
      showToast("error", "No se pudo cargar el historial");
      container.innerHTML = `
        <div class="panel-empty">
          <h3>Error al cargar el historial</h3>
          <p>Inténtalo nuevamente en unos minutos.</p>
        </div>`;
    } else {
      showToast("error", "No se pudo cargar más auditorías");
    }
    historyHasMore = false;
    updateHistoryLoadMore();
  } finally {
    if (!append && loading) {
      loading.style.display = "none";
      loading.setAttribute("aria-hidden", "true");
    }
    historyLoading = false;
    updateHistoryLoadMore();
  }
}

async function loadHistory() {
  await fetchHistoryPage({ append: false });
}

document.addEventListener("DOMContentLoaded", () => {
  enforceSession();
  loadSidebarUser();
  bindSidebar();
  bindSidebarToggle();
  bindAuditForm();
  initWarpCanvas();
  updateResultsEmpty();
  bindContentForm();
  bindAnalyzeForm();
  bindCopyButtons();
  bindContentExport();
  bindAuditExport();
  bindHistoryControls();
  loadHistory();

  const pendingUrl = localStorage.getItem("pending_audit_url");
  if (pendingUrl) {
    localStorage.removeItem("pending_audit_url");
    setActivePanel("audit");
    const input = document.getElementById("auditUrlInput");
    if (input) {
      input.value = pendingUrl;
      setTimeout(() => document.getElementById("auditSubmitBtn")?.click(), 400);
    }
  }
});
