$conns = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
foreach ($c in $conns) {
  $pid = $c.OwningProcess
  Write-Output "Stopping PID $pid"
  try { Stop-Process -Id $pid -Force -ErrorAction Stop; Write-Output "Stopped $pid" } catch { Write-Output ('Failed to stop ' + $pid) }
}
$remaining = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
if (-not $remaining) { Write-Output 'Port 4000 free' } else { $remaining | Select-Object LocalAddress,LocalPort,State,OwningProcess | ConvertTo-Json }
