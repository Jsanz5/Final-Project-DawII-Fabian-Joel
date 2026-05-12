// toasts para las notificaciones
window.showToast = function (type, message) {
  // Crear contenedor de toasts si no existe
  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
    `;
    document.body.appendChild(toastContainer);
  }

  // Crear toast
  const toast = document.createElement("div");
  const colors = {
    success: { bg: "rgba(76, 175, 80, 0.9)", border: "#4caf50" },
    error: { bg: "rgba(244, 67, 54, 0.9)", border: "#f44336" },
    info: { bg: "rgba(33, 150, 243, 0.9)", border: "#2196f3" },
    warning: { bg: "rgba(255, 193, 7, 0.9)", border: "#ffc107" },
  };
  const color = colors[type] || colors.info;

  toast.style.cssText = `
    background: ${color.bg};
    border: 1px solid ${color.border};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    margin-bottom: 10px;
    backdrop-filter: blur(10px);
    animation: slideInToast 0.3s ease-out;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  // Auto-remover el toast después de 3 segundos
  setTimeout(() => {
    toast.style.animation = "slideOutToast 0.3s ease-out";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

// Agrega estilos de animación para los toasts
const style = document.createElement("style");
style.textContent = `
  @keyframes slideInToast {
    from {
      opacity: 0;
      transform: translateX(400px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  @keyframes slideOutToast {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(400px);
    }
  }
`;
document.head.appendChild(style);

/*
  Este archivo contiene la lógica principal del frontend, como el manejo de la sesión del usuario, la interacción con el menú y la lógica de los tabs.
  También incluye la función showToast para mostrar notificaciones personalizadas al usuario.
  La función handleSearch se encarga de iniciar la auditoría SEO, verificando si el usuario tiene sesión activa y redirigiendo según corresponda.
  El código también maneja la animación del header al hacer scroll y la animación de los elementos al aparecer en pantalla.
*/
document.addEventListener("DOMContentLoaded", () => {
  const userSession = localStorage.getItem("user_session");
  const headerActions = document.querySelector(".header-actions");

  // Si el usuario tiene sesión activa, mostrar perfil en el header
  if (userSession && headerActions) {
    const user = JSON.parse(userSession);

    const userName = user.email.split("@")[0];
    const userInitial = userName.charAt(0).toUpperCase();
    const savedAvatar = localStorage.getItem("user_avatar");
    const avatarHtml = savedAvatar
      ? `<div class="user-avatar" style="overflow:hidden;padding:0;"><img src="${savedAvatar}" style="width:100%;height:100%;object-fit:cover;" /></div>`
      : `<div class="user-avatar">${userInitial}</div>`;

    headerActions.innerHTML = `
      <div class="user-profile-container">
        <button class="user-profile-btn" id="userProfileBtn" onclick="toggleUserMenu()">
          ${avatarHtml}
          <div class="user-info">
            <span class="user-name">${userName}</span>
            <span class="user-email">${user.email}</span>
          </div>
          <svg class="user-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        
        <div class="user-dropdown-menu" id="userDropdownMenu">
          <a href="#" class="dropdown-item" onclick="openProfilePanel(); return false;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8ZM8 8C5.79086 8 4 9.79086 4 12C4 12.5523 4.44772 13 5 13H11C11.5523 13 12 12.5523 12 12C12 9.79086 10.2091 8 8 8Z" fill="currentColor"/>
            </svg>
            <span>Mi Perfil</span>
          </a>
          <a href="dashboard.html" class="dropdown-item">
            <i class="ri-dashboard-line"></i>
            <span>Dashboard</span>
          </a>
          <div class="dropdown-divider"></div>
          <a href="#" class="dropdown-item logout-item" onclick="logout()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 2H7V3H3V13H7V14H2V2ZM13.5 8L11 5.5L11.707 4.793L15.414 8.5L11.707 12.207L11 11.5L13.5 9H6V7H13.5Z" fill="currentColor"/>
            </svg>
            <span>Cerrar sesión</span>
          </a>
        </div>
      </div>
    `;

    injectProfilePanel();

    // Función para toggle del menu
    window.toggleUserMenu = function () {
      const menu = document.getElementById("userDropdownMenu");
      const btn = document.getElementById("userProfileBtn");
      menu.classList.toggle("active");
      btn.classList.toggle("active");

      // Cierra el menu al hacer click en cualquier parte del documento
      if (menu.classList.contains("active")) {
        // Usamos setTimeout para evitar que el mismo clic que abre el menú lo cierre inmediatamente
        setTimeout(() => {
          document.addEventListener("click", function closeMenuListener(e) {
            if (!e.target.closest(".user-profile-container")) {
              menu.classList.remove("active");
              btn.classList.remove("active");
              document.removeEventListener("click", closeMenuListener);
            }
          });
        }, 0);
      }
    };
  }

  // Función para cerrar sesión
  window.logout = function () {
    localStorage.removeItem("user_session");
    window.location.href = "index.html";
  };

  // el header se oscurece al hacer scroll
  const header = document.getElementById("hdr");
  if (header) {
    window.addEventListener("scroll", () => {
      header.classList.toggle("scrolled", window.scrollY > 10);
    });
  }

  // este campo anima del scroll a medida que aparecen los elementos
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length > 0) {
    const IO = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            setTimeout(() => e.target.classList.add("in"), i * 90);
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    reveals.forEach((el) => IO.observe(el));

    document
      .querySelectorAll(".feat-card.reveal, .testi-card.reveal")
      .forEach((el, i) => {
        el.style.transitionDelay = (i % 4) * 0.1 + "s";
      });
  }

  // esto es la lógica del dropdown de plataformas, con animación de la gráfica y ciclo automático
  const ddMenu = document.getElementById("ddMenu");
  const ddBtn = document.getElementById("ddBtn");

  if (ddMenu && ddBtn) {
    let ddOpen = false;
    let autoCycleInterval; // Variable para controlar el ciclo automático y evitar conflictos con la interacción del usuario

    // Datos de las plataformas
    const PLATFORMS = {
      "All AI platforms": {
        score: 88,
        label: "Great",
        desc: "Frequently mentioned and often<br>preferred by LLMs",
        badge: "All Platforms",
        arrowDeg: -8,
      },
      ChatGPT: {
        score: 90,
        label: "Great",
        desc: "Frequently mentioned and often<br>preferred by LLMs",
        badge: "ChatGPT",
        arrowDeg: -5,
      },
      Gemini: {
        score: 67,
        label: "Average",
        desc: "Growing visibility in<br>Gemini responses",
        badge: "Gemini",
        arrowDeg: -55,
      },
      "AI Overview": {
        score: 74,
        label: "Good",
        desc: "Often cited in Google's<br>AI-generated answers",
        badge: "AI Overview",
        arrowDeg: -38,
      },
      "AI Mode": {
        score: 81,
        label: "Good",
        desc: "Strong presence in<br>AI Mode results",
        badge: "⚡ AI Mode",
        arrowDeg: -22,
      },
    };

    // al usar dropdown, muestra la info correspondiente y anima la gráfica, el ciclo automático se detiene al interactuar para no generar conflictos
    window.toggleDropdown = function () {
      ddOpen = !ddOpen;
      ddMenu.style.display = ddOpen ? "block" : "none";
      ddBtn.classList.toggle("open", ddOpen);
      clearInterval(autoCycleInterval); // Detenemos el automático si el usuario interactúa
    };

    // al hacer click fuera del dropdown, se cierra para mejorar la experiencia de usuario
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".wg-dropdown-wrap")) {
        ddMenu.style.display = "none";
        ddBtn.classList.remove("open");
        ddOpen = false;
      }
    });

    // al seleccionar una plataforma, se actualiza la gráfica y la información mostrada, el ciclo automático se detiene al interactuar para no generar conflictos
    window.selectPlatform = function (name) {
      ddMenu.style.display = "none";
      ddBtn.classList.remove("open");
      ddOpen = false;

      document.querySelectorAll(".wg-dropdown-item").forEach((it) => {
        it.classList.toggle("selected", it.textContent === name);
      });
      document.getElementById("ddLabel").textContent = name;

      const d = PLATFORMS[name] || PLATFORMS["ChatGPT"];
      animateGauge(d.score);
      document.getElementById("gaugeLabel").textContent = d.label;
      document.getElementById("gaugeDesc").innerHTML = d.desc;
      document.getElementById("platformBadge").textContent = d.badge;

      const arrow = document.getElementById("gaugeArrow");
      const deg = -90 + (d.score / 100) * 180;
      if (arrow) arrow.style.transform = `rotate(${deg}deg)`;
    };

    function animateGauge(targetScore) {
      const arc = document.getElementById("gaugeArc");
      const numEl = document.getElementById("gaugeNum");
      if (!arc || !numEl) return;

      const targetOffset = 226 - (targetScore / 100) * 226;
      const startOffset = parseFloat(
        arc.getAttribute("stroke-dashoffset") || 226,
      );
      const startNum = parseInt(numEl.textContent || 0);
      const duration = 900;
      const start = performance.now();

      function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        arc.setAttribute(
          "stroke-dashoffset",
          startOffset + (targetOffset - startOffset) * ease,
        );
        numEl.textContent = Math.round(
          startNum + (targetScore - startNum) * ease,
        );
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    // Animación inicial de la gráfica
    window.addEventListener("load", () => {
      document
        .querySelectorAll(".chart-line-animated")
        .forEach((el) => el.classList.add("draw"));
      setTimeout(() => {
        ["areaGold", "areaBlue", "dotGold", "dotBlue", "dotPurple"].forEach(
          (id) => {
            const el = document.getElementById(id);
            if (el) el.setAttribute("opacity", "1");
          },
        );
      }, 1800);

      setTimeout(() => {
        const arrow = document.getElementById("gaugeArrow");
        if (arrow) arrow.style.transform = "rotate(72deg)";
      }, 100);
    });

    // Ciclo Automático
    const platformOrder = [
      "All AI platforms",
      "ChatGPT",
      "AI Overview",
      "AI Mode",
      "Gemini",
    ];
    let pIdx = 1;
    autoCycleInterval = setInterval(() => {
      pIdx = (pIdx + 1) % platformOrder.length;
      selectPlatform(platformOrder[pIdx]);
    }, 4500); // Lo subí a 4.5s para que dé tiempo a leer
  }

  // esta función es para el tab de auditoría, simplemente cambia el contenido mostrado y el tab activo
  window.setLocation = function (el, loc) {
    document
      .querySelectorAll(".wg-tab")
      .forEach((t) => t.classList.remove("active"));
    el.classList.add("active");
  };

  window.handleSearch = function () {
    const inp = document.getElementById("heroInput");
    if (inp && inp.value.trim() !== "") {
      // Comprobamos si el usuario tiene sesión iniciada
      const isLogged = localStorage.getItem("user_session");

      if (isLogged) {
        // El usuario está logueado, iniciar la auditoría SEO
        const userSession = JSON.parse(isLogged);
        const url = inp.value.trim();

        // Llamar al endpoint de auditoría (tu compañero completará la lógica Python)
        initiateAudit(url, userSession.id);
      } else {
        // Guardar URL para auditar después del registro
        localStorage.setItem("pending_seo_url", inp.value.trim());
        window.location.href = "register.html";
      }
    } else {
      if (inp) {
        inp.value = "miempresa.com";
        inp.focus();
      }
    }
  };

  // Función auxiliar para iniciar la auditoría
  window.initiateAudit = function (url, userId) {
    const API_BASE_URL = "../../backend/api";

    fetch(`${API_BASE_URL}/seo/audit.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        url: url,
      }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.status === "success") {
          showToast("success", `Auditoría iniciada para: ${url}`);
          // Redirigir a página de resultados
          setTimeout(() => {
            window.location.href = `audit-results.html?id=${result.audit_id}`;
          }, 1500);
        } else {
          showToast("error", `Error: ${result.message}`);
        }
      })
      .catch((error) => {
        // DEBUG: Error al iniciar auditoría - ver consola para detalles
        console.error("[DEBUG] Error al iniciar auditoría:", error);
        alert("Error al iniciar la auditoría");
      });
  };

  // esta función es para el menú lateral en mobile, simplemente alterna la clase active y bloquea el scroll del body cuando el menú está abierto
  window.toggleSideMenu = function () {
    const wrapper = document.getElementById("navWrapper");
    const btn = document.getElementById("hamburgerBtn");
    if (!wrapper || !btn) return;

    wrapper.classList.toggle("active");
    btn.classList.toggle("active");
    document.body.style.overflow = wrapper.classList.contains("active")
      ? "hidden"
      : "";
  };
});

// ──────────────── Profile Panel (drawer) ────────────────
(function () {
  const PP_COUNT = 8;
  let ppPending = null;

  function ppRandomSeed() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  function ppBuildImg(src) {
    return `<img src="${src}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;" />`;
  }

  function ppRenderCurrentAvatar() {
    const el = document.getElementById("ppAvatarLarge");
    if (!el) return;
    const saved = localStorage.getItem("user_avatar");
    const delBtn = document.getElementById("ppBtnDelete");
    if (saved) {
      el.innerHTML = ppBuildImg(saved);
      el.style.padding = "0";
      if (delBtn) delBtn.style.display = "flex";
    } else {
      const raw = localStorage.getItem("user_session");
      const username = raw ? JSON.parse(raw).email.split("@")[0] : "?";
      el.textContent = username.charAt(0).toUpperCase();
      el.style.padding = "";
      if (delBtn) delBtn.style.display = "none";
    }
  }

  function ppRefreshHeader() {
    const avatarEl = document.querySelector(".user-profile-btn .user-avatar");
    if (!avatarEl) return;
    const saved = localStorage.getItem("user_avatar");
    const raw = localStorage.getItem("user_session");
    const username = raw ? JSON.parse(raw).email.split("@")[0] : "?";
    if (saved) {
      avatarEl.innerHTML = `<img src="${saved}" style="width:100%;height:100%;object-fit:cover;" />`;
      avatarEl.style.overflow = "hidden";
      avatarEl.style.padding = "0";
    } else {
      avatarEl.innerHTML = username.charAt(0).toUpperCase();
      avatarEl.style.overflow = "";
      avatarEl.style.padding = "";
    }
  }

  function ppSetupTabs() {
    document.querySelectorAll(".pp-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".pp-tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".pp-tab-content").forEach((c) => c.classList.remove("active"));
        tab.classList.add("active");
        const content = document.getElementById("pp-tab-" + tab.dataset.tab);
        if (content) content.classList.add("active");
        if (tab.dataset.tab === "ai") {
          const grid = document.getElementById("ppAiGrid");
          if (grid && grid.children.length === 0) ppRenderAiAvatars();
        }
      });
    });
  }

  function ppSetupUpload() {
    const zone = document.getElementById("ppUploadZone");
    const input = document.getElementById("ppPhotoInput");
    if (!zone || !input) return;
    zone.addEventListener("click", (e) => { if (e.target !== input) input.click(); });
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("drag-over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");
      const file = e.dataTransfer.files[0];
      if (file) ppProcessFile(file);
    });
    input.addEventListener("change", (e) => { if (e.target.files[0]) ppProcessFile(e.target.files[0]); });
  }

  function ppProcessFile(file) {
    if (!file.type.startsWith("image/")) { showToast("error", "Solo se permiten archivos de imagen"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("error", "La imagen no puede superar los 5 MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      ppPending = e.target.result;
      const el = document.getElementById("ppAvatarLarge");
      if (el) { el.innerHTML = ppBuildImg(ppPending); el.style.padding = "0"; }
      const saveBtn = document.getElementById("ppBtnSave");
      if (saveBtn) saveBtn.disabled = false;
      showToast("success", "Foto lista — haz clic en Guardar cambios");
    };
    reader.readAsDataURL(file);
  }

  function ppRenderAiAvatars() {
    const grid = document.getElementById("ppAiGrid");
    if (!grid) return;
    grid.innerHTML = Array.from({ length: PP_COUNT }).map(() => `<div class="pp-ai-item loading-pp"></div>`).join("");
    Array.from({ length: PP_COUNT }, (_, i) => {
      const seed = ppRandomSeed();
      const url = `https://www.tapback.co/api/avatar/${seed}.webp`;
      const img = new Image();
      img.onload = () => {
        const placeholders = grid.querySelectorAll(".pp-ai-item");
        if (!placeholders[i]) return;
        const item = document.createElement("div");
        item.className = "pp-ai-item";
        item.innerHTML = `<img src="${url}" alt="Memoji ${i + 1}" />`;
        item.addEventListener("click", () => {
          document.querySelectorAll(".pp-ai-item").forEach((el) => el.classList.remove("selected"));
          item.classList.add("selected");
          ppPending = url;
          const el = document.getElementById("ppAvatarLarge");
          if (el) { el.innerHTML = ppBuildImg(url); el.style.padding = "0"; }
          const saveBtn = document.getElementById("ppBtnSave");
          if (saveBtn) saveBtn.disabled = false;
        });
        placeholders[i].replaceWith(item);
      };
      img.onerror = () => {
        const placeholders = grid.querySelectorAll(".pp-ai-item");
        if (placeholders[i]) placeholders[i].classList.remove("loading-pp");
      };
      img.src = url;
    });
  }

  window.injectProfilePanel = function () {
    if (document.getElementById("profilePanelOverlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "profilePanelOverlay";
    overlay.className = "pp-overlay";
    overlay.innerHTML = `
      <div class="pp-panel" id="ppPanel">
        <div class="pp-header">
          <div>
            <p class="pp-eyebrow">Cuenta</p>
            <h2 class="pp-title">Mi Perfil</h2>
          </div>
          <button class="pp-close" id="ppCloseBtn"><i class="ri-close-line"></i></button>
        </div>
        <div class="pp-body">
          <div class="pp-avatar-section">
            <div class="pp-avatar-wrap">
              <div class="pp-avatar-large" id="ppAvatarLarge"></div>
              <label class="pp-avatar-cam" for="ppPhotoInput" title="Subir foto">
                <i class="ri-camera-line"></i>
              </label>
            </div>
            <div class="pp-user-meta">
              <h3 class="pp-username" id="ppUserName">Usuario</h3>
              <p class="pp-useremail" id="ppUserEmail">-</p>
              <button class="pp-btn-delete" id="ppBtnDelete" title="Eliminar foto de perfil" style="display:none">
                <i class="ri-delete-bin-6-line"></i>
                <span>Eliminar foto</span>
              </button>
            </div>
          </div>
          <div class="pp-tabs">
            <button class="pp-tab active" data-tab="upload"><i class="ri-upload-cloud-line"></i> Subir foto</button>
            <button class="pp-tab" data-tab="ai"><i class="ri-sparkling-line"></i> Memojis IA</button>
          </div>
          <div class="pp-tab-content active" id="pp-tab-upload">
            <div class="pp-upload-zone" id="ppUploadZone">
              <input type="file" id="ppPhotoInput" accept="image/*" hidden />
              <i class="ri-image-add-line pp-upload-icon"></i>
              <p class="pp-upload-title">Arrastra tu foto aquí</p>
              <p class="pp-upload-subtitle">o haz clic para seleccionar</p>
              <p class="pp-upload-hint">PNG, JPG, GIF · máx. 5 MB</p>
            </div>
          </div>
          <div class="pp-tab-content" id="pp-tab-ai">
            <div class="pp-ai-header">
              <p class="pp-ai-subtitle">Memojis únicos generados por IA.</p>
              <button class="pp-btn-regen" id="ppBtnRegen"><i class="ri-refresh-line"></i> Nuevos</button>
            </div>
            <div class="pp-ai-grid" id="ppAiGrid"></div>
          </div>
          <div class="pp-actions">
            <button class="pp-btn-save" id="ppBtnSave" disabled>
              <i class="ri-save-line"></i> Guardar cambios
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById("ppCloseBtn").addEventListener("click", window.closeProfilePanel);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) window.closeProfilePanel(); });
    document.getElementById("ppBtnSave").addEventListener("click", () => {
      if (!ppPending) return;
      localStorage.setItem("user_avatar", ppPending);
      ppPending = null;
      const saveBtn = document.getElementById("ppBtnSave");
      if (saveBtn) saveBtn.disabled = true;
      ppRenderCurrentAvatar();
      ppRefreshHeader();
      showToast("success", "¡Foto de perfil actualizada!");
    });
    document.getElementById("ppBtnDelete").addEventListener("click", () => {
      localStorage.removeItem("user_avatar");
      ppPending = null;
      ppRenderCurrentAvatar();
      ppRefreshHeader();
      const saveBtn = document.getElementById("ppBtnSave");
      if (saveBtn) saveBtn.disabled = true;
      showToast("success", "Foto de perfil eliminada");
    });
    document.getElementById("ppBtnRegen").addEventListener("click", () => {
      const btn = document.getElementById("ppBtnRegen");
      btn.classList.add("loading");
      ppRenderAiAvatars();
      setTimeout(() => btn.classList.remove("loading"), 700);
    });

    ppSetupTabs();
    ppSetupUpload();
  };

  window.openProfilePanel = function () {
    const overlay = document.getElementById("profilePanelOverlay");
    if (!overlay) return;
    ppPending = null;

    const raw = localStorage.getItem("user_session");
    if (raw) {
      const session = JSON.parse(raw);
      const username = session.email.split("@")[0] || "Usuario";
      const nameEl = document.getElementById("ppUserName");
      const emailEl = document.getElementById("ppUserEmail");
      if (nameEl) nameEl.textContent = username;
      if (emailEl) emailEl.textContent = session.email;
    }

    ppRenderCurrentAvatar();

    const saveBtn = document.getElementById("ppBtnSave");
    if (saveBtn) saveBtn.disabled = true;

    document.querySelectorAll(".pp-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".pp-tab-content").forEach((c) => c.classList.remove("active"));
    const uploadTab = document.querySelector(".pp-tab[data-tab='upload']");
    const uploadContent = document.getElementById("pp-tab-upload");
    if (uploadTab) uploadTab.classList.add("active");
    if (uploadContent) uploadContent.classList.add("active");

    // Reset AI grid so it reloads fresh on next tab switch
    const grid = document.getElementById("ppAiGrid");
    if (grid) grid.innerHTML = "";

    overlay.classList.add("open");
    document.body.style.overflow = "hidden";

    // Close dropdown if open
    const menu = document.getElementById("userDropdownMenu");
    const btn = document.getElementById("userProfileBtn");
    if (menu) menu.classList.remove("active");
    if (btn) btn.classList.remove("active");
  };

  window.closeProfilePanel = function () {
    const overlay = document.getElementById("profilePanelOverlay");
    if (overlay) overlay.classList.remove("open");
    document.body.style.overflow = "";
  };
})();
