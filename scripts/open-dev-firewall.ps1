# Yonetici olarak calistirin: sag tik -> "Run with PowerShell as Administrator"
$ruleName = "Magaza Web Dev 3000"
$existing = netsh advfirewall firewall show rule name="$ruleName" 2>$null
if ($LASTEXITCODE -ne 0) {
  netsh advfirewall firewall add rule name="$ruleName" dir=in action=allow protocol=TCP localport=3000
  Write-Host "Port 3000 acildi."
} else {
  Write-Host "Kural zaten var: $ruleName"
}
