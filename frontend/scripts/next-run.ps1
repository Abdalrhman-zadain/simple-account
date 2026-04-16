param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("dev", "build", "start")]
  [string]$Mode
)

$ErrorActionPreference = "Stop"

$frontendRoot = Split-Path -Parent $PSScriptRoot
$repoNextDir = Join-Path $frontendRoot ".next"

$nextCli = Join-Path $frontendRoot "node_modules\next\dist\bin\next"

function Reset-NextArtifacts {
  if (-not (Test-Path -LiteralPath $repoNextDir)) {
    return
  }

  $item = Get-Item -LiteralPath $repoNextDir -Force
  if ($item.Attributes.ToString().Contains("ReparsePoint")) {
    Remove-Item -LiteralPath $repoNextDir -Recurse -Force
    return
  }

  Remove-Item -LiteralPath $repoNextDir -Recurse -Force
}

switch ($Mode) {
  "dev" {
    Reset-NextArtifacts
    & node $nextCli dev
  }
  "build" {
    Reset-NextArtifacts
    & node $nextCli build
  }
  "start" { & node $nextCli start }
}
