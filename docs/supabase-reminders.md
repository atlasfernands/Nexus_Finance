# Lembretes Financeiros no Supabase

Atualizado em: 2026-04-27

## Decisao

Comecamos pelos lembretes leves e seguros para o plano free:

- `Data API` continua ativa, pois o app usa Supabase/PostgREST para ler e gravar dados por usuario.
- `Cron` foi ativado para gerar lembretes diarios dentro do banco.
- `Vault` fica para a fase de email/push, quando existirem chaves de provedores externos.
- `Webhooks` ficam para eventos de banco futuros, como auditoria ou processamento pos-importacao.
- `Queues` ficam para quando houver alto volume, retries ou envio em lote.

## O que foi implementado

Migration principal:

```text
supabase/migrations/20260427153000_finance_due_reminders.sql
```

Migration de ajuste:

```text
supabase/migrations/20260427154500_trim_reminder_indexes.sql
```

Tabelas criadas:

- `finance_notifications`: log de lembretes gerados pelo Cron.
- `finance_notification_suppressions`: contas silenciadas pelo usuario.

Funcoes criadas:

- `finance_parse_transaction_date(text)`: converte datas `DD/MM/YYYY` ou `YYYY-MM-DD` para `date`.
- `generate_finance_due_notifications(date)`: cria lembretes para contas pendentes que vencem amanha, vencem hoje ou estao vencidas ate 30 dias.

Cron criado:

```text
finance-due-notifications-daily
schedule: 0 11 * * *
```

Esse horario roda as 11:00 UTC, aproximadamente 08:00 em America/Sao_Paulo.

## Regras de seguranca

- As novas tabelas tem RLS ativo.
- Usuarios autenticados podem ler/alterar apenas seus proprios registros.
- A funcao `generate_finance_due_notifications(date)` nao pode ser executada por `anon` nem `authenticated`.
- O job Cron foi criado com usuario `postgres`.
- `service_role` tem permissao de execucao para automacoes futuras.

## Comportamento no app

O sino de notificacoes continua calculando os vencimentos a partir dos dados financeiros carregados.

Agora o usuario pode clicar em:

```text
Nao avisar esta conta
```

Isso grava a conta em `finance_notification_suppressions`, com `channel = all`, e a preferencia passa a valer em outros dispositivos.

Se `enable_alerts` estiver desativado no perfil, o app nao mostra alertas no sino.

## Proxima fase

Para email:

1. Escolher provedor, como Resend, Postmark ou SendGrid.
2. Guardar a chave no ambiente seguro ou Vault.
3. Criar Edge Function para ler `finance_notifications` e enviar um resumo diario.
4. Enviar 1 email por usuario por dia, nao 1 email por conta.
5. Marcar registros como `sent` ou `failed`.

Para push Android:

1. Integrar Firebase Cloud Messaging no app Capacitor.
2. Criar tabela de tokens de dispositivo por usuario.
3. Reusar o log `finance_notifications`.
4. Manter a regra de silenciar conta por `finance_notification_suppressions`.

## Observacoes do plano free

O desenho atual e leve:

- 1 job Cron por dia.
- Sem chamadas externas.
- Sem filas.
- Sem envio de email/push ainda.
- Sem indices extras ate haver uso real.

Isso evita custo e complexidade antes da necessidade real.
