const ALLOWED_REGISTRATION_EMAIL_DOMAINS = new Set(["gmail.com", "hotmail.com"]);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getEmailDomain(email) {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return "";
  }
  return normalized.slice(atIndex + 1);
}

function isAllowedRegistrationEmail(email) {
  return ALLOWED_REGISTRATION_EMAIL_DOMAINS.has(getEmailDomain(email));
}

function validateRegistrationEmail(email) {
  const normalized = normalizeEmail(email);
  if (!isAllowedRegistrationEmail(normalized)) {
    return {
      valid: false,
      value: normalized,
      error: "email_domain_not_allowed"
    };
  }

  return {
    valid: true,
    value: normalized
  };
}

module.exports = {
  ALLOWED_REGISTRATION_EMAIL_DOMAINS,
  getEmailDomain,
  isAllowedRegistrationEmail,
  normalizeEmail,
  validateRegistrationEmail
};
