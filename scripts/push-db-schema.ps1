# Production/local DB şemasını Prisma ile günceller (AdExpense tabloları + Announcement.kind)
# Kullanım:
#   $env:DATABASE_URL = "postgresql://..."
#   .\scripts\push-db-schema.ps1
# veya packages/database/.env içindeki DATABASE_URL kullanılır.

$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\..\packages\database"
Write-Host "prisma db push ..."
npx prisma db push
npx prisma generate
Write-Host "OK — AdExpenseCategory / AdExpense / AnnouncementKind senkron."
