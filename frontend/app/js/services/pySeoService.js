const PY_API_BASE_URL = "http://127.0.0.1:8000";

async function auditSeoUrl(url) {
  const response = await fetch(`${PY_API_BASE_URL}/seo-analysis/audit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data && data.detail
        ? JSON.stringify(data.detail)
        : "Error en la auditoria";
    throw new Error(message);
  }

  return data;
}

window.pySeoService = {
  auditSeoUrl,
};
