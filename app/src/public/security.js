(function initBitacoraSecurity(global) {
  "use strict";

  const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
  const DEFAULT_ALLOWED_TAGS = new Set([
    "b",
    "strong",
    "i",
    "em",
    "u",
    "br",
    "p",
    "ul",
    "ol",
    "li",
    "span",
    "code"
  ]);
  const DEFAULT_ALLOWED_ATTRS = new Set(["class", "title", "aria-label"]);

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

  function isSafeUrl(urlRaw) {
    if (!urlRaw) {
      return false;
    }

    if (urlRaw.startsWith("/") || urlRaw.startsWith("./") || urlRaw.startsWith("../")) {
      return true;
    }

    try {
      const parsed = new URL(urlRaw, window.location.origin);
      return SAFE_PROTOCOLS.has(parsed.protocol);
    } catch (_error) {
      return false;
    }
  }

  function sanitizeNode(node, allowedTags, allowedAttrs) {
    if (!node || !node.childNodes) {
      return;
    }

    const childNodes = Array.from(node.childNodes);
    childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tagName = child.tagName.toLowerCase();
        if (!allowedTags.has(tagName)) {
          const replacement = document.createTextNode(child.textContent || "");
          child.replaceWith(replacement);
          return;
        }

        const attributes = Array.from(child.attributes);
        attributes.forEach((attribute) => {
          const attrName = attribute.name.toLowerCase();
          const attrValue = attribute.value || "";

          const isEventHandler = attrName.startsWith("on");
          const isStyleAttr = attrName === "style";
          const isAllowedAttr = allowedAttrs.has(attrName);
          const isUrlAttr = attrName === "href" || attrName === "src";

          if (isEventHandler || isStyleAttr || !isAllowedAttr) {
            child.removeAttribute(attribute.name);
            return;
          }

          if (isUrlAttr && !isSafeUrl(attrValue)) {
            child.removeAttribute(attribute.name);
          }
        });
      }

      sanitizeNode(child, allowedTags, allowedAttrs);
    });
  }

  function sanitizeHTML(input, options = {}) {
    const allowedTags = new Set(options.allowedTags || DEFAULT_ALLOWED_TAGS);
    const allowedAttrs = new Set(options.allowedAttrs || DEFAULT_ALLOWED_ATTRS);

    const template = document.createElement("template");
    template.innerHTML = toSafeText(input);
    sanitizeNode(template.content, allowedTags, allowedAttrs);
    return template.innerHTML;
  }

  function setSanitizedHTML(target, html, options = {}) {
    if (!target) {
      return;
    }
    target.innerHTML = sanitizeHTML(html, options);
  }

  global.BitacoraSecurity = Object.freeze({
    toSafeText,
    setSafeText,
    sanitizeHTML,
    setSanitizedHTML
  });
})(window);
