const API_BASE_URL = '../../backend/api';

// async function para iniciar auditoría desde la UI, se llama desde index.html
async function startAudit(url, userId) {
  try {
    showToast("info", "🔍 Iniciando auditoría...");
    
    const response = await fetch(`${API_BASE_URL}/seo/audit.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        url: url
      })
    });

    const result = await response.json();

    // Verificar respuesta del servidor
    if (response.ok && result.status === "success") {
      showToast("success", `Auditoría iniciada - ID: ${result.audit_id}`);
      
    // Guardar audit_id y url en localStorage para mostrar resultados después del análisis
      const auditId = result.audit_id;
      localStorage.setItem("current_audit_id", auditId);
      localStorage.setItem("current_audit_url", url);
      
      // Esperar un poco antes de redirigir para que se vea el toast
      setTimeout(() => {
        // Verifica si la página de resultados existe, si no, mostrar alerta temporal
        showToast("info", "Auditoría enviada para análisis.");
        // window.location.href = `audit-results.html?id=${auditId}`;
      }, 1500);
      
      return auditId;
    } else {
      showToast("error", `Error: ${result.message}`);
      return null;
    }
  } catch (error) {
    console.error("Error al iniciar auditoría:", error);
    showToast("error", "Error de conexión al servidor");
    return null;
  }
}

// obtener resultados de auditoría por ID (para mostrar en audit-results.html)
async function getAuditResults(auditId) {
  try {
    const response = await fetch(`${API_BASE_URL}/seo/audit.php?id=${auditId}`);
    const result = await response.json();

    if (response.ok && result.status === "success") {
      return result.audit;
    } else {
      console.error("Error al obtener resultados:", result.message);
      return null;
    }
  } catch (error) {
    console.error("Error al obtener auditoría:", error);
    return null;
  }
}

// obtener historial de auditorías del usuario
async function getAuditHistory(userId, limit = 50, offset = 0) {
  try {
    /*
        Esta función obtiene el historial de auditorías SEO para un usuario específico, con paginación.
        Si la solicitud al servidor falla, intenta cargar un cache local del historial,
        para proporcionar una experiencia más resiliente.
    */
    const response = await fetch(
      `${API_BASE_URL}/seo/history.php?user_id=${userId}&limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.status === "success") {
      // Guardar en localStorage como cache para fallback
      localStorage.setItem(
        `audits_history_cache_${userId}`,
        JSON.stringify(result.data)
      );

      return {
        success: true,
        data: result.data,
        pagination: result.pagination,
        source: "server"
      };
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.warn("Error obteniendo historial del servidor:", error);
    
    // Fallback: intentar usar cache local
    try {
      const cache = localStorage.getItem(`audits_history_cache_${userId}`);
      if (cache) {
        showToast("warning", "📡 Usando datos locales (servidor no disponible)");
        return {
          success: true,
          data: JSON.parse(cache),
          pagination: { total: 0, has_more: false },
          source: "cache"
        };
      }
    } catch (cacheError) {
      console.error("Error leyendo cache:", cacheError);
    }

    // Si todo falla, retornar vacío
    console.error("No hay historial disponible:", error);
    return {
      success: false,
      data: [],
      pagination: { total: 0, has_more: false },
      source: "empty",
      error: error.message
    };
  }
}

// Función para mostrar resultados de las auditorías en audit-results.html
function displayResults(auditData) {
  if (!auditData) {
    showToast("error", "No se encontraron resultados");
    return;
  }

  // Parsear report_data si es string JSON
  let reportData = auditData.report_data;
  if (typeof reportData === 'string') {
    try {
      reportData = JSON.parse(reportData);
    } catch (e) {
      console.error("Error parseando report_data:", e);
      reportData = {};
    }
  }

  const container = document.getElementById("resultsContainer");
  if (!container) {
    // DEBUG: Container no encontrado - página incorrecta
    return;
  }

  // Generar HTML con los resultados
  const resultsHTML = `
    <div class="audit-results">
      <div class="audit-header">
        <div class="audit-info">
          <h2>Resultados de Auditoría SEO</h2>
          <p class="audit-url"><strong>URL:</strong> ${escapeHtml(auditData.url)}</p>
          <p class="audit-date"><strong>Fecha:</strong> ${auditData.created_at}</p>
        </div>
        <div class="seo-score-display">
          <div class="score-circle" style="background: conic-gradient(#7b61ff 0deg ${auditData.seo_score * 3.6}deg, #e0e0e0 ${auditData.seo_score * 3.6}deg);">
            <div class="score-value">${auditData.seo_score}</div>
            <div class="score-label">/ 100</div>
          </div>
        </div>
      </div>

      <div class="audit-status">
        <span class="status-badge status-${auditData.status}">${capitalizeText(auditData.status)}</span>
      </div>

      ${generateErrorsSection(reportData.errors || [])}
      ${generateWarningsSection(reportData.warnings || [])}
      ${generateSuggestionsSection(reportData.suggestions || [])}
      
      <div class="audit-actions">
        <button class="btn btn-primary" onclick="exportAuditPDF(${auditData.id})">📥 Descargar Informe PDF</button>
        <button class="btn btn-secondary" onclick="shareAudit(${auditData.id})">🔗 Compartir Auditoría</button>
      </div>
    </div>
  `;

  container.innerHTML = resultsHTML;
}

// genera sección de errores críticos si existen, sino muestra mensaje de "no se encontraron errores"
function generateErrorsSection(errors) {
  if (!errors || errors.length === 0) {
    return `
      <div class="results-section success">
        <div class="section-header">
          <span class="section-icon">✅</span>
          <h3>Errores Críticos</h3>
        </div>
        <p class="no-items">No se encontraron errores críticos</p>
      </div>
    `;
  }

  const errorsList = errors.map(error => `
    <div class="result-item error-item">
      <span class="item-icon">❌</span>
      <div class="item-content">
        <p class="item-text">${escapeHtml(error)}</p>
      </div>
    </div>
  `).join('');

  return `
    <div class="results-section errors">
      <div class="section-header">
        <span class="section-icon">❌</span>
        <h3>Errores Críticos (${errors.length})</h3>
      </div>
      <div class="items-list">
        ${errorsList}
      </div>
    </div>
  `;
}

// warmings para mostrar advertencias si existen, sino muestra mensaje de "no se encontraron advertencias"
function generateWarningsSection(warnings) {
  if (!warnings || warnings.length === 0) {
    return `
      <div class="results-section warning">
        <div class="section-header">
          <span class="section-icon">⚠️</span>
          <h3>Advertencias</h3>
        </div>
        <p class="no-items">No se encontraron advertencias</p>
      </div>
    `;
  }

  const warningsList = warnings.map(warning => `
    <div class="result-item warning-item">
      <span class="item-icon">⚠️</span>
      <div class="item-content">
        <p class="item-text">${escapeHtml(warning)}</p>
      </div>
    </div>
  `).join('');

  return `
    <div class="results-section warnings">
      <div class="section-header">
        <span class="section-icon">⚠️</span>
        <h3>Advertencias (${warnings.length})</h3>
      </div>
      <div class="items-list">
        ${warningsList}
      </div>
    </div>
  `;
}

// sugerencias para mostrar sugerencias de mejora si existen, sino muestra mensaje de "no hay sugerencias"
function generateSuggestionsSection(suggestions) {
  if (!suggestions || suggestions.length === 0) {
    return `
      <div class="results-section suggestions">
        <div class="section-header">
          <span class="section-icon">💡</span>
          <h3>Sugerencias de Mejora</h3>
        </div>
        <p class="no-items">No hay sugerencias</p>
      </div>
    `;
  }

  const suggestionsList = suggestions.map(suggestion => `
    <div class="result-item suggestion-item">
      <span class="item-icon">💡</span>
      <div class="item-content">
        <p class="item-text">${escapeHtml(suggestion)}</p>
      </div>
    </div>
  `).join('');

  return `
    <div class="results-section suggestions">
      <div class="section-header">
        <span class="section-icon">💡</span>
        <h3>Sugerencias de Mejora (${suggestions.length})</h3>
      </div>
      <div class="items-list">
        ${suggestionsList}
      </div>
    </div>
  `;
}

// para exportar los resultados de auditorias en pdf
async function exportAuditPDF(auditId) {
  try {
    // Obtener datos de la auditoría
    const audit = await getAuditResults(auditId);
    if (!audit) {
      showToast("error", "Error al obtener datos para exportar");
      return;
    }

    // Parsear report_data
    let reportData = audit.report_data;
    if (typeof reportData === 'string') {
      try {
        reportData = JSON.parse(reportData);
      } catch (e) {
        reportData = {};
      }
    }

    // Crear elemento HTML con los datos
    const element = document.createElement('div');
    element.id = 'pdf-content';
    element.style.cssText = 'padding: 20px; font-family: Arial, sans-serif;';
    
    element.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto;">
        <h1 style="text-align: center; color: #7b61ff; margin-bottom: 30px;">
          INFORME DE AUDITORÍA SEO
        </h1>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p><strong>URL:</strong> ${escapeHtml(audit.url)}</p>
          <p><strong>Fecha:</strong> ${audit.created_at}</p>
          <p><strong>Estado:</strong> ${capitalizeText(audit.status)}</p>
          <p style="font-size: 24px; color: #7b61ff; margin-top: 10px;">
            <strong>Puntuación SEO: ${audit.seo_score}/100</strong>
          </p>
        </div>

        <h2 style="color: #f44336; margin-top: 30px; margin-bottom: 15px;">
          ❌ Errores Críticos (${(reportData.errors || []).length})
        </h2>
        <div style="background: rgba(244, 67, 54, 0.1); padding: 15px; border-left: 4px solid #f44336; margin-bottom: 20px;">
          ${(reportData.errors || []).length > 0 
            ? (reportData.errors || []).map((e, i) => `
              <p style="margin: 8px 0;"><strong>${i + 1}.</strong> ${escapeHtml(e)}</p>
            `).join('')
            : '<p style="color: #666;">No se encontraron errores críticos</p>'
          }
        </div>

        <h2 style="color: #ffc107; margin-top: 30px; margin-bottom: 15px;">
          ⚠️ Advertencias (${(reportData.warnings || []).length})
        </h2>
        <div style="background: rgba(255, 193, 7, 0.1); padding: 15px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
          ${(reportData.warnings || []).length > 0 
            ? (reportData.warnings || []).map((w, i) => `
              <p style="margin: 8px 0;"><strong>${i + 1}.</strong> ${escapeHtml(w)}</p>
            `).join('')
            : '<p style="color: #666;">No hay advertencias</p>'
          }
        </div>

        <h2 style="color: #4caf50; margin-top: 30px; margin-bottom: 15px;">
          💡 Sugerencias de Mejora (${(reportData.suggestions || []).length})
        </h2>
        <div style="background: rgba(76, 175, 80, 0.1); padding: 15px; border-left: 4px solid #4caf50; margin-bottom: 30px;">
          ${(reportData.suggestions || []).length > 0 
            ? (reportData.suggestions || []).map((s, i) => `
              <p style="margin: 8px 0;"><strong>${i + 1}.</strong> ${escapeHtml(s)}</p>
            `).join('')
            : '<p style="color: #666;">No hay sugerencias</p>'
          }
        </div>

        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
          <p>Generado por <strong>EchoSEO</strong></p>
          <p>${new Date().toLocaleString('es-ES')}</p>
        </div>
      </div>
    `;

    // Opciones para html2pdf
    const options = {
      margin: 10,
      filename: `audit-${auditId}-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    // Usar html2pdf para generar y descargar PDF
    html2pdf().set(options).from(element).save();

    showToast("success", "✅ PDF descargado correctamente");
  } catch (error) {
    console.error("Error al exportar PDF:", error);
    showToast("error", "Error al descargar el PDF");
  }
}

// esto permite compartir la auditoría usando la API de Web Share o copiando el enlace al portapapeles como fallback
function shareAudit(auditId) {
  const shareUrl = `${window.location.origin}${window.location.pathname}?audit=${auditId}`;
  
  if (navigator.share) {
    navigator.share({
      title: 'Auditoría SEO - EchoSEO',
      text: 'Revisa los resultados de mi auditoría SEO',
      url: shareUrl
    }).catch(err => {
      // DEBUG: Error al compartir
      showToast("warning", "No se pudo copiar el enlace");
    });
  } else {
    // Fallback: copiar al portapapeles
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast("success", "🔗 Enlace copiado al portapapeles");
    });
  }
}

