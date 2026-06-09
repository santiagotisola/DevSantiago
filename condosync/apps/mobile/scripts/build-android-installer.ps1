Param(
  [switch]$Release
)

$ErrorActionPreference = 'Stop'

function Assert-LastExitCode {
  Param(
    [string]$Step
  )

  if ($LASTEXITCODE -ne 0) {
    throw "$Step falhou com codigo de saida $LASTEXITCODE."
  }
}

Write-Host 'CondoSync Mobile - Build Android APK' -ForegroundColor Cyan

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw 'npm nao encontrado no PATH.'
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw 'npx nao encontrado no PATH.'
}

if (-not $env:JAVA_HOME) {
  throw 'JAVA_HOME nao configurado. Instale JDK 17+ e configure a variavel JAVA_HOME antes de gerar o APK.'
}

if (-not (Test-Path -Path 'node_modules')) {
  Write-Host 'Instalando dependencias npm...' -ForegroundColor Yellow
  npm install
}

Write-Host 'Gerando build web...' -ForegroundColor Yellow
npm run build
Assert-LastExitCode -Step 'Build web'

Write-Host 'Sincronizando projeto Android (Capacitor)...' -ForegroundColor Yellow
npx cap sync android
Assert-LastExitCode -Step 'Capacitor sync'

Push-Location android
try {
  if ($Release) {
    Write-Host 'Gerando APK release...' -ForegroundColor Yellow
    .\gradlew.bat assembleRelease
    Assert-LastExitCode -Step 'Gradle assembleRelease'
    $apkPath = Join-Path $PWD 'app\build\outputs\apk\release\app-release.apk'
  }
  else {
    Write-Host 'Gerando APK debug...' -ForegroundColor Yellow
    .\gradlew.bat assembleDebug
    Assert-LastExitCode -Step 'Gradle assembleDebug'
    $apkPath = Join-Path $PWD 'app\build\outputs\apk\debug\app-debug.apk'
  }

  if (-not (Test-Path $apkPath)) {
    throw "APK nao encontrado em: $apkPath"
  }

  Write-Host ''
  Write-Host 'APK gerado com sucesso:' -ForegroundColor Green
  Write-Host $apkPath -ForegroundColor Green
}
finally {
  Pop-Location
}
