$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$LogDir = Join-Path $ProjectRoot "logs"
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
$LogPath = Join-Path $LogDir "publish_latest.log"
$TranscriptStarted = $false

try {
  Start-Transcript -Path $LogPath -Append -ErrorAction Stop | Out-Null
  $TranscriptStarted = $true
} catch {
  Write-Warning "Could not start publish log transcript: $($_.Exception.Message)"
}

function Sync-RemoteMain {
  git fetch origin main
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to fetch origin/main."
  }

  $local = (git rev-parse HEAD).Trim()
  $remote = (git rev-parse origin/main).Trim()
  $base = (git merge-base HEAD origin/main).Trim()

  if ($local -eq $remote) {
    return
  }

  if ($local -eq $base) {
    git merge --ff-only origin/main
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to fast-forward to origin/main."
    }
    return
  }

  if ($remote -eq $base) {
    return
  }

  git merge --no-edit -X ours origin/main
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to merge origin/main."
  }
}

try {
  Sync-RemoteMain

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
  Sync-RemoteMain
  git push origin main
} finally {
  if ($TranscriptStarted) {
    Stop-Transcript | Out-Null
  }
}
