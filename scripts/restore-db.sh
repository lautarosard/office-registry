#!/usr/bin/env bash
# Restaura la base de producción desde una copia de backup-db.sh.
# REEMPLAZA todos los datos actuales.
#
#   bash scripts/restore-db.sh backups/registry-AAAAMMDD-HHMMSS.dump
#
# Pide escribir RESTAURAR para continuar (--yes lo omite). Antes de tocar nada
# guarda una copia del estado actual, y restaura en una base aparte: si algo
# falla, la base en uso queda como estaba.
set -euo pipefail

usage() {
  echo "Uso: bash scripts/restore-db.sh <archivo.dump> [--yes]" >&2
  exit 1
}

[[ $# -ge 1 && $# -le 2 ]] || usage
[[ -f "$1" && -s "$1" ]] || {
  echo "ERROR: no existe el archivo o está vacío: $1" >&2
  exit 1
}
[[ $# -eq 1 || "$2" == "--yes" ]] || usage

dump="$(readlink -f "$1")"
cd "$(dirname "$(readlink -f "$0")")/.."

# Ejecuta un comando dentro del contenedor de la base.
in_db() {
  docker compose exec -T db sh -c "$1"
}

in_db 'pg_restore --list >/dev/null' <"$dump" || {
  echo "ERROR: el archivo no es una copia válida." >&2
  exit 1
}

if [[ "${2:-}" != "--yes" ]]; then
  echo "Se REEMPLAZARÁN todos los datos actuales con:"
  echo "  $dump"
  echo "Los cambios hechos después de esa copia se perderán."
  read -r -p "Escriba RESTAURAR para continuar: " answer
  [[ "$answer" == "RESTAURAR" ]] || {
    echo "Cancelado. No se modificó nada."
    exit 1
  }
fi

# 1. Copia del estado actual, fuera de la rotación diaria.
umask 077
safety_dir="${BACKUP_DIR:-$PWD/backups}"
mkdir -p "$safety_dir"
safety="$safety_dir/pre-restore-$(date +%Y%m%d-%H%M%S).dump"
in_db 'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >"$safety"
echo "Estado actual guardado en: $safety"

# 2. Restaurar en una base nueva.
in_db 'dropdb --if-exists -U "$POSTGRES_USER" "${POSTGRES_DB}_restore" &&
       createdb -U "$POSTGRES_USER" "${POSTGRES_DB}_restore"'
in_db 'pg_restore -U "$POSTGRES_USER" -d "${POSTGRES_DB}_restore" \
         --no-owner --single-transaction --exit-on-error' <"$dump"

# 3. Reemplazar la base en uso, con la aplicación detenida.
docker compose stop backend
trap 'echo "ATENCIÓN: restauración incompleta. Revise y ejecute: docker compose up -d" >&2' ERR
in_db 'dropdb --force -U "$POSTGRES_USER" "$POSTGRES_DB" &&
       psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d postgres \
         -c "ALTER DATABASE \"${POSTGRES_DB}_restore\" RENAME TO \"${POSTGRES_DB}\""'

# Al iniciar, la aplicación aplica las migraciones que falten.
docker compose up -d --wait
echo "Restauración completa."
