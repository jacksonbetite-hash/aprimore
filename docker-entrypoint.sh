#!/bin/sh
set -e

# Como root, uma vez por subida: o volume de mídia (§10) nasce do root e a
# aplicação — vídeo e foto enviados pelo painel do professor (§5.10) —
# precisa escrever nele. Cria os diretórios, entrega-os ao usuário da
# aplicação e larga o privilégio. Só os diretórios de topo mudam de dono:
# os arquivos são criados pelo próprio nextjs, e um chown recursivo num
# volume de centenas de gigabytes atrasaria toda subida.
if [ "$(id -u)" = "0" ]; then
  MIDIA="${VIDEO_RAIZ:-/midia/video}"
  RAIZ="$(dirname "$MIDIA")"
  # `documento` guarda o acervo da Biblioteca da empresa (db/042). Sem
  # este mkdir a primeira publicacao do RH falha com EACCES: o volume
  # nasce do root, e a aplicacao roda como nextjs.
  mkdir -p "$MIDIA" "$RAIZ/imagem" "$RAIZ/documento"
  chown nextjs:nodejs "$RAIZ" "$MIDIA" "$RAIZ/imagem" "$RAIZ/documento"
  exec su-exec nextjs "$0" "$@"
fi

# Aplica migrações pendentes antes de servir. É idempotente: cada arquivo
# roda uma vez só, registrado em schema_migracao.
if [ "${RODAR_MIGRACOES:-1}" = "1" ]; then
  node scripts/migrate.mjs
fi

# Primeira subida: traz o acervo do vade-mécum (§5.4) do Planalto. Só uma vez
# — depois disso o banco já tem as normas e o comando sai na hora. A falha
# não derruba o site: sem rede, a instalação continua e `npm run leis` fecha
# a lacuna quando houver conexão.
if [ "${IMPORTAR_LEIS:-1}" = "1" ]; then
  node scripts/importar-leis.mjs --se-necessario || echo "aviso: acervo do vade-mécum não importado — rode 'npm run leis' quando houver rede"
fi

exec "$@"
