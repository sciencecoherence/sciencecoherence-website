$ErrorActionPreference = 'Stop'
$roomDirectory = $PSScriptRoot
$roomAddress = 'http://127.0.0.1:8765'
# Must match ROOM_VERSION in server.py. A service already running in the
# background is reused only when it is the current version; an older one is
# stopped so the updated room can start in its place.
$roomVersion = 3
try {
    $roomStatus = Invoke-RestMethod "$roomAddress/api/state" -TimeoutSec 2
    if ($roomStatus.articles -and $roomStatus.previewUrl -eq 'http://127.0.0.1:8766') {
        if ($roomStatus.roomVersion -eq $roomVersion) {
            Start-Process $roomAddress
            exit 0
        }
        $roomListener = Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($roomListener) {
            $roomOwner = Get-CimInstance Win32_Process -Filter "ProcessId = $($roomListener.OwningProcess)" -ErrorAction SilentlyContinue
            # Only ever stop the Writing Room's own Python service.
            if ($roomOwner -and $roomOwner.CommandLine -like '*server.py*') {
                Stop-Process -Id $roomListener.OwningProcess -Force
                for ($roomWait = 0; $roomWait -lt 25; $roomWait++) {
                    Start-Sleep -Milliseconds 200
                    if (-not (Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)) { break }
                }
            }
        }
    }
} catch { }
$roomPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
if (-not (Test-Path -LiteralPath $roomPython)) {
    $roomPythonCommand = Get-Command python.exe -ErrorAction SilentlyContinue
    if (-not $roomPythonCommand -or $roomPythonCommand.Source -like '*WindowsApps*') {
        throw 'Python 3.11 or newer is needed to open this local Writing Room.'
    }
    $roomPython = $roomPythonCommand.Source
}
$roomProcess = Start-Process -FilePath $roomPython -ArgumentList @('"' + (Join-Path $roomDirectory 'server.py') + '"') -WorkingDirectory $roomDirectory -WindowStyle Hidden -PassThru
for ($roomAttempt = 0; $roomAttempt -lt 30; $roomAttempt++) {
    Start-Sleep -Milliseconds 200
    if ($roomProcess.HasExited) { throw 'The Writing Room could not start. Check that ports 8765 and 8766 are available.' }
    try {
        $roomStatus = Invoke-RestMethod "$roomAddress/api/state" -TimeoutSec 1
        if ($roomStatus.token) { Start-Process $roomAddress; exit 0 }
    } catch { }
}
throw 'The Writing Room did not respond. Your content has not been changed.'
