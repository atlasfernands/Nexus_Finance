# Nexus Finance Mobile

Este diretorio documenta como o Nexus Finance vira app mobile mantendo React, Vite e Supabase como base unica.

## Estado atual

- Web/PWA: manifesto, icones, metadata mobile e service worker simples.
- Android: Capacitor configurado com `appId` `com.nexusfinance.app` e `webDir` `dist`.
- iOS: sem projeto nativo por enquanto. A rota gratis e PWA pelo Safari.
- Publicacao: Vercel continua sendo a fonte do app web e do PWA.

## Comandos principais

```bash
npm run lint
npm run build
npm run mobile:sync
npm run android:open
npm run android:run
npm run android:apk:debug
npm run android:accel-check
npm run android:emulator
npm run android:install:debug
npm run android:aab:release
```

## Observacoes importantes

- Nesta maquina, as dependencias Android devem ficar em `D:\DevTools\NexusAndroid` para preservar espaco no `C:\`.
- Os scripts mobile carregam automaticamente `JAVA_HOME`, `ANDROID_SDK_ROOT`, `ANDROID_HOME`, `ANDROID_USER_HOME`, `ANDROID_AVD_HOME` e `GRADLE_USER_HOME` desse diretorio.
- Para trocar a pasta raiz, defina `NEXUS_ANDROID_TOOLS_ROOT`.
- Para abrir pela IDE, instale Android Studio em `D:\` ou aponte a IDE para o SDK em `D:\DevTools\NexusAndroid\android-sdk`.
- Nunca commite keystore, senha de assinatura, `local.properties`, APK ou AAB.
- O pacote `xlsx` ainda aparece no `npm audit` com vulnerabilidade alta sem fix oficial. Ele nao foi introduzido pelo mobile, mas deve ser trocado em uma fase futura.
- Links e passos de loja estao nos arquivos especificos deste diretorio.
