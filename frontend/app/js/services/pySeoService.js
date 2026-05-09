const PY_API_BASE_URL = "http://127.0.0.1:8000";

async function auditSeoUrl(url) {
  const response = await fetch(`${PY_API_BASE_URL}/seo-analysis/audit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data?.detail ? JSON.stringify(data.detail) : "Error en la auditoria",
    );
  return data;
}

async function generateContent(topic, content_type, locationField) {
  const payload = { topic, content_type };
  if (locationField) payload.location = locationField;

  const response = await fetch(
    `${PY_API_BASE_URL}/seo-analysis/generate-content`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data?.detail ? JSON.stringify(data.detail) : "Error al generar contenido",
    );
  return data;
}

async function analyzeSeo(keyword, location) {
  const response = await fetch(`${PY_API_BASE_URL}/seo-analysis/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, location }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data?.detail
        ? JSON.stringify(data.detail)
        : "Error en el analisis de competencia",
    );
  return data;
}

async function saveAuditResult(userId, url, result) {
  try {
    const histRes = await fetch("../../backend/api/seo/history.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        url: url,
        seo_score: result?.seo_analysis?.global_score || null,
        report_data: JSON.stringify(result),
      }),
    });

    if (!histRes.ok) {
      console.error(
        "Error servidor al guardar historial:",
        await histRes.text(),
      );
    } else {
      console.log("Historial guardado exitosamente");
    }
  } catch (e) {
    console.error("Error guardando historial:", e);
  }
}

window.pySeoService = {
  auditSeoUrl,
  generateContent,
  analyzeSeo,
  saveAuditResult,
};
