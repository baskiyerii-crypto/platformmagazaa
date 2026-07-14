# Yerel PostgreSQL 18 kurulumu (Docker GEREKMEZ)
# Windows'ta PostgreSQL servisi calisiyor olmali.

$ErrorActionPreference = "Stop"
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

if (-not (Test-Path $psql)) {
  Write-Host "PostgreSQL 18 bulunamadi: $psql" -ForegroundColor Red
  Write-Host "PostgreSQL 18 kur veya psql yolunu duzenle."
  exit 1
}

Write-Host "magaza kullanicisi ve veritabani olusturuluyor..." -ForegroundColor Cyan

& $psql -U postgres -h localhost -d postgres -c @"
DO `$`$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'magaza') THEN
    CREATE ROLE magaza LOGIN PASSWORD 'magaza123';
  END IF;
END `$`$;
"@

$dbExists = & $psql -U postgres -h localhost -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'magaza'"
if (-not ($dbExists -match "1")) {
  & $psql -U postgres -h localhost -d postgres -c "CREATE DATABASE magaza OWNER magaza;"
}

& $psql -U postgres -h localhost -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE magaza TO magaza;"
& $psql -U postgres -h localhost -d magaza -c "GRANT ALL ON SCHEMA public TO magaza;"
& $psql -U postgres -h localhost -d magaza -c "ALTER SCHEMA public OWNER TO magaza;"

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "Prisma schema uygulaniyor..." -ForegroundColor Cyan
pnpm db:push
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Seed calistiriliyor..." -ForegroundColor Cyan
pnpm db:seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Hazir! Giriş hesaplari:" -ForegroundColor Green
Write-Host "  Ana Yonetici: yusuf / yusuf634152K"
Write-Host "  Mudur:        mudur / mudur634152K"
Write-Host "  Demo:     admin / admin123"
Write-Host "  Magaza:   kadikoy / magaza123"
Write-Host ""
Write-Host "Web: pnpm --filter @magaza/web dev"
Write-Host "Mobil (.env): EXPO_PUBLIC_API_URL=http://BILGISAYAR_IP:3000"
