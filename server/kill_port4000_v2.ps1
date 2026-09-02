$conns = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -ne 0 }
if (-not $conns) { Write-Output 'No owning processes found on port 4000'; exit }
foreach ($c in $conns) {
  $pid = $c.OwningProcess
  try {
    Stop-Process -Id $pid -Force -ErrorAction Stop
    Write-Output "Stopped PID $pid"
  } catch {
    Write-Output "Failed to stop PID $pid : $_"
  }
}
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,State,OwningProcess | ConvertTo-Json
