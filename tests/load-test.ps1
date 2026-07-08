$Target = if ($env:TARGET) { $env:TARGET } else {"https://edge-secure-api.vercel.app/api/logs" }
$Count = 60

$startedAt = Get-Date

$results = 1..$Count | ForEach-Object -Parallel {
  try {
    $r = Invoke-WebRequest -Uri $using:Target -UseBasicParsing -TimeoutSec 30
    $r.StatusCode
  } catch {
    $_.Exception.Response.StatusCode.value__
  }
} -ThrottleLimit $Count

$elapsed = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 1)
$count200 = ($results | Where-Object { $_ -eq 200 }).Count
$count429 = ($results | Where-Object { $_ -eq 429 }).Count

Write-Host "200 : $count200"
Write-Host "429 : $count429"
Write-Host "Elapsed: $elapsed seconds"
