const { config } = require("../config");

function validatePasswordPolicy(password) {
  const errors = [];

  if (password.length < config.passwordMinLength) {
    errors.push(`minimo ${config.passwordMinLength} caracteres`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("al menos una mayuscula");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("al menos una minuscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("al menos un numero");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("al menos un caracter especial");
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validatePasswordPolicy };

