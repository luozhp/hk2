$r = Invoke-RestMethod "http://localhost:5173/src/App.vue" -Headers @{ Accept = "*/*" }
$lines = $r -split "`n"
$i = 0
foreach ($l in $lines) {
  $i++
  if ($l -match 'lang=|interface|: Ref|: string|defineProps|: any') {
    Write-Host "$i`: $($l.Trim())"
  }
}
