const { config } = require("../config");

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;
const COMMON_WEAK_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "admin",
  "admin123",
  "admin2026",
  "qwerty",
  "qwerty123",
  "123456",
  "1234567",
  "12345678",
  "123456789",
  "1234567890",
  "12345678901",
  "123456789012",
  "letmein",
  "welcome",
  "welcome123",
  "changeme",
  "changeme123",
  "iloveyou",
  "abc123",
  "passw0rd",
  "dragon",
  "bitacora",
  "bitacora2026",
  "n1njahack",
  "n1njahack2026",
  "administrator"
]);

function compactIdentity(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s\-_@.]+/g, "");
}

function validatePasswordPolicy(password, options = {}) {
  const errors = [];
  const passwordValue = String(password || "");
  const minimumLength = Math.max(12, Number(config.passwordMinLength) || 12);

  if (passwordValue.length < minimumLength) {
    errors.push(`minimo ${minimumLength} caracteres`);
  }

  if (!/[A-Z]/.test(passwordValue)) {
    errors.push("al menos una mayuscula");
  }

  if (!/[a-z]/.test(passwordValue)) {
    errors.push("al menos una minuscula");
  }

  if (!/[0-9]/.test(passwordValue)) {
    errors.push("al menos un numero");
  }

  if (!/[^A-Za-z0-9]/.test(passwordValue)) {
    errors.push("al menos un caracter especial");
  }

  if (!STRONG_PASSWORD_REGEX.test(passwordValue)) {
    errors.push("debe cumplir el patron de complejidad");
  }

  const lowerPassword = passwordValue.toLowerCase();
  const compactPassword = compactIdentity(passwordValue);
  if (
    COMMON_WEAK_PASSWORDS.has(lowerPassword) ||
    COMMON_WEAK_PASSWORDS.has(compactPassword)
  ) {
    errors.push("no usar contrasenas comunes o debiles");
  }

  const normalizedEmail = String(options.email || "").trim().toLowerCase();
  if (normalizedEmail) {
    const emailLocalPart = normalizedEmail.split("@")[0] || normalizedEmail;
    if (lowerPassword === normalizedEmail || compactPassword === compactIdentity(emailLocalPart)) {
      errors.push("no puede ser igual al correo");
    }
  }

  const normalizedName = String(options.name || "").trim().toLowerCase();
  if (normalizedName && compactPassword === compactIdentity(normalizedName)) {
    errors.push("no puede ser igual al nombre");
  }

  return { valid: errors.length === 0, errors, minimumLength };
}

module.exports = {
  STRONG_PASSWORD_REGEX,
  validatePasswordPolicy
};
