#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/certs/internal"
SERVER_IP="10.156.99.35"
DNS_NAMES="bitacora.local,bitacora.interno,opsbitacora.local"
CA_DAYS="3650"
SERVER_DAYS="825"
FORCE_SERVER=0
ROTATE_CA=0

usage() {
  cat <<'EOF'
Uso:
  bash scripts/generate-internal-certs.sh [opciones]

Opciones:
  --ip <ip>             IP SAN del certificado servidor (default: 10.156.99.35).
  --dns <lista>         DNS SAN separados por coma.
                        Default: bitacora.local,bitacora.interno,opsbitacora.local
  --out-dir <ruta>      Carpeta de salida (default: certs/internal).
  --force-server        Regenera server.key/server.crt conservando la CA.
  --rotate-ca           Regenera CA y certificado servidor. Usar solo si vas a reinstalar ca.crt en clientes.
  -h, --help            Muestra ayuda.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ip)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --ip requiere valor."
        exit 1
      }
      SERVER_IP="$2"
      shift 2
      ;;
    --dns)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --dns requiere valor."
        exit 1
      }
      DNS_NAMES="$2"
      shift 2
      ;;
    --out-dir)
      [[ $# -ge 2 ]] || {
        echo "ERROR: --out-dir requiere valor."
        exit 1
      }
      OUT_DIR="$2"
      shift 2
      ;;
    --force-server)
      FORCE_SERVER=1
      shift
      ;;
    --rotate-ca)
      ROTATE_CA=1
      FORCE_SERVER=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: opcion no reconocida: $1"
      usage
      exit 1
      ;;
  esac
done

if ! command -v openssl >/dev/null 2>&1; then
  echo "ERROR: openssl no esta instalado."
  exit 1
fi

if [[ ! "$SERVER_IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
  echo "ERROR: --ip debe ser una IPv4 valida."
  exit 1
fi

IFS="," read -r -a DNS_ARRAY <<< "$DNS_NAMES"
NORMALIZED_DNS=()
for item in "${DNS_ARRAY[@]}"; do
  name="$(echo "$item" | xargs)"
  [[ -n "$name" ]] && NORMALIZED_DNS+=("$name")
done

if ((${#NORMALIZED_DNS[@]} == 0)); then
  echo "ERROR: debes indicar al menos un DNS SAN."
  exit 1
fi

mkdir -p "$OUT_DIR"
umask 077

CA_KEY="$OUT_DIR/ca.key"
CA_CRT="$OUT_DIR/ca.crt"
SERVER_KEY="$OUT_DIR/server.key"
SERVER_CSR="$OUT_DIR/server.csr"
SERVER_CRT="$OUT_DIR/server.crt"
SERVER_CNF="$OUT_DIR/server.openssl.cnf"
CA_SRL="$OUT_DIR/ca.srl"

if [[ "$ROTATE_CA" -eq 1 ]]; then
  rm -f "$CA_KEY" "$CA_CRT" "$CA_SRL" "$SERVER_KEY" "$SERVER_CSR" "$SERVER_CRT" "$SERVER_CNF"
fi

if [[ ! -f "$CA_KEY" || ! -f "$CA_CRT" ]]; then
  echo "INFO: generando CA interna..."
  openssl genrsa -out "$CA_KEY" 4096
  MSYS_NO_PATHCONV=1 openssl req -x509 -new -nodes \
    -key "$CA_KEY" \
    -sha256 \
    -days "$CA_DAYS" \
    -out "$CA_CRT" \
    -subj "/CN=Bitacora Internal CA/O=Bitacora Internal"
  chmod 600 "$CA_KEY"
  chmod 644 "$CA_CRT"
else
  echo "INFO: CA existente detectada; se conserva $CA_CRT"
fi

if [[ "$FORCE_SERVER" -eq 1 ]]; then
  rm -f "$SERVER_KEY" "$SERVER_CSR" "$SERVER_CRT" "$SERVER_CNF"
fi

if [[ -f "$SERVER_KEY" || -f "$SERVER_CRT" ]]; then
  echo "INFO: certificado servidor existente detectado; usa --force-server para regenerarlo."
else
  echo "INFO: generando certificado servidor con SAN..."
  {
    cat <<EOF
[ req ]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = req_distinguished_name
req_extensions = v3_req

[ req_distinguished_name ]
CN = ${SERVER_IP}
O = Bitacora Internal

[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[ alt_names ]
IP.1 = ${SERVER_IP}
EOF
    index=1
    for name in "${NORMALIZED_DNS[@]}"; do
      echo "DNS.${index} = ${name}"
      index=$((index + 1))
    done
  } > "$SERVER_CNF"

  openssl genrsa -out "$SERVER_KEY" 2048
  openssl req -new -key "$SERVER_KEY" -out "$SERVER_CSR" -config "$SERVER_CNF"
  openssl x509 -req \
    -in "$SERVER_CSR" \
    -CA "$CA_CRT" \
    -CAkey "$CA_KEY" \
    -CAcreateserial \
    -out "$SERVER_CRT" \
    -days "$SERVER_DAYS" \
    -sha256 \
    -extensions v3_req \
    -extfile "$SERVER_CNF"

  chmod 600 "$SERVER_KEY"
  chmod 644 "$SERVER_CRT"
fi

echo
echo "Certificados listos en: $OUT_DIR"
echo "CA publica para instalar en clientes: $CA_CRT"
echo "Certificado servidor: $SERVER_CRT"
echo "Clave privada servidor: $SERVER_KEY"
echo
echo "SAN configurado:"
openssl x509 -in "$SERVER_CRT" -noout -text | grep -A1 "Subject Alternative Name" || true
echo
echo "IMPORTANTE: instala solo ca.crt en los clientes. Nunca compartas ca.key ni server.key."
