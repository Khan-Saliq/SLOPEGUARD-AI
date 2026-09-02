$conn = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
if ($conn) {
  $pid = $conn.OwningProcess
  Write-Output "Killing PID $pid on port 4000"
  Stop-Process -Id $pid -Force
} else {
  Write-Output 'No process on port 4000'
}
