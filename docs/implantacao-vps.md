# Implantação na VPS

Pilha **independente**: não faz parte do grupo Electria nem do TeiaFlow e
não compartilha nada com eles (containers `aprimoreosaber-*`, volumes e
rede próprios). O único ponto de contato possível numa VPS compartilhada são
as portas do host, e o `scripts/vps/verificar.sh` barra a subida se
alguma estiver ocupada.

Branch de implantação: **`staging`**. Domínio pretendido: **`aprimoree.com.br`**
(ainda não registrado → o site começa no **modo IP**).

```
Internet ──► Caddy (único que publica porta: 80/443)
               │  HTTPS · senha de acesso (modo IP) · certificados (modo domínio)
               ▼
             nginx  ── entrega o vídeo por sendfile · limita tentativas de login
               ▼
             web (Next, porta 3000 só na rede interna) ──► db (Postgres, rede interna)
```

## 1. Preparar a VPS (uma vez)

Ubuntu 22.04/24.04 com Docker Engine e o plugin Compose **2.24.4+**:

```bash
curl -fsSL https://get.docker.com | sh
docker compose version
```

Segurança mínima, se a VPS for nova (numa VPS que já roda outros sistemas,
**não mexa** no firewall nem no SSH sem conferir o que eles usam):

```bash
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
# SSH só por chave: PasswordAuthentication no em /etc/ssh/sshd_config
```

> Porta publicada pelo Docker passa **por cima** do ufw. Por isso o
> `docker-compose.vps.yml` não publica a porta da aplicação (3000) nem a do
> banco: fechar no firewall não bastaria.

## 2. Trazer o código

```bash
sudo mkdir -p /opt/aprimore && sudo chown "$USER" /opt/aprimore
git clone -b staging https://github.com/jacksonbetite-hash/aprimore.git /opt/aprimore
cd /opt/aprimore
```

## 3. Gerar o `.env` de produção

```bash
./scripts/vps/gerar-env.sh <IP-público-da-VPS>
```

Sorteia a senha do banco, os segredos de webhook e vídeo e o token do
Asaas, e gera a **senha de acesso ao site**, que é mostrada uma única vez.
Modelo comentado: [`.env.vps.example`](../.env.vps.example).

Se 80/443 já estiverem ocupadas por outro sistema, edite `PORTA_HTTP` e
`PORTA_HTTPS` no `.env` (ex.: 8080/8443) e libere essas portas no firewall.

## 4. Conferir e subir

```bash
./scripts/vps/verificar.sh   # só lê; aponta porta ocupada, segredo faltando, disco, memória
./scripts/vps/subir.sh       # build, sobe, espera ficar saudável
```

A primeira subida aplica as migrações e importa o vade-mécum (~3 min).

## 5. Contas

```bash
DC="docker compose -f docker-compose.yml -f docker-compose.vps.yml --profile vps"
$DC exec web node scripts/criar-admin.mjs voce@seudominio.com.br "Seu Nome"
$DC exec web node scripts/contas-demo.mjs
```

O `contas-demo.mjs` **exclui** a `ana@exemplo.com`, cuja senha está no
repositório público (db/011), e cria `demo@aprimoree.com.br` com senha
sorteada e cortesia em duas matérias. Pode ser rodado de novo: a conta
de demonstração só ganha senha nova.

Os roteiros de `scripts/demo/` (portal do professor, empresa) também
funcionam contra a VPS, mas só com `SENHA_DEMO` definida: as senhas padrão
deles estão no repositório e são recusadas fora de `localhost`.

## 6. Acessar (modo IP)

`https://<IP>` (com `:PORTA_HTTPS` se não for 443). O navegador avisa que o
certificado não é confiável, porque é interno e não existe certificado
público para IP. Aceite uma vez. Depois vem a senha de acesso (usuário
`aprimore`) e então o site.

Por que HTTPS mesmo sem domínio: em produção o cookie de sessão é `Secure`,
e em `http://` o navegador o descarta, ou seja, o login não funcionaria. Sem
HTTPS a senha também trafegaria aberta.

O que está protegido:

| Camada | Proteção |
|---|---|
| Caddy | Senha na porta do site inteiro (exceto `/api/webhook` e `/api/saude`); só o IP configurado responde; sem cabeçalho `Server` |
| nginx | 10 POSTs/min por IP em `/entrar`, `/cadastrar`, `/convite`, `/conta` (429 acima disso); IP real do visitante |
| Compose | Aplicação e banco sem porta no host; teto de memória e de log por serviço |
| Aplicação | Webhook com assinatura conferida; vídeo com URL assinada; sessão revogável |

## 7. Backup

```bash
sudo crontab -e
30 3 * * * /opt/aprimore/scripts/vps/backup.sh >> /var/log/aprimore-backup.log 2>&1
```

Banco (`pg_dump`) e mídia (volume `midia`) em `/var/backups/aprimore`,
guardados por 7 dias. **Copie esse diretório para fora da VPS**, porque um
backup no mesmo disco não sobrevive à perda do servidor. A restauração está
no cabeçalho do script.

## 8. Atualizar

```bash
cd /opt/aprimore && git pull && ./scripts/vps/subir.sh
```

Só os containers `aprimoreosaber-*` são recriados.

## 9. Quando o domínio `aprimoree.com.br` for registrado

1. DNS: registro **A** de `aprimoree.com.br` e de `*.aprimoree.com.br` → IP da VPS.
2. No `.env`: `CADDYFILE=./caddy/Caddyfile` (e `PORTA_HTTP=80`, `PORTA_HTTPS=443`).
3. `./scripts/vps/subir.sh`

O Caddy emite os certificados do Let's Encrypt sozinho, inclusive o de
cada portal (`<máscara>.aprimoree.com.br`) e o do domínio próprio de
professor, sempre depois de perguntar à aplicação se o domínio é de um
portal no ar (`/api/dominio-permitido`). A senha de acesso deixa de
existir: o site fica público.

**VPS compartilhada com 80/443 já ocupadas:** o Let's Encrypt exige essas
portas. Nesse caso o proxy que já atende os outros sistemas encaminha
`aprimoree.com.br` e `*.aprimoree.com.br` para a `PORTA_HTTPS` desta pilha,
o que deve ser decidido antes do passo 2.

## 10. Antes de abrir ao público

- [ ] 2FA para admin e professor (§10 do discovery; ainda não implementado)
- [ ] Asaas: sandbox testado de ponta a ponta → `ASAAS_AMBIENTE=producao` e chave `$aact_prod_`
- [ ] Depoimentos com `.selo-ilustrativo` substituídos por conteúdo real (ou removidos)
- [ ] Retratos de `i.pravatar.cc` trocados por fotos em `public/`
- [ ] Backup copiado para fora da VPS e uma restauração testada
- [ ] Avaliar tornar o repositório GitHub privado (hoje é público)
