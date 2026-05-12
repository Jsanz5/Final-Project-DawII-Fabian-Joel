const TAPBACK_COUNT = 8;

function randomSeed(len = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

let pendingAvatar = null;

document.addEventListener("DOMContentLoaded", () => {
  const raw = localStorage.getItem("user_session");
  if (!raw) {
    window.location.href = "index.html";
    return;
  }

  const session = JSON.parse(raw);
  const email = session.email || "";
  const username = email.split("@")[0] || "Usuario";

  document.getElementById("profileUserName").textContent = username;
  document.getElementById("profileUserEmail").style.display = "none";

  loadSidebarUser();
  renderCurrentAvatar(username);
  setupTabs();
  setupUploadZone();
  renderAiAvatars();

  document.getElementById("btnRegenerate").addEventListener("click", () => {
    const btn = document.getElementById("btnRegenerate");
    btn.classList.add("loading");
    renderAiAvatars();
    setTimeout(() => btn.classList.remove("loading"), 700);
  });

  document.getElementById("btnSaveAvatar").addEventListener("click", saveAvatar);

  document.getElementById("sidebarLogout").addEventListener("click", () => {
    localStorage.removeItem("user_session");
    window.location.href = "index.html";
  });
});

function buildAvatarEl(src) {
  return `<img src="${src}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
}

function renderCurrentAvatar(username) {
  const el = document.getElementById("profileAvatarLarge");
  const saved = localStorage.getItem("user_avatar");
  if (saved) {
    el.innerHTML = buildAvatarEl(saved);
  } else {
    el.textContent = username.charAt(0).toUpperCase();
  }
}

function loadSidebarUser() {
  const raw = localStorage.getItem("user_session");
  if (!raw) return;
  const session = JSON.parse(raw);
  const email = session.email || "";
  const username = email.split("@")[0] || "Usuario";

  const nameEl = document.getElementById("sidebarUserName");
  const emailEl = document.getElementById("sidebarUserEmail");
  const avatarEl = document.getElementById("sidebarUserAvatar");

  if (nameEl) nameEl.textContent = username;
  if (emailEl) emailEl.style.display = "none";

  if (avatarEl) {
    const saved = localStorage.getItem("user_avatar");
    if (saved) {
      avatarEl.innerHTML = buildAvatarEl(saved);
      avatarEl.style.overflow = "hidden";
      avatarEl.style.padding = "0";
    } else {
      avatarEl.textContent = username.charAt(0).toUpperCase();
    }
  }
}

function setupTabs() {
  document.querySelectorAll(".profile-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".profile-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".profile-tab-content").forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
    });
  });
}

function setupUploadZone() {
  const zone = document.getElementById("uploadZone");
  const input = document.getElementById("photoInput");

  zone.addEventListener("click", (e) => {
    if (e.target !== input) input.click();
  });

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("drag-over");
  });

  zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));

  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  });

  input.addEventListener("change", (e) => {
    if (e.target.files[0]) processFile(e.target.files[0]);
  });
}

function processFile(file) {
  if (!file.type.startsWith("image/")) {
    showToast("error", "Solo se permiten archivos de imagen");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("error", "La imagen no puede superar los 5 MB");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    pendingAvatar = e.target.result;
    document.getElementById("profileAvatarLarge").innerHTML = buildAvatarEl(pendingAvatar);
    document.getElementById("btnSaveAvatar").disabled = false;
    showToast("success", "Foto lista — haz clic en Guardar cambios");
  };
  reader.readAsDataURL(file);
}

function renderAiAvatars() {
  const grid = document.getElementById("aiAvatarsGrid");

  grid.innerHTML = Array.from({ length: TAPBACK_COUNT })
    .map(() => `<div class="ai-avatar-item loading-placeholder"></div>`)
    .join("");

  Array.from({ length: TAPBACK_COUNT }, (_, i) => {
    const seed = randomSeed();
    const url = `https://www.tapback.co/api/avatar/${seed}.webp`;

    const img = new Image();
    img.onload = () => {
      const placeholders = grid.querySelectorAll(".ai-avatar-item");
      if (!placeholders[i]) return;
      const item = document.createElement("div");
      item.className = "ai-avatar-item";
      item.innerHTML = `<img src="${url}" alt="Memoji ${i + 1}" />`;
      item.addEventListener("click", () => selectAiAvatar(item, url));
      placeholders[i].replaceWith(item);
    };
    img.onerror = () => {
      const placeholders = grid.querySelectorAll(".ai-avatar-item");
      if (placeholders[i]) placeholders[i].classList.remove("loading-placeholder");
    };
    img.src = url;
  });
}

function selectAiAvatar(item, url) {
  document.querySelectorAll(".ai-avatar-item").forEach((el) => el.classList.remove("selected"));
  item.classList.add("selected");
  pendingAvatar = url;
  document.getElementById("profileAvatarLarge").innerHTML = buildAvatarEl(url);
  document.getElementById("btnSaveAvatar").disabled = false;
}

function saveAvatar() {
  if (!pendingAvatar) return;
  localStorage.setItem("user_avatar", pendingAvatar);
  pendingAvatar = null;
  document.getElementById("btnSaveAvatar").disabled = true;
  loadSidebarUser();
  showToast("success", "¡Foto de perfil actualizada!");
}
