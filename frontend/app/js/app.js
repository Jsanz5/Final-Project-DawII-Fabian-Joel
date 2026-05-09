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

    headerActions.innerHTML = `
      <div class="user-profile-container">
        <button class="user-profile-btn" id="userProfileBtn" onclick="toggleUserMenu()">
          <div class="user-avatar">${userInitial}</div>
          <div class="user-info">
            <span class="user-name">${userName}</span>
            <span class="user-email">${user.email}</span>
          </div>
          <svg class="user-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        
        <div class="user-dropdown-menu" id="userDropdownMenu">
          <a href="profile.html" class="dropdown-item" onclick="event.preventDefault()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8ZM8 8C5.79086 8 4 9.79086 4 12C4 12.5523 4.44772 13 5 13H11C11.5523 13 12 12.5523 12 12C12 9.79086 10.2091 8 8 8Z" fill="currentColor"/>
            </svg>
            <span>Mi Perfil</span>
          </a>
          <a href="dashboard.html" class="dropdown-item" onclick="event.preventDefault()">
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
