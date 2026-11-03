#!/usr/bin/env bash
# Sobe (ou atualiza) a pilha na VPS. Dois modos:
#
#   IMAGEM_WEB=ghcr.io/jacksonbetite-hash/aprimore:sha-abc1234 ./scripts/vps/subir.sh
#       → é o que o deploy do GitHub Actions roda: BAIXA a imagem pronta.
#         O servidor nunca compila o Next (o build come vários GB de RAM e
#         disputaria a máquina com os outros sistemas que rodam nela).
#
#   ./scripts/vps/subir.sh
#       → usa a IMAGEM_WEB gravada no .env pelo último deploy; se não houver
#         nenhuma, compila aqui mesmo (só para emergência ou primeira vez
#         sem o Actions configurado).
#
# Roda a checagem antes; com impedimento, não toca em nada. Só mexe nos
# containers deste projeto (aprimore-* / aprimore-staging-*): nenhum outro
# sistema da máquina é parado, reiniciado ou reconstruído.
set -euo pipefail
cd "$(dirname "$0")/../.."

./scripts/vps/verificar.sh

# A imagem escolhida fica no .env: assim um `docker compose ...` à mão,
# depois, continua usando a mesma imagem do último deploy.
if [ -n "${IMAGEM_WEB:-}" ]; then
  if grep -q '^IMAGEM_WEB=' .env; then
    sed -i "s|^IMAGEM_WEB=.*|IMAGEM_WEB=$IMAGEM_WEB|" .env
  else
    printf '\n# Imagem do último deploy (gravada pelo scripts/vps/subir.sh)\nIMAGEM_WEB=%s\n' "$IMAGEM_WEB" >> .env
  fi
fi
IMAGEM="$(grep -E '^IMAGEM_WEB=' .env | tail -1 | cut -d= -f2-)"

DC=(docker compose -f docker-compose.yml -f docker-compose.vps.yml --profile vps)

# --force-recreate: já aconteceu de `up --build` não trocar o container e
# manter o BUILD_ID antigo (docs/plano-perfis-e-acessos.md).
if [ -n "$IMAGEM" ]; then
  echo "Imagem pronta: $IMAGEM"
  # O deploy do Actions já baixou a imagem (com login temporário); aqui só
  # se baixa se ela não estiver na máquina — imagem pública ou login feito.
  docker image inspect "$IMAGEM" >/dev/null 2>&1 || "${DC[@]}" pull web
  "${DC[@]}" up -d --no-build --force-recreate --remove-orphans
else
  echo "Sem IMAGEM_WEB: compilando a imagem nesta máquina."
  "${DC[@]}" build --pull web
  "${DC[@]}" up -d --force-recreate --remove-orphans
fi

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

# Cada deploy baixa uma imagem nova (~300 MB). Apaga só as DESTA aplicação
# (rótulo do repositório, posto pelo Actions), que nenhum container usa —
# a de produção e a de staging em uso ficam — e com mais de 7 dias, para
# sobrar para onde voltar. Imagens de outros sistemas não têm o rótulo.
docker image prune -a -f \
  --filter "label=org.opencontainers.image.source=https://github.com/jacksonbetite-hash/aprimore" \
  --filter "until=168h" >/dev/null 2>&1 || true

echo
echo "✔ no ar. Build: $("${DC[@]}" exec -T web cat .next/BUILD_ID)"
echo "  Primeira vez? Falta:"
echo "    ${DC[*]} exec web node scripts/criar-admin.mjs voce@exemplo.com \"Seu Nome\""
echo "    ${DC[*]} exec web node scripts/contas-demo.mjs"
