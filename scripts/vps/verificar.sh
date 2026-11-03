#!/usr/bin/env bash
# Checagem ANTES de subir, na VPS. Não altera nada — só lê e avisa.
#
#   ./scripts/vps/verificar.sh
#
# Existe para garantir que esta pilha não esbarre em nenhum sistema que
# já esteja rodando na máquina: porta ocupada, nome de container
# repetido, disco ou memória no limite. Sai com código 1 se houver
# impedimento; avisos não impedem.
set -uo pipefail
cd "$(dirname "$0")/../.."

erros=0; avisos=0
ok()    { echo "  ✔ $*"; }
aviso() { echo "  ! $*"; avisos=$((avisos+1)); }
erro()  { echo "  ✖ $*"; erros=$((erros+1)); }
valor() { grep -E "^$1=" .env 2>/dev/null | tail -1 | cut -d= -f2- | tr -d "'\""; }

echo "Docker"
if ! command -v docker >/dev/null; then erro "docker não instalado"; else
  ok "$(docker --version)"
  v="$(docker compose version --short 2>/dev/null || true)"
  if [ -z "$v" ]; then erro "docker compose (plugin v2) não encontrado"
  elif [ "$(printf '%s\n2.24.4\n' "${v#v}" | sort -V | head -1)" != "2.24.4" ]; then
    erro "docker compose $v — precisa 2.24.4+ (docker-compose.vps.yml usa !reset)"
  else ok "docker compose $v"; fi
fi

echo ".env"
if [ ! -f .env ]; then erro "sem .env — rode ./scripts/vps/gerar-env.sh <IP>"; else
  grep -q '<gerado>' .env && erro ".env ainda tem valores <gerado>"
  [ -n "$(valor VIDEO_SEGREDO)" ] || erro "VIDEO_SEGREDO vazio (produção não sobe sem ele)"
  [ "$(valor POSTGRES_PASSWORD)" = "aprimore" ] && erro "POSTGRES_PASSWORD ainda é o padrão"
  [ "$(valor WEBHOOK_SEGREDO)" = "segredo-de-desenvolvimento" ] && erro "WEBHOOK_SEGREDO ainda é o padrão"
  [ -n "$(valor ALUNO_DEMO)" ] && aviso "ALUNO_DEMO preenchido (ignorado em produção, mas deixe vazio)"
  cf="$(valor CADDYFILE)"
  if [ "$cf" = "./caddy/Caddyfile.ip" ]; then
    [ -n "$(valor IP_PUBLICO)" ] || erro "modo IP sem IP_PUBLICO"
    [ -n "$(valor ACESSO_SENHA_HASH)" ] || erro "modo IP sem ACESSO_SENHA_HASH (o site ficaria aberto)"
    ok "modo IP: https://$(valor IP_PUBLICO), com senha de acesso"
  else
    ok "modo domínio: $(valor DOMINIO_BASE) (certificados Let's Encrypt)"
  fi
  [ "$(stat -c %a .env 2>/dev/null)" = "600" ] || aviso ".env não está com permissão 600 (chmod 600 .env)"
fi

echo "Portas (só o Caddy desta pilha publica portas no host)"
for nome in PORTA_HTTP PORTA_HTTPS; do
  p="$(valor $nome)"; p="${p:-$([ $nome = PORTA_HTTP ] && echo 80 || echo 443)}"
  dono="$(docker ps --filter "publish=$p" --format '{{.Names}}' 2>/dev/null | head -1)"
  if [ "$dono" = "aprimore-caddy-1" ]; then ok "$p já é desta pilha"
  elif [ -n "$dono" ]; then erro "porta $p ocupada pelo container '$dono' — troque $nome no .env"
  elif ss -ltnH "sport = :$p" 2>/dev/null | grep -q .; then
    erro "porta $p ocupada por um processo do host ($(ss -ltnpH "sport = :$p" 2>/dev/null | grep -o 'users:(("[^"]*' | cut -d'"' -f2 | head -1)) — troque $nome no .env"
  else ok "porta $p livre"; fi
done

echo "Nomes"
projeto="$(valor COMPOSE_PROJECT_NAME)"; projeto="${projeto:-aprimore}"
outros="$(docker ps -a --format '{{.Names}}\t{{.Label "com.docker.compose.project.working_dir"}}' 2>/dev/null \
  | awk -v p="$projeto-" -v d="$PWD" 'index($1,p)==1 && $2!=d {print $1" ("$2")"}')"
if [ -n "$outros" ]; then erro "já existem containers '$projeto-*' de OUTRA pasta: $outros"
else ok "projeto '$projeto' não colide com containers existentes"; fi

echo "Recursos"
livre_gb=$(df -BG --output=avail . | tail -1 | tr -dc 0-9)
[ "${livre_gb:-0}" -ge 15 ] && ok "disco livre: ${livre_gb} GB" || aviso "disco livre: ${livre_gb} GB (o vídeo das aulas cresce rápido; recomendo 15 GB+)"
mem_mb=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo 2>/dev/null)
[ "${mem_mb:-0}" -ge 3000 ] && ok "memória disponível: ${mem_mb} MB" || aviso "memória disponível: ${mem_mb} MB (a pilha pode usar até ~3 GB; ajuste LIMITE_MEMORIA_* no .env)"

echo "Firewall"
if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q "Status: active"; then
  ok "ufw ativo — libere as portas do Caddy: ufw allow $(valor PORTA_HTTP)/tcp && ufw allow $(valor PORTA_HTTPS)/tcp"
else
  aviso "ufw inativo ou ausente: só o Caddy publica porta, mas mantenha SSH por chave e o resto fechado"
fi

echo
if [ $erros -gt 0 ]; then echo "✖ $erros impedimento(s), $avisos aviso(s). Nada foi alterado."; exit 1; fi
echo "✔ pronto para subir ($avisos aviso(s)): ./scripts/vps/subir.sh"
