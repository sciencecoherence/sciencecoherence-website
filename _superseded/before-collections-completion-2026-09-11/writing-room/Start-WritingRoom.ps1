$ErrorActionPreference = 'Stop'
$roomDirectory = $PSScriptRoot
$roomAddress = 'http://127.0.0.1:8765'
try {
    $roomStatus = Invoke-RestMethod "$roomAddress/api/state" -TimeoutSec 2
    if ($roomStatus.articles -and $roomStatus.previewUrl -eq 'http://127.0.0.1:8766') {
        Start-Process $roomAddress
        exit 0
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
