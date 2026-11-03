#!/usr/bin/env bash
# Backup do banco e da mídia, com rotação. Na VPS, pelo cron (root):
#
#   30 3 * * * /opt/aprimore/scripts/vps/backup.sh >> /var/log/aprimore-backup.log 2>&1
#
# DESTINO padrão /var/backups/aprimore (troque com BACKUP_DIR). Guarda
# BACKUP_DIAS dias (padrão 7). Lembre: backup no mesmo disco da VPS não
# sobrevive à perda da VPS — copie o diretório para fora (rclone, rsync,
# snapshot do provedor).
#
# O volume `midia` NÃO está no dump do Postgres: são duas cópias.
#
# Restaurar:
#   gunzip -c banco-AAAAMMDD-HHMM.sql.gz | docker compose exec -T db psql -U aprimore -d aprimoreosaber
#   docker run --rm -v aprimoreosaber_midia:/midia -v "$PWD":/b alpine tar xzf /b/midia-AAAAMMDD-HHMM.tar.gz -C /midia
set -euo pipefail
cd "$(dirname "$0")/../.."

DESTINO="${BACKUP_DIR:-/var/backups/aprimore}"
DIAS="${BACKUP_DIAS:-7}"
QUANDO="$(date +%Y%m%d-%H%M)"
PROJETO="$(grep -E '^COMPOSE_PROJECT_NAME=' .env | cut -d= -f2)"; PROJETO="${PROJETO:-aprimoreosaber}"
mkdir -p "$DESTINO"; chmod 700 "$DESTINO"

docker compose exec -T db pg_dump -U aprimore -d aprimoreosaber --no-owner \
  | gzip > "$DESTINO/banco-$QUANDO.sql.gz.parcial"
mv "$DESTINO/banco-$QUANDO.sql.gz.parcial" "$DESTINO/banco-$QUANDO.sql.gz"

# Somente leitura no volume: o backup nunca altera a mídia.
docker run --rm -v "${PROJETO}_midia:/midia:ro" -v "$DESTINO:/b" alpine \
  tar czf "/b/midia-$QUANDO.tar.gz.parcial" -C /midia .
mv "$DESTINO/midia-$QUANDO.tar.gz.parcial" "$DESTINO/midia-$QUANDO.tar.gz"

find "$DESTINO" -maxdepth 1 -name '*.gz' -mtime +"$DIAS" -delete
echo "$(date '+%F %T') ✔ backup $QUANDO: $(du -sh "$DESTINO" | cut -f1) em $DESTINO"
