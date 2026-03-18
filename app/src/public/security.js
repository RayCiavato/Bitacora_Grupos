(function initBitacoraSecurity(global) {
  "use strict";

  function toSafeText(value) {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value);
  }

  function setSafeText(target, value) {
    if (!target) {
      return;
    }
    target.textContent = toSafeText(value);
  }

  function escapeHtml(text) {
    return toSafeText(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Compatibilidad futura: devuelve HTML escapado (no ejecutable).
  function sanitizeHTML(input) {
    return escapeHtml(input);
  }

  // Aplica salida segura sin interpretar HTML.
  function setSanitizedHTML(target, html) {
    setSafeText(target, html);
  }

  global.BitacoraSecurity = Object.freeze({
    toSafeText,
    setSafeText,
    sanitizeHTML,
    setSanitizedHTML
  });
})(window);
