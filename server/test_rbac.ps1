$base='http://127.0.0.1:4000'
$admin = @{ email='admin@example.com'; password='adminpass' } | ConvertTo-Json
$cit = @{ email='citizen@example.com'; password='citizenpass' } | ConvertTo-Json
$loginAdmin = Invoke-RestMethod -Uri "$base/api/login" -Method Post -Body $admin -ContentType 'application/json'
$adminToken = $loginAdmin.token
Write-Output "Admin token length: $($adminToken.Length)"

# create a citizen user if not exists
try {
  $signup = Invoke-RestMethod -Uri "$base/api/signup" -Method Post -Body $cit -ContentType 'application/json'
  Write-Output 'Citizen created and logged in'
} catch { Write-Output 'Citizen signup may have failed (exists) or error' }

$loginCit = Invoke-RestMethod -Uri "$base/api/login" -Method Post -Body $cit -ContentType 'application/json'
$citToken = $loginCit.token
Write-Output "Citizen token length: $($citToken.Length)"

# attempt reset with citizen token (should 403)
try {
  Invoke-RestMethod -Uri "$base/api/reset" -Method Post -Headers @{ Authorization = "Bearer $citToken" }
  Write-Output 'Citizen reset succeeded (unexpected)'
} catch { Write-Output "Citizen reset failed as expected: $($_.Exception.Response.StatusCode.Value__)" }

# attempt reset with admin token (should succeed)
try {
  $res = Invoke-RestMethod -Uri "$base/api/reset" -Method Post -Headers @{ Authorization = "Bearer $adminToken" }
  Write-Output "Admin reset response: $($res | ConvertTo-Json)"
} catch { Write-Output "Admin reset failed: $($_.Exception.Message)" }
