# Builds the signed release APK. Asks for the keystore passwords and keeps them out of every file.
# Usage, from the android folder:  .\sign-release.ps1
# Needs a JDK Gradle 8.9 can run on (17 to 23). Android Studio's bundled Java 25 is too new.
param([string]$Jdk = 'C:\Program Files\Java\jdk-23')
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$cert = 'd4f1fa1a23c6c53b6694f8190a6be92af00d55897535133a54ed8926a99054'   # the key every earlier release used
$plain = { param($s) [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)) }

$store = & $plain (Read-Host 'Keystore password' -AsSecureString)
$key = & $plain (Read-Host 'Key password (press Enter if it is the same)' -AsSecureString)
if (-not $key) { $key = $store }

$env:JAVA_HOME = $Jdk
$env:KOBEL_STORE_PASSWORD = $store
$env:KOBEL_KEY_PASSWORD = $key
try {
    .\gradlew.bat --no-daemon assembleRelease
    if ($LASTEXITCODE -ne 0) { throw 'The build failed. If it says the password is incorrect, run this script again.' }
} finally {
    Remove-Item Env:KOBEL_STORE_PASSWORD, Env:KOBEL_KEY_PASSWORD -ErrorAction SilentlyContinue
}

$apk = 'app\build\outputs\apk\release\app-release.apk'
$tools = Get-ChildItem "$env:LOCALAPPDATA\Android\Sdk\build-tools" | Sort-Object Name | Select-Object -Last 1
$out = & "$($tools.FullName)\apksigner.bat" verify --print-certs $apk | Out-String
if ($out -notmatch $cert) { throw 'This APK is not signed with the Kobel release key. Do not publish it.' }
Write-Host "Signed with the Kobel release key: $((Resolve-Path $apk).Path)"
