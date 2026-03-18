const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 120;
const FULL_NAME_REGEX = /^[\p{L}\p{N}]+(?:[ -][\p{L}\p{N}]+)*$/u;

function normalizeFullName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function validateFullName(value) {
  const normalized = normalizeFullName(value);
  const errors = [];

  if (normalized.length < NAME_MIN_LENGTH || normalized.length > NAME_MAX_LENGTH) {
    errors.push(`longitud entre ${NAME_MIN_LENGTH} y ${NAME_MAX_LENGTH} caracteres`);
  }

  if (normalized.length > 0 && !FULL_NAME_REGEX.test(normalized)) {
    errors.push("solo letras, numeros, espacios simples y guion medio");
  }

  return {
    valid: errors.length === 0,
    value: normalized,
    errors
  };
}

module.exports = {
  NAME_MIN_LENGTH,
  NAME_MAX_LENGTH,
  FULL_NAME_REGEX,
  normalizeFullName,
  validateFullName
};
