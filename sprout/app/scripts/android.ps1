# Sprout Android helper. Everything lives on D:\dev, so nothing is installed system-wide.
#   powershell -File scripts\android.ps1 build      # web build + copy into Android + debug APK
#   powershell -File scripts\android.ps1 emulator   # start the test phone (Pixel, 2 GB RAM)
#   powershell -File scripts\android.ps1 install    # install and open Sprout on the running emulator or phone
#   powershell -File scripts\android.ps1 stop       # shut the emulator down and free its RAM
param([ValidateSet('build', 'emulator', 'install', 'stop')][string]$Task = 'build')
$ErrorActionPreference = 'Stop'

$dev = 'D:\dev'
$env:JAVA_HOME = (Get-ChildItem "$dev\jdk" -Directory | Select-Object -First 1).FullName
$env:ANDROID_HOME = "$dev\android-sdk"
$env:ANDROID_SDK_ROOT = "$dev\android-sdk"
$env:ANDROID_AVD_HOME = "$dev\android-avd"        # emulator disk images on D:, not C:
$env:GRADLE_USER_HOME = "$dev\gradle"              # Gradle cache on D:, not C:
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"
$app = Split-Path $PSScriptRoot -Parent

switch ($Task) {
  'build' {
    Push-Location $app
    pnpm build
    & "$dev\node22\node.exe" node_modules\@capacitor\cli\bin\capacitor copy android   # Capacitor CLI needs Node 22 (portable copy)
    Push-Location android
    .\gradlew.bat assembleDebug --no-daemon --console=plain
    $code = $LASTEXITCODE
    Pop-Location; Pop-Location
    if ($code -ne 0) { Write-Host 'Android build FAILED (see the Gradle output above).'; exit $code }
    Write-Host "APK: $app\android\app\build\outputs\apk\debug\app-debug.apk"
  }
  'emulator' {
    Start-Process "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList '-avd', 'sprout_pixel', '-memory', '2048', '-no-snapshot-save', '-no-boot-anim'
    Write-Host 'Emulator starting (about 1 minute). Run "install" when the home screen shows.'
  }
  'install' {
    & $adb install -r "$app\android\app\build\outputs\apk\debug\app-debug.apk"
    & $adb shell am start -n dev.sprout.kids/.MainActivity
  }
  'stop' {
    & $adb emu kill
    Write-Host 'Emulator stopped.'
  }
}
