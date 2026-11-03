#!/usr/bin/env bash
# Aprimore o Saber — instalação local (macOS e Linux).
# Equivalente ao instalar.ps1. Uso: ./instalar.sh
set -euo pipefail
cd "$(dirname "$0")"

passo() { printf '\n==> %s\n' "$1"; }

# A porta sai do .env (PORTA_WEB), que é o que o docker-compose.yml lê.
# Sem .env, vale 3000 — e se a porta estiver ocupada, o script troca sozinho
# mais abaixo, em vez de morrer com "port is already allocated".
porta() {
  if [ -f .env ]; then
    sed -n 's/^PORTA_WEB=\([0-9]\{1,\}\).*/\1/p' .env | tail -1
  fi
}
PORTA="${PORTA_WEB:-$(porta)}"
PORTA="${PORTA:-3000}"

livre() { ! (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

fixar_porta() {  # grava no .env para o compose e os comandos seguintes acharem
  [ -f .env ] || { [ -f .env.example ] && cp .env.example .env || touch .env; }
  if grep -q '^PORTA_WEB=' .env; then
    sed -i.bak "s/^PORTA_WEB=.*/PORTA_WEB=$1/" .env && rm -f .env.bak
  else
    printf 'PORTA_WEB=%s\n' "$1" >> .env
  fi
  PORTA="$1"
}

passo 'Conferindo o Docker'
docker version --format '{{.Server.Version}}' >/dev/null 2>&1 || {
  echo "    O Docker não respondeu. Instale o Docker Desktop e deixe-o rodando." >&2
  exit 1
}

passo 'Construindo a imagem (a primeira vez leva alguns minutos)'
# Em rede que inspeciona TLS (corporativa), aponte a CA:
#   CA_BUNDLE=/caminho/ca.crt ./instalar.sh
if [ -n "${CA_BUNDLE:-}" ]; then
  echo "    usando CA extra: $CA_BUNDLE"
  docker build --secret "id=ca_bundle,src=$CA_BUNDLE" -t aprimore:latest .
else
  docker compose build
fi

passo "Subindo banco e aplicação (porta $PORTA)"
# Se outro programa já ocupa a porta, procura a próxima livre em vez de
# encerrar: quem instala quer o sistema no ar, não uma lição sobre portas.
erro="$(mktemp)"; trap 'rm -f "$erro"' EXIT
if ! PORTA_WEB="$PORTA" docker compose up -d 2>"$erro"; then
  if grep -qEi 'already allocated|address already in use|Bind for' "$erro"; then
    nova=''
    for p in $(seq $((PORTA + 1)) $((PORTA + 20))); do
      if livre "$p"; then nova="$p"; break; fi
    done
    [ -n "$nova" ] || { cat "$erro" >&2; exit 1; }
    echo "    A porta $PORTA está ocupada por outro programa; usando a $nova."
    fixar_porta "$nova"
    PORTA_WEB="$PORTA" docker compose up -d
  else
    cat "$erro" >&2
    exit 1
  fi
fi

passo 'Esperando a aplicação responder'
for _ in $(seq 1 60); do
  curl -sf "http://localhost:$PORTA/" >/dev/null && break
  sleep 2
done
curl -sf "http://localhost:$PORTA/" >/dev/null || {
  echo "    Não respondeu a tempo. Veja: docker compose logs -f web" >&2; exit 1;
}

passo 'Criando o administrador'
if [ "$(docker compose exec -T db psql -U aprimore -d aprimore -t -A -c "SELECT count(*) FROM usuario WHERE papel='admin'" | tr -d '[:space:]')" = "0" ]; then
  if [ ! -t 0 ]; then
    # sem terminal interativo (CI, pipe): não trava pedindo dados
    echo '    Sem terminal interativo. Crie o admin depois com:'
    echo '      docker compose exec web node scripts/criar-admin.mjs email@exemplo.com "Nome"'
    email=''; nome=''
  else
    read -rp 'E-mail do administrador: ' email
    read -rp 'Nome do administrador: ' nome
  fi
  if [ -n "$email" ] && [ -n "$nome" ]; then
    docker compose exec -T web node scripts/criar-admin.mjs "$email" "$nome"
    echo '    Anote a senha acima: ela não é mostrada de novo.'
  fi
else
  echo '    Já existe administrador.'
fi

cat <<TXT

  ============================================================
   Aprimore o Saber está rodando

   Site e sistema .... http://localhost:$PORTA
   Área do aluno ..... http://localhost:$PORTA/painel
   Administração ..... http://localhost:$PORTA/admin

   Conta de exemplo:   ana@exemplo.com / constitucional88

   Parar ............. docker compose down
  ============================================================

TXT
