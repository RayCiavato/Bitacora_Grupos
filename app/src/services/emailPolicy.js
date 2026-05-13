const { isDisposableDomain } = require("../security/disposableEmailDomains");
const { config } = require("../config");

const EMAIL_MAX_LENGTH = 254;
const EMAIL_LOCAL_MAX_LENGTH = 64;
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF]/g;
const ASCII_EMAIL_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;

function normalizeEmail(email) {
  return String(email || "")
    .replace(ZERO_WIDTH_REGEX, "")
    .trim()
    .toLowerCase();
}

function getEmailDomain(email) {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return "";
  }
  return normalized.slice(atIndex + 1);
}

function hasControlCharacters(value) {
  const raw = String(value || "");
  for (let index = 0; index < raw.length; index += 1) {
    const code = raw.charCodeAt(index);
    if (code <= 31 || code === 127) {
      return true;
    }
  }
  return false;
}

function hasInnerWhitespace(value) {
  return Array.from(String(value || "").trim()).some((character) => /\s/.test(character));
}

function hasSuspiciousEmailCharacters(rawEmail) {
  const raw = String(rawEmail || "");
  return hasControlCharacters(raw) || hasInnerWhitespace(raw);
}

function isReasonableEmailFormat(email) {
  const raw = String(email || "");
  const normalized = normalizeEmail(raw);
  if (!normalized || normalized.length > EMAIL_MAX_LENGTH) {
    return false;
  }

  if (hasSuspiciousEmailCharacters(raw)) {
    return false;
  }

  if ((normalized.match(/@/g) || []).length !== 1) {
    return false;
  }

  if (!ASCII_EMAIL_REGEX.test(normalized)) {
    return false;
  }

  const [localPart, domain] = normalized.split("@");
  if (!localPart || localPart.length > EMAIL_LOCAL_MAX_LENGTH || !domain) {
    return false;
  }

  if (localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) {
    return false;
  }

  const labels = domain.split(".");
  if (labels.length < 2 || labels.some((label) => !label || label.length > 63)) {
    return false;
  }

  return true;
}

function isDisposableEmail(email) {
  return isDisposableDomain(getEmailDomain(email));
}

function normalizeDomain(domain) {
  return String(domain || "")
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "");
}

function getAllowedEmailDomains() {
  return Array.from(
    new Set(
      (Array.isArray(config.allowedEmailDomains) ? config.allowedEmailDomains : [])
        .map(normalizeDomain)
        .filter(Boolean)
    )
  );
}

function isAllowedInstitutionalDomain(domain) {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) {
    return false;
  }

  const allowedDomains = getAllowedEmailDomains();
  if (!allowedDomains.length) {
    return false;
  }

  return allowedDomains.some((allowedDomain) => {
    if (normalizedDomain === allowedDomain) {
      return true;
    }
    return Boolean(config.allowEmailSubdomains && normalizedDomain.endsWith(`.${allowedDomain}`));
  });
}

function validateEmailDomain(email) {
  const normalized = normalizeEmail(email);
  const domain = getEmailDomain(normalized);

  if (!isReasonableEmailFormat(normalized)) {
    return {
      valid: false,
      value: normalized,
      domain,
      error: "invalid_email",
      reason: "invalid_format"
    };
  }

  if (isDisposableDomain(domain)) {
    return {
      valid: false,
      value: normalized,
      domain,
      error: "disposable_email_not_allowed",
      reason: "disposable_domain"
    };
  }

  if (!isAllowedInstitutionalDomain(domain)) {
    return {
      valid: false,
      value: normalized,
      domain,
      error: "email_domain_not_allowed",
      reason: "domain_not_allowed"
    };
  }

  return {
    valid: true,
    value: normalized,
    domain
  };
}

function isAllowedRegistrationEmail(email) {
  return validateEmailDomain(email).valid;
}

function validateRegistrationEmail(email) {
  return validateEmailDomain(email);
}

module.exports = {
  getEmailDomain,
  getAllowedEmailDomains,
  isAllowedInstitutionalDomain,
  isAllowedRegistrationEmail,
  isDisposableEmail,
  normalizeEmail,
  validateEmailDomain,
  validateRegistrationEmail
};