// utilidades para escapar HTML y capitalizar texto, usadas en la generación de resultados para evitar inyección de código y mejorar presentación

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function capitalizeText(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Mostrar notificaciones tipo toast
function showToast(type, message) {

  if (typeof window.showToast === 'function') {
    window.showToast(type, message);
  } else {
    // DEBUG: Log sin salida (comentado para producción)
    // console.log(`[${type}] ${message}`);
  }
}

// hace un check del estado de la auditoría con intervalos de tiempo para actualizar la UI en tiempo real, mostrando toasts de progreso y alertas si tarda demasiado
async function checkAuditStatus(auditId, maxRetries = 30, interval = 2000) {
  let retries = 0;

  const checkInterval = setInterval(async () => {
    retries++;
    const audit = await getAuditResults(auditId);

    if (audit && audit.status === 'completed') {
      clearInterval(checkInterval);
      showToast("success", "✅ Auditoría completada");
      displayResults(audit);
    } else if (audit) {
      showToast("info", `⏳ Analizando... (${retries}/${maxRetries})`);
    }

    if (retries >= maxRetries) {
      clearInterval(checkInterval);
      showToast("warning", "⏱️ La auditoría está tomando más tiempo de lo esperado");
    }
  }, interval);
}

// Exportar funciones para uso global en otras partes del frontend, como index.html y audit-results.html
window.seoService = {
  startAudit,
  getAuditResults,
  getAuditHistory,
  displayResults,
  exportAuditPDF,
  shareAudit,
  checkAuditStatus
};
