# Pasta `.ignore`

Esta pasta e um guia curto para a proxima IA ou agente humano entender o projeto sem ler tudo.

Ela nao e uma lixeira e nao deve receber segredos, APKs, builds ou arquivos temporarios.

## Ordem de leitura

1. `PROJECT_BRIEF.md`
2. `NEXT_AGENT_CHECKLIST.md`
3. `../README.md`
4. `../docs/mobile/README.md`
5. `../docs/transaction-memory.md`

## Regras importantes

- O projeto fica em `D:\Vscode\ferramentas\Nexus Financas`.
- Instale ferramentas pesadas no `D:\`, nao no `C:\`.
- Android/JDK/SDK ficam em `D:\DevTools\NexusAndroid`.
- APKs para envio manual ficam em `D:\NexusFinance-APK`.
- Skills locais do Antigravity ficam em `C:\Users\jpjoa\.gemini\antigravity\skills\skills`.
- Para analises de Clean Code, carregar `C:\Users\jpjoa\.gemini\antigravity\skills\skills\clean-code\SKILL.md`.
- Nunca commite `.env`, token, keystore, APK, AAB, `android/local.properties`, `dist` ou caches Android.
- Antes de mexer em dados/Supabase, confira as migrations em `supabase/migrations`.
