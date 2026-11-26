#!/usr/bin/env bash
# Copia de seguridad de la base de producción (formato "custom" de pg_dump).
#
#   bash scripts/backup-db.sh
#
# Variables opcionales:
#   BACKUP_DIR   carpeta de destino           (por defecto: ./backups)
#   BACKUP_KEEP  cuántas copias conservar     (por defecto: 30)
set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")/.."

BACKUP_DIR="${BACKUP_DIR:-$PWD/backups}"
BACKUP_KEEP="${BACKUP_KEEP:-30}"

if ! [[ "$BACKUP_KEEP" =~ ^[1-9][0-9]*$ ]]; then
  echo "ERROR: BACKUP_KEEP debe ser un número mayor que cero." >&2
  exit 1
fi

# Los volcados contienen todos los registros: solo el dueño puede leerlos.
umask 077
mkdir -p "$BACKUP_DIR"

file="$BACKUP_DIR/registry-$(date +%Y%m%d-%H%M%S).dump"
partial="$file.partial"
trap 'rm -f "$partial"' EXIT

docker compose exec -T db \
  sh -c 'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >"$partial"

# Una copia que no se puede leer no sirve: comprobarla antes de guardarla.
docker compose exec -T db pg_restore --list <"$partial" >/dev/null
mv "$partial" "$file"
echo "$(date '+%F %T') Copia creada: $file ($(du -h "$file" | cut -f1))"

# Rotación: solo se borran las copias anteriores generadas por este script.
# El nombre lleva la fecha, así que el orden alfabético es el cronológico.
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'registry-*.dump' |
  sort -r |
  tail -n +"$((BACKUP_KEEP + 1))" |
  while IFS= read -r old; do
    rm -f -- "$old"
    echo "$(date '+%F %T') Copia antigua eliminada: $old"
  done
