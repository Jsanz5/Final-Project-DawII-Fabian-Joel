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
      if (panelId) setActivePanel(panelId);
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
    if (avatar)  avatar.textContent  = initial;
    if (nameEl)  nameEl.textContent  = username;
    if (emailEl) emailEl.textContent = email;
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

function renderList(target, items) {
  if (!target) return;
  if (!items || items.length === 0) { target.innerHTML = "<li>Sin datos</li>"; return; }
  target.innerHTML = items.slice(0, 5).map((item) => `<li>${item}</li>`).join("");
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
      showToast("error","Librerías PDF no disponibles aún, espera un momento"); return;
    }
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ri-loader-4-line"></i> Generando...';
    btn.disabled  = true;

    try {
      const getText = (id) => document.getElementById(id)?.innerText.trim() || "N/A";
      const metaTitle = getText("resMetaTitle");
      const metaDesc  = getText("resMetaDesc");
      const h1        = getText("resH1");
      const bodyText  = getText("resBody");
      const cta       = getText("resCta");
      const keywords  = [...document.querySelectorAll("#resKeywords li")]
                          .map(li => li.innerText.trim()).filter(Boolean);
      const topic     = document.getElementById("contentTopic")?.value.trim() || "";
      const type      = document.getElementById("contentType")?.value          || "";
      const now       = new Date().toLocaleDateString("es-ES",
                          { year:"numeric", month:"long", day:"numeric" });
      const bodyHtml  = bodyTextToHtml(bodyText);

      const container = document.createElement("div");
      container.style.cssText = [
        "position:fixed","left:-9999px","top:0",
        "width:794px","background:white",
        "font-family:Arial,Helvetica,sans-serif",
        "font-size:12px","line-height:1.4",
        "color:#111827","z-index:-1",
      ].join(";");

      container.innerHTML = `<div style="padding:32px 36px">

        <div style="display:flex;justify-content:space-between;align-items:flex-start;
                    margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #f3e8ff">
          <div style="font-size:20px;font-weight:800;color:#7c3aed">Echo<span style="color:#a855f7">SEO</span></div>
          <div style="text-align:right;font-size:10px;color:#6b7280;line-height:1.6">
            <div style="font-weight:700;color:#374151;font-size:11px">Reporte de Contenido SEO</div>
            <div>${now}</div>
            ${topic ? `<div>Tema: ${topic}</div>` : ""}
            ${type  ? `<div>Tipo: ${type.charAt(0).toUpperCase()+type.slice(1)}</div>` : ""}
          </div>
        </div>

        <div style="background:#f5f3ff;border-radius:10px;padding:18px 24px 22px;
                    margin-bottom:16px;border:1px solid #ddd6fe">
          <div style="font-size:17px;font-weight:700;color:#1e1b4b;line-height:1.3;margin-bottom:6px">
            ${metaTitle !== "N/A" ? metaTitle : (topic || "Contenido SEO")}
          </div>
          ${metaDesc !== "N/A"
            ? `<div style="font-size:11px;color:#4c1d95;line-height:1.55">${metaDesc}</div>` : ""}
        </div>

        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1;${blockStyle()}">${blockLabel("#3b82f6","Meta Título")}${blockContent(metaTitle)}</div>
          <div style="flex:1;${blockStyle()}">${blockLabel("#f59e0b","Meta Descripción")}${blockContent(metaDesc)}</div>
        </div>

        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1;${blockStyle()}">${blockLabel("#10b981","H1 Recomendado")}${blockContent(h1)}</div>
          <div style="flex:1;${blockStyle()}">${blockLabel("#ec4899","Call to Action")}${blockContent(cta)}</div>
        </div>

        ${keywords.length ? `
        <div style="margin-bottom:14px">
          ${blockLabel("#06b6d4","Keywords Principales")}
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
            ${keywords.map(kw=>`<span style="background:#e0f2fe;color:#0369a1;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600">${kw}</span>`).join("")}
          </div>
        </div>` : ""}

        <div style="height:1px;background:#e5e7eb;margin:14px 0 16px"></div>

        <div style="margin-bottom:16px">
          ${blockLabel("#8b5cf6","Cuerpo de Contenido")}
          <div style="background:#f9fafb;border-radius:7px;padding:14px 16px;
                      border:1px solid #e5e7eb;margin-top:6px;
                      overflow-wrap:break-word;word-break:break-word">
            ${bodyHtml}
          </div>
        </div>

        <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;
                    display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;color:#7c3aed;font-weight:700">EchoSEO</span>
        </div>

      </div>`;

      document.body.appendChild(container);

      const pxPerMm = 794 / 210;
      const pageHpx = 297 * pxPerMm;

      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      const breakStarts = calcPageBreaks(container, pageHpx);
      const totalLogH   = container.scrollHeight;

      const SCALE  = 3;
      const canvas = await window.html2canvas(container, {
        scale: SCALE, useCORS: true,
        backgroundColor: "#ffffff", logging: false, width: 794,
      });

      document.body.removeChild(container);

      const { jsPDF } = window.jspdf;
      const pdf  = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
      const pageW = pdf.internal.pageSize.getWidth();

      for (let i = 0; i < breakStarts.length; i++) {
        if (i > 0) pdf.addPage();

        const startY = breakStarts[i];
        const endY   = (i + 1 < breakStarts.length) ? breakStarts[i + 1] : totalLogH;
        const sliceH = endY - startY;

        const sliceCanvas  = document.createElement("canvas");
        sliceCanvas.width  = canvas.width;
        sliceCanvas.height = Math.max(1, Math.round(sliceH * SCALE));
        const sliceCtx     = sliceCanvas.getContext("2d");

        sliceCtx.drawImage(
          canvas,
          0,            Math.round(startY * SCALE),
          canvas.width, Math.round(sliceH  * SCALE),
          0,            0,
          canvas.width, Math.round(sliceH  * SCALE),
        );

        pdf.addImage(
          sliceCanvas.toDataURL("image/jpeg", 0.92),
          "JPEG", 0, 0,
          pageW,
          sliceH / pxPerMm,
        );
      }

      pdf.save("reporte-seo-echoseo.pdf");
      showToast("success","PDF descargado correctamente");

    } catch (err) {
      console.error("PDF export error:", err);
      showToast("error","No se pudo generar el PDF");
    } finally {
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
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const keyword       = document.getElementById("analyzeKeyword").value;
    const locationField = document.getElementById("analyzeLocation").value;
    submitBtn.disabled=true; submitBtn.classList.add("is-loading");
    loading.classList.remove("is-hidden"); loading.setAttribute("aria-hidden","false");
    results.classList.add("is-hidden");
    try {
      const data  = await window.pySeoService.analyzeSeo(keyword, locationField);
      const analy = data.seo_analysis || {};
      document.getElementById("resSearchIntent").innerText = analy.search_intent || "N/A";
      document.getElementById("resAnalyzeH1").innerText    = analy.h1_sugerido   || "N/A";
      document.getElementById("resContentGap").innerText   = analy.content_gap   || "N/A";
      const h2Ul   = document.getElementById("resAnalyzeH2");
      h2Ul.innerHTML = "";
      const h2List = analy.h2_lista || [];
      if (h2List.length) {
        h2List.forEach(h => { const li=document.createElement("li"); li.innerText=h; h2Ul.appendChild(li); });
      } else { h2Ul.innerHTML = "<li>No data</li>"; }
      const listDiv = document.getElementById("resCompetitorsList");
      listDiv.innerHTML = (data.competitors||[]).map(c=>`
        <div class="competitor-card">
          <div><span class="competitor-rank">#${c.ranking||"?"}</span>
          <h4 class="competitor-title">${c.title||"Sin Título"}</h4></div>
          <a href="${c.url}" class="competitor-url" target="_blank">${c.url||"#"}</a>
          <p class="competitor-snippet">${c.snippet||""}</p>
        </div>`).join("");
      results.classList.remove("is-hidden");
      showToast("success","Análisis de competencia listo");
    } catch(err) { showToast("error", err.message); }
    finally {
      submitBtn.disabled=false; submitBtn.classList.remove("is-loading");
      loading.classList.add("is-hidden"); loading.setAttribute("aria-hidden","true");
    }
  });
}

function loadHistory() { console.log("History panel defer"); }

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
  loadHistory();
});
