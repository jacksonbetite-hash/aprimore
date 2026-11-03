#!/usr/bin/env bash
# Gera o .env de PRODUÇÃO a partir do .env.vps.example, sorteando todos
# os segredos. Roda NA VPS, na pasta do projeto:
#
#   ./scripts/vps/gerar-env.sh 203.0.113.10
#
# Imprime UMA vez a senha de acesso ao site (modo IP). Recusa sobrescrever
# um .env existente: trocar POSTGRES_PASSWORD depois que o banco nasceu
# deixa a aplicação sem acesso a ele.
set -euo pipefail
cd "$(dirname "$0")/../.."

IP="${1:-}"
if [[ ! "$IP" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]]; then
  echo "uso: $0 <IP público da VPS>   (ex.: $0 203.0.113.10)" >&2
  exit 1
fi
if [ -e .env ]; then
  echo "✖ já existe um .env aqui — não sobrescrevo (o banco usa a senha dele)." >&2
  echo "  Para recomeçar do zero de propósito: mv .env .env.antigo" >&2
  exit 1
fi

segredo() { openssl rand -hex 32; }
SENHA_ACESSO="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)"
# bcrypt pelo próprio Caddy — o mesmo binário que vai conferir a senha.
HASH="$(docker run --rm caddy:2-alpine caddy hash-password --plaintext "$SENHA_ACESSO")"

# Valores sem caracteres especiais de sed (hex e base64 sem / + =), e o
# hash bcrypt só tem [A-Za-z0-9./$] — o delimitador | é seguro.
sed \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(segredo)|" \
  -e "s|^IP_PUBLICO=.*|IP_PUBLICO=$IP|" \
  -e "s|^ACESSO_SENHA_HASH=.*|ACESSO_SENHA_HASH='$HASH'|" \
  -e "s|^ASAAS_WEBHOOK_TOKEN=.*|ASAAS_WEBHOOK_TOKEN=$(segredo)|" \
  -e "s|^WEBHOOK_SEGREDO=.*|WEBHOOK_SEGREDO=$(segredo)|" \
  -e "s|^VIDEO_SEGREDO=.*|VIDEO_SEGREDO=$(segredo)|" \
  .env.vps.example > .env
chmod 600 .env

if grep -q '<gerado>' .env; then
  echo "✖ sobrou valor sem gerar no .env:" >&2; grep -n '<gerado>' .env >&2; exit 1
fi

cat <<FIM

✔ .env de produção criado (permissão 600).

  Acesso ao site enquanto não há domínio:
    endereço: https://$IP$( [ "$(grep '^PORTA_HTTPS=' .env | cut -d= -f2)" = "443" ] || echo ":$(grep '^PORTA_HTTPS=' .env | cut -d= -f2)")
    usuário:  aprimore
    senha:    $SENHA_ACESSO
  (anote agora — não será mostrada de novo; o .env guarda só o hash)

  Próximo passo: ./scripts/vps/verificar.sh
FIM
