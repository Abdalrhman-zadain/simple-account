param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("dev", "build", "start")]
  [string]$Mode
)

$ErrorActionPreference = "Stop"

$frontendRoot = Split-Path -Parent $PSScriptRoot
$devNextDir = Join-Path $frontendRoot ".next-dev"
$buildNextDir = Join-Path $frontendRoot ".next"

$nextCli = Join-Path $frontendRoot "node_modules\next\dist\bin\next"

function Reset-NextArtifacts([string]$targetDir) {
  if (-not (Test-Path -LiteralPath $targetDir)) {
    return
  }

  $item = Get-Item -LiteralPath $targetDir -Force
  if ($item.Attributes.ToString().Contains("ReparsePoint")) {
    Remove-Item -LiteralPath $targetDir -Recurse -Force
    return
  }

  Remove-Item -LiteralPath $targetDir -Recurse -Force
}

switch ($Mode) {
  "dev" {
    Reset-NextArtifacts $devNextDir
    $env:NEXT_DIST_DIR = ".next-dev"
    & node $nextCli dev
  }
  "build" {
    Reset-NextArtifacts $buildNextDir
    $env:NEXT_DIST_DIR = ".next"
    & node $nextCli build
  }
  "start" {
    $env:NEXT_DIST_DIR = ".next"
    & node $nextCli start
  }
}
