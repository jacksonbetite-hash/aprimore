#!/usr/bin/env bash
# Sobe (ou atualiza) a pilha de produção na VPS:
#
#   ./scripts/vps/subir.sh
#
# Roda a checagem antes; com impedimento, não toca em nada. Só mexe nos
# containers deste projeto (aprimore-*): nenhum outro sistema da
# máquina é parado, reiniciado ou reconstruído.
set -euo pipefail
cd "$(dirname "$0")/../.."

./scripts/vps/verificar.sh

DC=(docker compose -f docker-compose.yml -f docker-compose.vps.yml --profile vps)

# --force-recreate: já aconteceu de `up --build` não trocar o container e
# manter o BUILD_ID antigo (docs/plano-perfis-e-acessos.md).
"${DC[@]}" build --pull web
"${DC[@]}" up -d --force-recreate --remove-orphans

echo "Esperando a aplicação ficar saudável (migrações e, na 1ª vez, o vade-mécum)..."
for _ in $(seq 1 90); do
  estado="$(docker inspect -f '{{.State.Health.Status}}' "$("${DC[@]}" ps -q web)" 2>/dev/null || echo '?')"
  [ "$estado" = "healthy" ] && break
  sleep 5
done
"${DC[@]}" ps
if [ "${estado:-}" != "healthy" ]; then
  echo "✖ a aplicação não ficou saudável. Logs: ${DC[*]} logs --tail=100 web" >&2
  exit 1
fi
echo
echo "✔ no ar. Build: $("${DC[@]}" exec -T web cat .next/BUILD_ID)"
echo "  Primeira vez? Falta:"
echo "    ${DC[*]} exec web node scripts/criar-admin.mjs voce@exemplo.com \"Seu Nome\""
echo "    ${DC[*]} exec web node scripts/contas-demo.mjs"
