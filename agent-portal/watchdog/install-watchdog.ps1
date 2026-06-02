param(
  [string]$ExePath = "$env:ProgramFiles\KitchenHub\KitchenHubAgent\KitchenHubAgent.exe",
  [string]$NodePath = "$(Get-Command node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)"
)

if (-not $NodePath) {
  Write-Error "Node.js not found in PATH. Install Node or adjust this script to use the packaged watcher executable."
  exit 1
}

$watcher = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'watchdog.js'

if (-not (Test-Path $watcher)) {
  Write-Error "watchdog.js not found at $watcher"
  exit 1
}

$action = New-ScheduledTaskAction -Execute $NodePath -Argument "`"$watcher`" --exe `"$ExePath`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest

Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "KitchenHubAgentWatchdog" -Description "Watchdog to keep KitchenHub Agent running" -Principal $principal -Force

Write-Host "Installed scheduled task 'KitchenHubAgentWatchdog' to run the watchdog at startup.";
