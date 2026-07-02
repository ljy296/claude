param(
  [int]$ApiPort = 3001,
  [int]$WebPort = 5173
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$platformRoot = Split-Path -Parent $PSScriptRoot
$workspaceRoot = Split-Path -Parent $platformRoot
$apiLog = Join-Path $platformRoot "api.dev.log"
$webLog = Join-Path $platformRoot "web.dev.log"

function Copy-CleanEnvironment {
  param([System.Diagnostics.ProcessStartInfo]$ProcessStartInfo)

  $target = $ProcessStartInfo.Environment
  if ($null -eq $target) {
    $target = $ProcessStartInfo.EnvironmentVariables
  }

  $target.Clear()
  $seen = @{}
  $variables = [System.Environment]::GetEnvironmentVariables()

  foreach ($key in $variables.Keys) {
    $name = [string]$key
    $normalized = $name.ToUpperInvariant()
    if ($seen.ContainsKey($normalized)) {
      continue
    }

    $seen[$normalized] = $true
    $targetName = if ($normalized -eq "PATH") { "Path" } else { $name }
    $target[$targetName] = [string]$variables[$key]
  }
}

function Start-DevProcess {
  param(
    [string]$Name,
    [string]$Arguments,
    [string]$LogPath
  )

  $psi = [System.Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = "C:\Windows\System32\cmd.exe"
  $psi.Arguments = "/d /c chcp 65001 > nul && npm.cmd $Arguments > `"$LogPath`" 2>&1"
  $psi.WorkingDirectory = $workspaceRoot
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  Copy-CleanEnvironment -ProcessStartInfo $psi

  $process = [System.Diagnostics.Process]::Start($psi)
  Write-Host "$Name started. PID=$($process.Id), log=$LogPath"
}

function Wait-HttpOk {
  param(
    [string]$Name,
    [string]$Url
  )

  for ($attempt = 1; $attempt -le 30; $attempt++) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        Write-Host "$Name ready: $Url"
        return
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  Write-Warning "$Name did not become ready in time: $Url"
}

Start-DevProcess -Name "API" -Arguments "run platform:dev:api" -LogPath $apiLog
Start-DevProcess -Name "Web" -Arguments "run platform:dev:web" -LogPath $webLog

Wait-HttpOk -Name "API health" -Url "http://127.0.0.1:$ApiPort/api/health"
Wait-HttpOk -Name "Web" -Url "http://127.0.0.1:$WebPort"

Write-Host ""
Write-Host "Open the platform: http://127.0.0.1:$WebPort"
Write-Host "API health:        http://127.0.0.1:$ApiPort/api/health"
