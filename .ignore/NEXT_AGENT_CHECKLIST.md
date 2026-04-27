# Checklist Para Proxima IA

## Primeiro comando

```bash
git status --short --branch
```

Nao reverta mudancas do usuario sem pedir.

## Comandos de validacao

```bash
npm run lint
npm run build
npx vitest run
npm run android:apk:debug
```

## Android

Ferramentas no `D:\`:

```text
D:\DevTools\NexusAndroid
```

APK para envio:

```text
D:\NexusFinance-APK\nexus-finance-debug-20260426-2154.apk
```

APK servido pelo site:

```text
public/downloads/nexus-finance-debug.apk
```

Nao remova `scripts/prepare-capacitor-assets.mjs`: ele impede que `public/downloads` seja empacotado dentro do APK Android.

Comandos uteis:

```bash
npm run android:devices
npm run android:install:debug
npm run android:launch
npm run android:accel-check
npm run android:emulator
```

Se `android:accel-check` acusar falta do hypervisor driver, teste com celular Android real.

## Supabase

Migrations importantes:

```text
supabase/migrations/20260425180535_finance_sync.sql
supabase/migrations/20260425193500_add_transaction_metadata.sql
supabase/migrations/20260425195500_fix_transaction_type_encoding.sql
supabase/migrations/20260426012000_add_transaction_memory.sql
```

Para aplicar migrations, o MCP atual pode estar read-only. Use o CLI se necessario:

```bash
npx supabase db push --include-all --yes
```

## Proximos passos recomendados

- Testar APK em celular Android real.
- Criar keystore de release fora do Git.
- Gerar AAB/APK assinado.
- Publicar APK assinado no site e atualizar `src/lib/mobileRelease.ts`.
- Trocar `xlsx` por alternativa mais segura quando houver tempo.
- Avaliar ajustes dos advisors do Supabase.
