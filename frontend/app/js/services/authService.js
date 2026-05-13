const API_BASE_URL = "../../backend/api";

document.addEventListener("DOMContentLoaded", () => {
  // logica del registro
  const registerForm = document.getElementById("registerForm");
  const submitBtn = document.getElementById("submitBtn");

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault(); // evita que la página recargue y no se pierda el estado del botón de envío

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      submitBtn.disabled = true; // deshabilita el botón para evitar múltiples envíos
      submitBtn.classList.add("btn-pressed"); // agrega clase para estilo de botón presionado

      // realiza la solicitud de registro al backend y maneja la respuesta para mostrar mensajes de éxito o error y redirigir al usuario después de un registro exitoso
      try {
        const response = await fetch(`${API_BASE_URL}/auth/register.php`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }), // convierte los datos del formulario a JSON para enviarlos al backend
        });

        // procesa la respuesta del backend para mostrar mensajes de éxito o error
        const result = await response.json();

        if (response.ok && result.status === "success") {
          showToast("success", "¡Cuenta creada con éxito!");

          // Guardar datos del usuario
          localStorage.setItem(
            "user_session",
            JSON.stringify({ id: result.user_id, email: result.email }),
          );

          setTimeout(() => {
            // Verificar si hay una URL pendiente para auditar
            const pendingUrl = localStorage.getItem("pending_seo_url");
            if (pendingUrl) {
              // Ir directamente a auditoría con la URL guardada
              // Nota: Tu compañero implementará la página de resultados
              alert(`¡Bienvenido! Iniciando auditoría para: ${pendingUrl}`);
              localStorage.removeItem("pending_seo_url");
            } else {
              window.location.href = "dashboard.html";
            }
          }, 1500);
        } else {
          showToast("error", result.message || "Error al registrar.");
          submitBtn.disabled = false;
          submitBtn.classList.remove("btn-pressed");
        }
      } catch (error) {
        console.error("Error de red:", error);
        showToast("error", "Error de conexión con el servidor.");
        submitBtn.disabled = false;
        submitBtn.classList.remove("btn-pressed");
      }
    });
  }

  // logica del login
  const loginForm = document.getElementById("loginForm");
  const loginBtn = document.getElementById("loginBtn");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;

      loginBtn.disabled = true;
      loginBtn.classList.add("btn-pressed");

      try {
        const response = await fetch(`${API_BASE_URL}/auth/login.php`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (response.ok && result.status === "success") {
          localStorage.setItem("user_session", JSON.stringify(result.data));

          showToast("success", "¡Login exitoso...!");

          setTimeout(() => {
            window.location.href = "dashboard.html";
          }, 1000);
        } else {
          showToast("error", result.message || "¡Credenciales incorrectas!");
          loginBtn.disabled = false;
          loginBtn.classList.remove("btn-pressed");
        }
      } catch (error) {
        console.error("Error de red:", error);
        showToast("error", "Error de conexión con el servidor.");
        loginBtn.disabled = false;
        loginBtn.classList.remove("btn-pressed");
      }
    });
  }

  // toasts personalizados modernos con iconos y animaciones suaves
  function showToast(type, message) {
    const existing = document.querySelector(".toast-notification");
    if (existing) existing.remove();

    // Crear contenedor del toast
    const toast = document.createElement("div");
    toast.className = `toast-notification toast-${type}`;

    // Íconos SVG
    const icons = {
      success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>`,
      error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>`,
    };

    // HTML interno del toast
    toast.innerHTML = `
      <div class="toast-content">
        ${icons[type] || icons.success}
        <div class="toast-message">${message}</div>
      </div>
      <div class="toast-progress"></div>
    `;

    // Estilos inline
    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.right = "20px";
    toast.style.zIndex = "10000";
    toast.style.animation =
      "slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";

    document.body.appendChild(toast);

    // Animación de progreso
    const progress = toast.querySelector(".toast-progress");
    setTimeout(() => {
      progress.style.animation = "progressBar 3s linear forwards";
    }, 10);

    // Remover después de 3.5s (para que termine la animación de salida)
    setTimeout(() => {
      toast.style.animation =
        "slideOutRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards";
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }
});
