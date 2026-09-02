$base='http://127.0.0.1:4000'
$body = @{ email = 'admin@example.com'; password = 'adminpass' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$base/api/login" -Method Post -Body $body -ContentType 'application/json'
$token = $login.token
Write-Output "Token length: $($token.Length)"
$reports = Invoke-RestMethod -Uri "$base/api/reports" -Headers @{ Authorization = "Bearer $token" } -ErrorAction Stop
Write-Output "Reports count: $($reports.Count)"
if ($reports.Count -gt 0) { $reports[0] | ConvertTo-Json -Depth 5 | Write-Output }
