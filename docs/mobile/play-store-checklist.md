# Play Store Checklist

## Conta

- Criar conta no Google Play Console.
- Pagar a taxa unica de US$25.
- Concluir verificacao de identidade.
- Se a conta for pessoal e nova, cumprir os requisitos de teste exigidos pelo Google antes da producao.

Fonte oficial: https://support.google.com/googleplay/android-developer/answer/6112435

## Artefato

- Gerar AAB de release assinado.
- Usar `versionCode` incremental.
- Usar `versionName` alinhado ao release do app.
- Ativar Play App Signing.
- Guardar a upload key fora do Git.

## Cadastro do app

- Nome: Nexus Finance.
- Categoria: Financas.
- Politica de privacidade publicada em URL publica.
- Descricao curta e completa.
- Icone 512x512.
- Screenshots de celular.
- Classificacao indicativa.
- Data Safety com Supabase Auth, dados financeiros do usuario e analytics quando aplicavel.

## Testes

- Criar trilha de teste interno.
- Instalar pelo link da Play Store em aparelho real.
- Validar login, cadastro, importacao CSV, relatorios e sincronizacao Supabase.
- Validar comportamento sem internet: app abre shell PWA, mas login/sync dependem de rede.

## Producao

- Promover primeiro para teste fechado ou aberto se necessario.
- Monitorar crashes, avaliacoes e feedback.
- So promover para producao depois de validar pelo menos um ciclo de importacao CSV real.
