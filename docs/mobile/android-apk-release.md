# Android APK Release

## Pre-requisitos

- JDK 21 instalado em `D:\DevTools\NexusAndroid\jdk`.
- Android SDK instalado em `D:\DevTools\NexusAndroid\android-sdk`.
- Gradle cache em `D:\DevTools\NexusAndroid\gradle-home`.
- Android Studio instalado apenas se for abrir/editar o projeto pela IDE.

Confirme no terminal:

```bash
java -version
adb version
```

Se um terminal antigo nao reconhecer as variaveis, abra um terminal novo ou use os scripts do projeto. Eles carregam automaticamente o ambiente de `D:\DevTools\NexusAndroid`.

## Build de desenvolvimento

Sincronize o web app com o projeto Android:

```bash
npm run mobile:sync
```

Abra no Android Studio:

```bash
npm run android:open
```

Ou rode em aparelho/emulador:

```bash
npm run android:run
```

Gere APK debug:

```bash
npm run android:apk:debug
```

Saida esperada:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Emulador local

O AVD local padrao e `NexusFinance_API36`, criado em:

```text
D:\DevTools\NexusAndroid\android-avd\NexusFinance_API36.avd
```

Comandos uteis:

```bash
npm run android:accel-check
npm run android:emulator
npm run android:devices
npm run android:install:debug
npm run android:launch
```

Se `android:accel-check` indicar que o Android Emulator Hypervisor Driver nao esta instalado, instale o driver/ative virtualizacao antes de tentar usar o emulador. Sem aceleracao, o emulador pode ficar lento demais para validar o app.

## Build de release

Crie uma keystore fora do Git. Nunca coloque `.jks`, `.keystore` ou senhas no repositorio.

Use Android Studio para configurar assinatura de release ou adicione configuracao local fora do Git. Depois gere o bundle:

```bash
npm run android:aab:release
```

Saida esperada:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## Publicar APK no site

Quando houver APK assinado para download direto:

1. Coloque o arquivo em `public/downloads/nexus-finance.apk`.
2. Atualize `src/lib/mobileRelease.ts` com `apkUrl: "/downloads/nexus-finance.apk"`.
3. Preencha `version` e `updatedAt`.
4. Rode `npm run lint`, `npm run build` e `npm run mobile:sync`.
5. Suba para o Git para a Vercel publicar.

Nao publique APK debug para usuarios finais.
