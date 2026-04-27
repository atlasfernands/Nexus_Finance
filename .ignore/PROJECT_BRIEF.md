# Nexus Finance - Brief Para Proximos Agentes

## Produto

Nexus Finance e um app financeiro para casa + MEI com dashboard, importacao CSV/XLSX, relatorios, alertas, Supabase Auth e sincronizacao por usuario.

## Stack

- React 19 + Vite
- Tailwind CSS
- Recharts
- Supabase Auth + Postgres
- Vercel
- Capacitor Android
- PWA com service worker simples

## Estado atual

- Web app roda com `npm run dev` na porta `3000`.
- Supabase esta conectado ao projeto `frijqfbjwwbfihyndwln`.
- Dados financeiros ficam em `finance_profiles` e `finance_transactions`.
- `finance_profiles` tambem guarda memoria de categorias e descricoes.
- Android Capacitor esta criado em `android/`.
- APK debug compila com `npm run android:apk:debug`.
- O app Android usa modo imersivo fullscreen; barras do sistema aparecem por deslize.
- O site libera download em `public/downloads/nexus-finance-debug.apk`.
- APK copiado para teste manual: `D:\NexusFinance-APK\nexus-finance-debug-20260426-2154.apk`.
- AVD local criado: `D:\DevTools\NexusAndroid\android-avd\NexusFinance_API36.avd`.

## Funcionalidades recentes

- Login/cadastro com Supabase Auth.
- Sincronizacao de transacoes por conta.
- Importacao CSV/XLSX com classificacao de entrada/saida e saldo acumulado.
- Relatorio PDF por impressao.
- PWA e Android via Capacitor.
- Memoria de categorias e descricoes no lancamento manual.

## Riscos conhecidos

- `xlsx` aparece no `npm audit` com vulnerabilidade alta sem fix oficial.
- Emulador Android ainda precisa do Android Emulator Hypervisor Driver no Windows.
- APK atual e debug, nao release assinado.
- Keystore de release ainda nao existe e deve ficar fora do Git.
- Advisors do Supabase indicam melhorias futuras em RLS/search_path/Auth, mas nao bloqueiam a feature atual.
