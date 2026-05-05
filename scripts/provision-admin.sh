#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/compose.sh
source "$SCRIPT_DIR/lib/compose.sh"
detect_compose_cmd

ADMIN_EMAIL="${1:-${ADMIN_EMAIL:-admin@n1njahack.local}}"
ADMIN_PASSWORD="${2:-${ADMIN_PASSWORD:-}}"
ADMIN_NAME="${3:-${ADMIN_NAME:-Administrador N1njaHack}}"

if [ -z "$ADMIN_PASSWORD" ]; then
  cat >&2 <<'EOF'
ERROR: ADMIN_PASSWORD es obligatorio.
Uso:
  ADMIN_PASSWORD='tu-password-fuerte' bash scripts/provision-admin.sh admin@n1njahack.local
  bash scripts/provision-admin.sh admin@n1njahack.local 'tu-password-fuerte' 'Administrador N1njaHack'
EOF
  exit 1
fi

if [ "${#ADMIN_PASSWORD}" -lt 12 ]; then
  echo "ERROR: la contrasena debe tener al menos 12 caracteres."
  exit 1
fi

if ! "${COMPOSE_CMD[@]}" ps app >/dev/null 2>&1; then
  echo "ERROR: no se pudo consultar el servicio app. Ejecuta primero: ${COMPOSE_CMD[*]} up -d"
  exit 1
fi

"${COMPOSE_CMD[@]}" exec -T \
  -e ADMIN_EMAIL="$ADMIN_EMAIL" \
  -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  -e ADMIN_NAME="$ADMIN_NAME" \
  app node - <<'NODE'
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Administrador";

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL y ADMIN_PASSWORD son obligatorios.");
  }

  if (password.length < 12) {
    throw new Error("La contrasena debe tener al menos 12 caracteres.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `
      INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        mfa_enabled,
        mfa_secret,
        mfa_temp_secret,
        failed_attempts,
        lock_until,
        token_version
      )
      VALUES ($1, $2, $3, 'admin', FALSE, NULL, NULL, 0, NULL, 0)
      ON CONFLICT (email) DO UPDATE
      SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = 'admin',
        mfa_enabled = FALSE,
        mfa_secret = NULL,
        mfa_temp_secret = NULL,
        failed_attempts = 0,
        lock_until = NULL,
        token_version = users.token_version + 1
      RETURNING id, email
    `,
    [name, email, passwordHash]
  );

  await pool.end();
  const user = result.rows[0];
  console.log(`ADMIN_READY id=${user.id} email=${user.email}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
NODE

cat <<EOF
Admin configurado correctamente.
Correo: ${ADMIN_EMAIL}
Contrasena: ${ADMIN_PASSWORD}

Nota:
- Este script reinicia MFA del admin para que puedas configurarlo de nuevo al primer ingreso.
- Cambia la contrasena despues de entrar.
EOF
