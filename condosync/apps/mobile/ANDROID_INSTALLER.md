# CondoSync Mobile - Instalador Android (APK)

Este guia gera o instalador do app mobile em formato APK usando Capacitor.

## Pre-requisitos

- Node.js 20+
- Java JDK 17+
- Android Studio com Android SDK instalado
- Variaveis de ambiente configuradas:
  - ANDROID_HOME
  - JAVA_HOME

## 1) Instalar dependencias

No diretorio apps/mobile:

```powershell
npm install
```

## 2) Inicializar Android (primeira vez)

```powershell
npm run android:init
```

## 3) Gerar APK (debug)

```powershell
npm run android:apk
```

Saida esperada:
- android/app/build/outputs/apk/debug/app-debug.apk

## 4) Gerar APK (release)

```powershell
npm run android:apk:release
```

Saida esperada:
- android/app/build/outputs/apk/release/app-release.apk

## 5) Instalar no celular Android

Opcao A (ADB):

```powershell
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Opcao B (manual):
1. Copie o APK para o celular.
2. Ative "Instalar apps desconhecidos" para o gerenciador de arquivos.
3. Toque no APK para instalar.

## Observacoes

- Se alterar codigo web, rode novamente o build para sincronizar no Android:

```powershell
npm run build
npm run android:sync
```

- Para abrir o projeto no Android Studio:

```powershell
npm run android:open
```
