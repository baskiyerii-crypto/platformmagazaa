# USB ile bagli Android icin: API'yi localhost uzerinden yonlendirir
adb reverse tcp:3000 tcp:3000
Write-Host "adb reverse aktif. Mobil .env:"
Write-Host "EXPO_PUBLIC_API_URL=http://localhost:3000"
Write-Host ""
Write-Host "apps/mobile/.env dosyasini buna gore guncelleyip mobil uygulamayi yeniden baslatin."
