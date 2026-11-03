# Instalar em `C:\Users\Usuario\Documents\Aprimore`

Eu rodo num contêiner na nuvem e **não tenho acesso à sua máquina** — não
consigo escrever nessa pasta daqui. O que dá para fazer, e é o caminho normal,
é você trazer o repositório para lá com um comando. Leva um minuto.

## 1. Trazer o código para a pasta

Abra o **PowerShell** e cole:

```powershell
cd "$env:USERPROFILE\Documents"
git clone -b claude/discovery-repo-prototype-xgljgy `
  https://github.com/jacksonbetite-hash/aprimore.git Aprimore
cd Aprimore
```

> Se a pasta `Aprimore` já existir com o `discovery.md` dentro,
> mova-a antes (`Rename-Item Aprimore Aprimore-antigo`) —
> o `git clone` precisa de uma pasta vazia.

Sem Git instalado? Baixe o ZIP em
`https://github.com/jacksonbetite-hash/aprimore/archive/refs/heads/claude/discovery-repo-prototype-xgljgy.zip`,
extraia e renomeie a pasta para `Aprimore`.

## 2. Instalar o Docker Desktop

Baixe em <https://www.docker.com/products/docker-desktop/>, instale, abra e
espere aparecer **"Engine running"** no canto inferior.

No Windows, o Docker Desktop pede o **WSL 2**. Se ele reclamar, rode no
PowerShell **como administrador** e reinicie:

```powershell
wsl --install
```

## 3. Rodar

Dentro da pasta do projeto:

```powershell
.\instalar.ps1
```

Ou clique duas vezes em **`instalar.bat`**.

O script confere o Docker, constrói a imagem, sobe o banco, aplica as
migrações, popula o catálogo, pergunta o e-mail do administrador e abre o
navegador. A primeira execução baixa as imagens base e leva alguns minutos;
as seguintes sobem em segundos.

## 4. Usar

| O quê | Onde |
|---|---|
| Site e sistema | <http://localhost:3000> |
| Área do aluno | <http://localhost:3000/painel> |
| Administração | <http://localhost:3000/admin> |

**Conta de exemplo** (vem no seed, com trial e licença promocional ativos):
`ana@exemplo.com` / `constitucional88`

**Administrador**: criado pelo script, com senha sorteada e mostrada uma única
vez. Para criar outro depois:

```powershell
docker compose exec web node scripts/criar-admin.mjs voce@exemplo.com "Seu Nome"
```

## Testar a compra sem gateway

O sistema vem com um provedor de pagamento **simulado**: nada é cobrado, e o
fluxo inteiro funciona. Na tela de planos, escolha a matéria e clique em
assinar — abre o checkout com um código Pix de demonstração.

Para simular a confirmação que o banco enviaria:

```powershell
docker compose exec web node scripts/confirmar-pagamento.mjs AD-20260829-A1B2C3
```

(a referência do pedido aparece na própria tela de checkout)

A licença é emitida na hora e a aula abre. Para simular uma recusa, acrescente
`--falhar`.

Ao contratar Asaas ou Pagar.me, troque `PROVEDOR_PAGAMENTO` no `.env` e
implemente o módulo correspondente — nenhuma tela muda.

## Configuração

Copie `.env.example` para `.env` para ajustar porta, senha do banco e o
segredo do webhook:

```powershell
Copy-Item .env.example .env
notepad .env
docker compose up -d
```

**Antes de expor o sistema a qualquer rede**, troque `POSTGRES_PASSWORD` e
`WEBHOOK_SEGREDO` — o segredo do webhook é o que impede alguém de emitir
licença de graça.

## Comandos do dia a dia

```powershell
docker compose down          # parar (os dados ficam)
docker compose down -v       # parar e apagar o banco
docker compose up -d         # subir de novo
docker compose logs -f web   # ver o que a aplicação está fazendo
curl http://localhost:3000/api/saude   # conferir app + banco
docker compose build; docker compose up -d   # aplicar mudanças no código
```

## Se algo der errado

**"docker: command not found" ou o script diz que o Docker não respondeu**
O Docker Desktop não está aberto ou terminou de iniciar. Abra e espere
"Engine running".

**A porta 3000 já está em uso**
O `instalar.ps1` resolve sozinho: procura a primeira porta livre a partir da
3001, grava `PORTA_WEB` no `.env` e avisa qual endereço usar. Para escolher a
porta você mesmo, antes de rodar:

```powershell
Copy-Item .env.example .env -ErrorAction SilentlyContinue
Add-Content .env "PORTA_WEB=3001"
.\instalar.ps1
```

**A build falha em `npm ci` com erro de certificado**
Sua rede inspeciona HTTPS (comum em rede corporativa). Exporte a CA da sua
empresa para um arquivo e construa assim:

```powershell
docker build --secret id=ca_bundle,src=C:\caminho\ca.crt -t aprimore .
docker compose up -d
```

**Quero começar do zero**

```powershell
docker compose down -v
.\instalar.ps1
```

## Onde mexer no código

| O quê | Arquivo |
|---|---|
| Cores, tipografia e componentes | `app/globals.css` |
| Ícones | `app/ui.tsx` |
| Textos e telas | `app/**/page.tsx` |
| Catálogo, aulas e questões | `db/*.sql` |
| Regras de licença | `lib/licenca.ts` |

Depois de editar: `docker compose build; docker compose up -d`.

Para desenvolver com recarga automática (precisa de Node 22):

```powershell
docker compose up -d db
$env:DATABASE_URL="postgres://aprimore:aprimore@localhost:5432/aprimore"
npm install
npm run migrate
npm run dev
```
