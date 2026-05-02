# Checklist Legal, Privacidade e LGPD

> Este documento e um checklist tecnico/produto. Ele nao substitui revisao juridica profissional.

## Escopo implementado

- Paginas publicas:
- `/termos-de-uso`
- `/politica-de-privacidade`
- `/politica-de-cookies`
- `/diretrizes-do-usuario`
- Pagina interna:
- `/configuracoes/privacidade`
- Aceite obrigatorio no cadastro para Termos de Uso e Politica de Privacidade.
- Registro de aceite via `/api/legal/accept` quando houver sessao Supabase valida.
- Consentimento obrigatorio antes de processar upload de extrato bancario.
- Consentimento opcional para uso de dados anonimizados e agregados para melhoria.
- Revogacao de consentimento para novos uploads de extrato.
- Solicitacoes LGPD na area interna: acesso, correcao, exclusao de extratos, exclusao de conta e exportacao.
- Exportacao JSON dos dados da conta via `/api/me/data-export`.

## Arquivos principais

- Textos legais: `src/legal/legalDocuments.ts`
- Tela publica de documento: `src/views/LegalDocumentPage.tsx`
- Tela interna de privacidade: `src/views/PrivacySettings.tsx`
- Servico client de privacidade: `src/services/legal.ts`
- Helpers de API: `src/server/legalApi.ts`
- Endpoints: `api/legal/*` e `api/me/*`
- Migration: `supabase/migrations/20260502124500_legal_privacy_compliance.sql`

## Tabelas novas

- `legal_documents`
- `user_legal_acceptances`
- `user_consents`
- `privacy_requests`

Todas as tabelas novas em `public` devem ficar com RLS habilitado. Documentos ativos podem ser lidos por `anon` e `authenticated`; dados de aceite, consentimento e solicitacoes devem ser restritos ao proprio `auth.uid()`.

## Pontos para trocar antes de divulgar oficialmente

- E-mail oficial temporario de privacidade: `nexusfinancesltda@gmail.com`.
- Revisar textos legais com advogado ou consultor especializado em LGPD.
- Definir processo operacional para responder solicitacoes LGPD dentro dos prazos aplicaveis.
- Definir quem acessa e conclui os registros de `privacy_requests` no Supabase.

## Como testar

1. Cadastro sem aceite:
   - Abrir tela de cadastro.
   - Deixar checkbox desmarcado.
   - Tentar criar conta.
   - Resultado esperado: cadastro bloqueado com mensagem de aceite obrigatorio.

2. Cadastro com aceite:
   - Marcar checkbox de Termos e Privacidade.
   - Criar conta.
   - Resultado esperado: conta criada e, quando houver sessao valida, registros em `user_legal_acceptances` para `terms_of_use` e `privacy_policy`.

3. Upload sem consentimento:
   - Entrar na conta sem consentimento de extrato ativo.
   - Tentar enviar CSV/PDF.
   - Resultado esperado: modal de autorizacao aparece e arquivo nao e processado antes do aceite.

4. Upload com consentimento:
   - Marcar consentimento obrigatorio no modal.
   - Clicar em `Autorizar e continuar`.
   - Resultado esperado: registro em `user_consents` com `consent_type = bank_statement_processing`, modal fecha e preview do arquivo abre.

5. Revogacao de consentimento:
   - Ir em `Configuracoes > Legal e Privacidade`.
   - Clicar em `Revogar consentimento`.
   - Resultado esperado: consentimento fica revogado e novos uploads exigem autorizacao novamente.

6. Solicitacao de exportacao:
   - Clicar em `Exportar dados`.
   - Resultado esperado: download JSON e mensagem de cuidado com dados pessoais e financeiros.

7. Solicitacao de exclusao:
   - Clicar em `Solicitar exclusao dos meus extratos` ou `Solicitar exclusao da minha conta`.
   - Resultado esperado: registro em `privacy_requests` com status `open` e mensagem de solicitacao registrada.

## Observacoes importantes

- O sistema nao promete exclusao total imediata; os textos mantem ressalvas para seguranca, prevencao de fraude, cumprimento legal e defesa de direitos.
- O sistema nao afirma ser 100% seguro.
- O sistema nao deve usar dados financeiros identificaveis para marketing.
- O sistema nao deve usar extratos identificaveis para treinar IA ou melhorar produto sem consentimento especifico ou anonimizacao robusta.
- O upload fica bloqueado se a API de privacidade estiver indisponivel, porque nao ha como validar consentimento ativo com seguranca.
