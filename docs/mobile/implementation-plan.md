# Plano de Implementacao Mobile

## Objetivo

Transformar o Nexus Finance em PWA instalavel e app Android nativo sem reescrever a aplicacao. O React/Vite segue como fonte unica, o Supabase segue como backend e a Vercel segue como deploy web.

## Checklist

- [x] Adicionar `@capacitor/core`, `@capacitor/cli` e `@capacitor/android`.
- [x] Criar `capacitor.config.ts` com `Nexus Finance`, `com.nexusfinance.app` e `webDir: "dist"`.
- [x] Gerar o projeto `android/` via Capacitor.
- [x] Criar scripts mobile e Android no `package.json`.
- [x] Registrar service worker simples para PWA em producao.
- [x] Melhorar manifesto e metas mobile no `index.html`.
- [x] Criar area de status/download mobile no app.
- [x] Criar documentacao para Android, Play Store, iOS, PWA e versionamento.
- [ ] Instalar Android Studio/JDK na maquina local.
- [ ] Gerar APK debug e testar em aparelho ou emulador.
- [ ] Criar keystore de release fora do Git.
- [ ] Gerar APK/AAB assinado.
- [ ] Publicar o APK no site quando existir release assinado.
- [ ] Publicar AAB na Play Store quando a conta Play Console estiver pronta.

## Decisoes

- Android nativo usa Capacitor porque aproveita o build Vite em `dist`.
- iOS nativo fica fora desta fase porque App Store e TestFlight exigem Apple Developer Program.
- iOS gratis usa PWA pelo Safari com "Adicionar a Tela de Inicio".
- O app nao deve exibir link de APK ativo enquanto nao houver arquivo assinado.
- Vercel continua recebendo deploy por Git; CI customizado so e necessario se o time quiser builds prebuilt no futuro.

## Aceite

- `npm run lint` passa.
- `npm run build` passa.
- `npm run mobile:sync` copia o build web para `android/app/src/main/assets/public`.
- O card Mobile aparece em Configuracoes.
- O service worker registra apenas em build de producao.
