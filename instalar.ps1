<#
  Aprimore o Saber — instalação local (Windows)

  Sobe o sistema completo na sua máquina com Docker Desktop:
  banco PostgreSQL, migrações, catálogo populado e a aplicação no ar.

  Uso, no PowerShell, dentro da pasta do projeto:
      .\instalar.ps1

  Se o PowerShell recusar por política de execução, rode uma vez:
      Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#>

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $raiz

function Passo($texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }
function Ok($texto)    { Write-Host "    $texto" -ForegroundColor Green }
function Aviso($texto) { Write-Host "    $texto" -ForegroundColor Yellow }

Passo 'Conferindo o Docker'
try {
  docker version --format '{{.Server.Version}}' | Out-Null
  Ok 'Docker respondendo.'
} catch {
  Write-Host @"
    O Docker nao respondeu.

    1. Instale o Docker Desktop: https://www.docker.com/products/docker-desktop/
    2. Abra o Docker Desktop e espere ficar "Engine running".
    3. Rode este script de novo.
"@ -ForegroundColor Red
  exit 1
}

# A porta sai do .env (PORTA_WEB), que e o que o docker-compose.yml le.
function PortaConfigurada {
  if ($env:PORTA_WEB) { return [int]$env:PORTA_WEB }
  if (Test-Path .env) {
    $linha = Select-String -Path .env -Pattern '^PORTA_WEB=(\d+)' | Select-Object -Last 1
    if ($linha) { return [int]$linha.Matches[0].Groups[1].Value }
  }
  return 3000
}

function FixarPorta($valor) {  # grava no .env, para o compose e os comandos seguintes acharem
  if (-not (Test-Path .env)) {
    if (Test-Path .env.example) { Copy-Item .env.example .env } else { New-Item -ItemType File .env | Out-Null }
  }
  $texto = Get-Content .env -Raw
  if ($texto -match '(?m)^PORTA_WEB=') {
    ($texto -replace '(?m)^PORTA_WEB=.*', "PORTA_WEB=$valor") | Set-Content .env -NoNewline
  } else {
    Add-Content .env "PORTA_WEB=$valor"
  }
  $env:PORTA_WEB = "$valor"
}

$porta = PortaConfigurada
$env:PORTA_WEB = "$porta"

Passo 'Construindo a imagem (a primeira vez leva alguns minutos)'
# Em rede que inspeciona TLS (corporativa), aponte a CA antes de rodar:
#   $env:CA_BUNDLE = 'C:\caminho\ca.crt'
if ($env:CA_BUNDLE) {
  Ok "usando CA extra: $env:CA_BUNDLE"
  docker build --secret "id=ca_bundle,src=$env:CA_BUNDLE" -t aprimore:latest .
} else {
  docker compose build
}
if ($LASTEXITCODE -ne 0) { throw 'A construcao da imagem falhou.' }
Ok 'Imagem pronta.'

Passo "Subindo banco e aplicacao (porta $porta)"
# Se outro programa ja ocupa a porta, procura a proxima livre em vez de
# encerrar: quem instala quer o sistema no ar, nao uma licao sobre portas.
# O compose escreve o progresso no stderr; capturar em arquivo evita que o
# PowerShell trate isso como erro terminante ($ErrorActionPreference = 'Stop').
$log = [System.IO.Path]::GetTempFileName()
docker compose up -d 2> $log
if ($LASTEXITCODE -ne 0) {
  $texto = (Get-Content $log -Raw -ErrorAction SilentlyContinue)
  if ($texto -match 'already allocated|address already in use|Bind for') {
    $nova = $null
    foreach ($p in ($porta + 1)..($porta + 20)) {
      if (-not (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)) { $nova = $p; break }
    }
    if (-not $nova) { Write-Host $texto -ForegroundColor Red; throw 'Nao foi possivel subir os servicos.' }
    Aviso "A porta $porta esta ocupada por outro programa; usando a $nova."
    FixarPorta $nova
    $porta = $nova
    docker compose up -d
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel subir os servicos.' }
  } else {
    Write-Host $texto -ForegroundColor Red
    throw 'Nao foi possivel subir os servicos.'
  }
}
Remove-Item $log -ErrorAction SilentlyContinue

Passo 'Esperando a aplicacao responder'
$pronto = $false
foreach ($i in 1..60) {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:$porta/" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) { $pronto = $true; break }
  } catch { Start-Sleep -Seconds 2 }
}
if (-not $pronto) {
  Write-Host '    A aplicacao nao respondeu a tempo. Veja os logs com: docker compose logs -f web' -ForegroundColor Red
  exit 1
}
Ok 'Aplicacao no ar.'

Passo 'Criando o administrador'
$existe = docker compose exec -T db psql -U aprimore -d aprimoreosaber -t -A -c "SELECT count(*) FROM usuario WHERE papel='admin'"
if ($existe.Trim() -eq '0') {
  $email = Read-Host 'E-mail do administrador'
  $nome  = Read-Host 'Nome do administrador'
  if ($email -and $nome) {
    docker compose exec -T web node scripts/criar-admin.mjs $email "$nome"
    Aviso 'Anote a senha acima: ela nao e mostrada de novo.'
  } else {
    Aviso 'Pulado. Crie depois com:'
    Write-Host '      docker compose exec web node scripts/criar-admin.mjs email@exemplo.com "Nome"' -ForegroundColor Gray
  }
} else {
  Ok 'Ja existe administrador. Para criar outro:'
  Write-Host '      docker compose exec web node scripts/criar-admin.mjs email@exemplo.com "Nome"' -ForegroundColor Gray
}

Write-Host @"

  ============================================================
   Aprimore o Saber esta rodando

   Site e sistema .... http://localhost:$porta
   Area do aluno ..... http://localhost:$porta/painel
   Administracao ..... http://localhost:$porta/admin

   Conta de exemplo (dados de demonstracao):
     ana@exemplo.com / constitucional88

   Parar ............. docker compose down
   Parar e apagar .... docker compose down -v
   Ver logs .......... docker compose logs -f web
  ============================================================

"@ -ForegroundColor Green

Start-Process "http://localhost:$porta"
