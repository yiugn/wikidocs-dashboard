$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$Python = (Get-Command python).Source
& $Python export_static.py --collect

git add data/catalog.json data/snapshots.jsonl data/intraday_snapshots.jsonl data/daily_blog_views.csv data/daily_cumulative_views.csv
$diff = git diff --cached --name-only
if (-not $diff) {
  Write-Host "No dashboard data changes to publish."
  exit 0
}

$stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -m "Update Wikidocs dashboard data $stamp"
git push
