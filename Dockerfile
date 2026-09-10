# Build multi-estágio: a imagem final leva só o standalone do Next.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Em rede com proxy que inspeciona TLS (corporativa ou de CI), passe a CA:
#   docker build --secret id=ca_bundle,src=/caminho/ca.crt .
# Sem o secret, o passo roda normalmente.
RUN --mount=type=secret,id=ca_bundle,target=/tmp/ca-bundle.crt \
    if [ -f /tmp/ca-bundle.crt ]; then export NODE_EXTRA_CA_CERTS=/tmp/ca-bundle.crt; fi; \
    npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# migrações rodam pelo entrypoint; o `pg` já vem traçado no standalone
COPY --from=build /app/db ./db
COPY --from=build /app/scripts ./scripts
# O importador do vade-mécum (§5.4) lê o HTML do Planalto com lib/planalto.ts.
# O standalone do Next embute essa lógica no bundle das páginas, mas o script
# roda fora dele, pelo entrypoint — e precisa do arquivo em si.
COPY --from=build /app/lib ./lib
COPY docker-entrypoint.sh /usr/local/bin/
# Clones feitos no Windows podem trazer CRLF: o shebang viraria "/bin/sh\r"
# e o container morreria em "no such file or directory". Normaliza aqui.
# ffmpeg: a capa do cartão do curso é um quadro do vídeo da primeira aula
# (lib/capa-video.ts). Extrair no servidor, e não no navegador do
# professor, é o que permite gerar a capa do acervo que já estava no ar —
# e não só a de vídeo novo.
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
 && chmod +x /usr/local/bin/docker-entrypoint.sh && chown -R nextjs:nodejs /app \
 && apk add --no-cache su-exec ffmpeg

# Sem `USER nextjs` aqui, de propósito: o entrypoint sobe como root apenas
# para preparar o volume de mídia (§10 — /midia nasce do root, e o upload
# do painel do professor, §5.10, precisa escrever nele) e em seguida
# larga o privilégio com su-exec. Migrações e servidor rodam como nextjs.
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/api/saude >/dev/null || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
