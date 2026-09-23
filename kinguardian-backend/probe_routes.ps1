$ErrorActionPreference = "Continue"
$login = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" -Method Post -Body '{"email":"anjali@example.com","password":"Password123!"}' -ContentType "application/json"
$tok = $login.access_token
$h = @{ Authorization = "Bearer $tok" }
$fid = "ec6f70f6-3cba-4945-9922-227634a9edcf"
$cid = "c30641ff-930e-40e8-b864-d1db83999dbf"
$paths = @(
  "/api/v1/consents",
  "/api/v1/families/$fid/conversations",
  "/api/v1/families/$fid/conversations/$cid/messages"
)
foreach ($p in $paths) {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:8000$p" -Headers $h -UseBasicParsing
    Write-Output "GET $p -> $($r.StatusCode)"
  } catch {
    Write-Output "GET $p -> $($_.Exception.Response.StatusCode.value__)"
  }
}
