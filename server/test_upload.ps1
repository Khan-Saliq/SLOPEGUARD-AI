$base='http://127.0.0.1:4000'
$body = @{ email = 'admin@example.com'; password = 'adminpass' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$base/api/login" -Method Post -Body $body -ContentType 'application/json'
$token = $login.token
Write-Output "Token len: $($token.Length)"
# create a small test file
$fn = "test-upload.txt"
Set-Content -Path $fn -Value "hello upload"
# upload using multipart/form-data
Write-Output 'Uploading via curl.exe...'
& 'curl.exe' -s -H "Authorization: Bearer $token" -F "file=@$fn" "$base/api/upload" | Write-Output
