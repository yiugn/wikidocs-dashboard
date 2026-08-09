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

function Assert-ProjectChildPath {
  param([string]$Path)

  $root = (Resolve-Path $ProjectRoot).Path
  $target = (Resolve-Path $Path).Path
  $prefix = $root.TrimEnd("\") + "\"
  if (-not $target.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify a directory outside project root: $target"
  }
}

function Clear-DirectoryExceptGit {
  param([string]$Path)

  Assert-ProjectChildPath $Path
  Get-ChildItem -LiteralPath $Path -Force |
    Where-Object { $_.Name -ne ".git" } |
    Remove-Item -Recurse -Force
}

function Publish-PagesBranch {
  param([string]$Stamp)

  $publicDir = Join-Path $ProjectRoot "public"
  $pagesWorktree = Join-Path $ProjectRoot ".pages-worktree"
  if (-not (Test-Path (Join-Path $publicDir "index.html"))) {
    throw "Static dashboard output is missing. Expected public/index.html."
  }

  if (Test-Path $pagesWorktree) {
    Assert-ProjectChildPath $pagesWorktree
    Remove-Item -LiteralPath $pagesWorktree -Recurse -Force
  }

  $originUrl = (git config --get remote.origin.url).Trim()
  $remoteBranch = (git ls-remote --heads origin gh-pages)
  if ($remoteBranch) {
    git clone --branch gh-pages --single-branch $originUrl $pagesWorktree
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to clone origin/gh-pages."
    }
  } else {
    New-Item -ItemType Directory -Path $pagesWorktree -Force | Out-Null
    git -C $pagesWorktree init
    git -C $pagesWorktree checkout -b gh-pages
    git -C $pagesWorktree remote add origin $originUrl
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Failed to prepare gh-pages branch checkout."
  }

  $gitUserName = (git config user.name).Trim()
  $gitUserEmail = (git config user.email).Trim()
  if (-not $gitUserName) {
    $gitUserName = "wikidocs-dashboard"
  }
  if (-not $gitUserEmail) {
    $gitUserEmail = "wikidocs-dashboard@users.noreply.github.com"
  }
  git -C $pagesWorktree config user.name $gitUserName
  git -C $pagesWorktree config user.email $gitUserEmail

  try {
    Clear-DirectoryExceptGit $pagesWorktree
    Copy-Item -Path (Join-Path $publicDir "*") -Destination $pagesWorktree -Recurse -Force

    git -C $pagesWorktree add -A
    git -C $pagesWorktree diff --cached --quiet
    $hasNoChanges = $LASTEXITCODE -eq 0
    if ($hasNoChanges) {
      Write-Host "No GitHub Pages changes to publish."
      return
    }

    git -C $pagesWorktree commit -m "Deploy Wikidocs dashboard $Stamp"
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to commit GitHub Pages output."
    }

    git -C $pagesWorktree push origin gh-pages
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to push GitHub Pages output."
    }
  } finally {
    if (Test-Path $pagesWorktree) {
      Assert-ProjectChildPath $pagesWorktree
      Remove-Item -LiteralPath $pagesWorktree -Recurse -Force
    }
  }
}

try {
  Sync-RemoteMain

  $Python = (Get-Command python).Source
  & $Python export_static.py --collect
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Live Wikidocs collection failed. Publishing the latest saved dashboard data instead."
    & $Python export_static.py
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to export dashboard from saved data."
    }
  }

  git add data/catalog.json data/snapshots.jsonl data/intraday_snapshots.jsonl data/daily_blog_views.csv data/daily_cumulative_views.csv
  $diff = git diff --cached --name-only
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
  if (-not $diff) {
    Write-Host "No dashboard data changes to publish."
  } else {
    git commit -m "Update Wikidocs dashboard data $stamp"
    Sync-RemoteMain
    git push origin main
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to push dashboard data to main."
    }
  }

  Publish-PagesBranch $stamp
} finally {
  if ($TranscriptStarted) {
    Stop-Transcript | Out-Null
  }
}
