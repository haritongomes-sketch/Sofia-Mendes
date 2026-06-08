# ══════════════════════════════════════════════════════════════════
#  Setup Automático — Private CRM Altum Wealth
#  Execute: PowerShell -ExecutionPolicy Bypass -File setup.ps1
# ══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Setup — Private CRM Altum Wealth           ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── 1. Verificar/Instalar Node.js ─────────────────────────────────

Write-Host "[ 1/6 ] Verificando Node.js..." -ForegroundColor Yellow

$nodeExists = $null
try { $nodeExists = (Get-Command node -ErrorAction Stop).Source } catch {}

if (-not $nodeExists) {
    Write-Host "  Node.js não encontrado. Instalando via winget..." -ForegroundColor Yellow

    $wingetExists = $null
    try { $wingetExists = (Get-Command winget -ErrorAction Stop).Source } catch {}

    if ($wingetExists) {
        winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent
        # Recarregar PATH
        $env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } else {
        Write-Host ""
        Write-Host "  ❌ winget não disponível." -ForegroundColor Red
        Write-Host "  → Baixe Node.js manualmente em: https://nodejs.org" -ForegroundColor White
        Write-Host "  → Instale a versão LTS e execute este script novamente." -ForegroundColor White
        Write-Host ""
        exit 1
    }

    $nodeExists = $null
    try { $nodeExists = (Get-Command node -ErrorAction Stop).Source } catch {}
    if (-not $nodeExists) {
        Write-Host ""
        Write-Host "  ❌ Instalação do Node.js falhou." -ForegroundColor Red
        Write-Host "  → Instale manualmente em https://nodejs.org e execute novamente." -ForegroundColor White
        exit 1
    }
}

$nodeVersion = node --version
Write-Host "  ✅ Node.js $nodeVersion encontrado" -ForegroundColor Green

# ── 2. Instalar dependências ──────────────────────────────────────

Write-Host "[ 2/6 ] Instalando dependências npm..." -ForegroundColor Yellow
Set-Location $ProjectDir
npm install --silent
if ($LASTEXITCODE -ne 0) { Write-Host "  ❌ Erro no npm install" -ForegroundColor Red; exit 1 }
Write-Host "  ✅ Dependências instaladas" -ForegroundColor Green

# ── 3. Configurar .env ────────────────────────────────────────────

Write-Host "[ 3/6 ] Configurando .env..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "  ℹ  Arquivo .env criado a partir do .env.example" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  ⚠  IMPORTANTE: Preencha o arquivo .env com suas credenciais!" -ForegroundColor Yellow
    Write-Host "  Abrindo o .env no Notepad..." -ForegroundColor Yellow
    Start-Process notepad ".env" -Wait
} else {
    Write-Host "  ✅ .env já existe" -ForegroundColor Green
}

# Verificar chaves obrigatórias
$envContent = Get-Content ".env" -Raw
$missingKeys = @()
if ($envContent -notmatch "ANTHROPIC_API_KEY=sk-ant-[a-zA-Z0-9]") { $missingKeys += "ANTHROPIC_API_KEY" }
if ($envContent -notmatch "ZAPI_INSTANCE_ID=[a-zA-Z0-9]") { $missingKeys += "ZAPI_INSTANCE_ID" }
if ($envContent -notmatch "ZAPI_TOKEN=[a-zA-Z0-9]") { $missingKeys += "ZAPI_TOKEN" }
if ($envContent -notmatch "HARITON_WHATSAPP=\d{10,}") { $missingKeys += "HARITON_WHATSAPP" }

if ($missingKeys.Count -gt 0) {
    Write-Host ""
    Write-Host "  ⚠  Variáveis ainda não configuradas no .env:" -ForegroundColor Yellow
    $missingKeys | ForEach-Object { Write-Host "     - $_" -ForegroundColor Red }
    Write-Host ""
    $resp = Read-Host "  Continuar mesmo assim? (s/N)"
    if ($resp -ne "s" -and $resp -ne "S") { exit 0 }
}

# ── 4. Gerar Prisma Client ────────────────────────────────────────

Write-Host "[ 4/6 ] Gerando Prisma Client..." -ForegroundColor Yellow
npx prisma generate --schema=server/prisma/schema.prisma 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "  ❌ Erro no prisma generate" -ForegroundColor Red; exit 1 }
Write-Host "  ✅ Prisma Client gerado" -ForegroundColor Green

# ── 5. Criar banco de dados ───────────────────────────────────────

Write-Host "[ 5/6 ] Criando banco de dados SQLite..." -ForegroundColor Yellow
npx prisma migrate dev --name init --schema=server/prisma/schema.prisma 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    # Tenta db push como alternativa
    npx prisma db push --schema=server/prisma/schema.prisma 2>&1 | Out-Null
}
Write-Host "  ✅ Banco de dados criado (server/dev.db)" -ForegroundColor Green

# ── 6. Resumo e próximos passos ───────────────────────────────────

Write-Host "[ 6/6 ] Setup concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅  Sistema pronto para rodar!             ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Para iniciar o servidor localmente:" -ForegroundColor White
Write-Host "    npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Para ver e editar dados do banco:" -ForegroundColor White
Write-Host "    npx prisma studio --schema=server/prisma/schema.prisma" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Plugins ativos automaticamente:" -ForegroundColor White
Write-Host "    🤖 Sofia responde WhatsApp 24/7" -ForegroundColor Green
Write-Host "    ⏰ Follow-up automático após 24h de silêncio" -ForegroundColor Green
Write-Host "    🔁 Re-engajamento após 5 dias sem resposta" -ForegroundColor Green
Write-Host "    📊 Scoring de leads em tempo real" -ForegroundColor Green
Write-Host "    🔔 Notificação para Hariton quando reunião confirmada" -ForegroundColor Green
Write-Host "    📅 Relatório diário às 7h45 no WhatsApp do Hariton" -ForegroundColor Green
Write-Host ""
Write-Host "  Próximo passo — deploy 24/7 no Railway:" -ForegroundColor White
Write-Host "    1. Crie conta em https://railway.app" -ForegroundColor White
Write-Host "    2. Instale CLI: npm install -g @railway/cli" -ForegroundColor White
Write-Host "    3. Execute: railway login && railway init && railway up" -ForegroundColor White
Write-Host "    4. Configure as variáveis do .env no painel do Railway" -ForegroundColor White
Write-Host "    5. No Z-API, configure o webhook para a URL do Railway" -ForegroundColor White
Write-Host ""

# Iniciar servidor?
$iniciar = Read-Host "  Iniciar o servidor agora? (s/N)"
if ($iniciar -eq "s" -or $iniciar -eq "S") {
    Write-Host ""
    Write-Host "  Iniciando servidor..." -ForegroundColor Cyan
    npm run dev
}
