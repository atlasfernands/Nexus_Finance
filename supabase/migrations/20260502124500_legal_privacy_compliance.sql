create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('terms_of_use', 'privacy_policy', 'cookie_policy', 'user_guidelines')),
  version text not null,
  title text not null,
  content text not null,
  is_active boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (type, version)
);

create table if not exists public.user_legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_type text not null check (document_type in ('terms_of_use', 'privacy_policy', 'cookie_policy', 'user_guidelines')),
  document_version text not null,
  accepted_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, document_type, document_version)
);

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_type text not null,
  consent_version text not null,
  accepted boolean not null default false,
  accepted_at timestamptz,
  revoked_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, consent_type, consent_version)
);

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  request_type text not null check (
    request_type in (
      'data_access',
      'data_correction',
      'data_export',
      'bank_statement_deletion',
      'account_deletion',
      'consent_revocation'
    )
  ),
  status text not null default 'open' check (status in ('open', 'in_review', 'completed', 'rejected', 'cancelled')),
  description text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_documents_active_idx
on public.legal_documents (type, is_active, published_at desc);

create index if not exists user_legal_acceptances_user_idx
on public.user_legal_acceptances (user_id, accepted_at desc);

create index if not exists user_consents_user_idx
on public.user_consents (user_id, consent_type, updated_at desc);

create index if not exists privacy_requests_user_idx
on public.privacy_requests (user_id, requested_at desc);

drop trigger if exists set_legal_documents_updated_at on public.legal_documents;
create trigger set_legal_documents_updated_at
before update on public.legal_documents
for each row
execute function public.set_updated_at();

drop trigger if exists set_user_consents_updated_at on public.user_consents;
create trigger set_user_consents_updated_at
before update on public.user_consents
for each row
execute function public.set_updated_at();

drop trigger if exists set_privacy_requests_updated_at on public.privacy_requests;
create trigger set_privacy_requests_updated_at
before update on public.privacy_requests
for each row
execute function public.set_updated_at();

alter table public.legal_documents enable row level security;
alter table public.user_legal_acceptances enable row level security;
alter table public.user_consents enable row level security;
alter table public.privacy_requests enable row level security;

drop policy if exists "Active legal documents are public" on public.legal_documents;
create policy "Active legal documents are public"
on public.legal_documents
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Users can read own legal acceptances" on public.user_legal_acceptances;
create policy "Users can read own legal acceptances"
on public.user_legal_acceptances
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can insert own legal acceptances" on public.user_legal_acceptances;
create policy "Users can insert own legal acceptances"
on public.user_legal_acceptances
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update own legal acceptances" on public.user_legal_acceptances;
create policy "Users can update own legal acceptances"
on public.user_legal_acceptances
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can read own consents" on public.user_consents;
create policy "Users can read own consents"
on public.user_consents
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can insert own consents" on public.user_consents;
create policy "Users can insert own consents"
on public.user_consents
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update own consents" on public.user_consents;
create policy "Users can update own consents"
on public.user_consents
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can read own privacy requests" on public.privacy_requests;
create policy "Users can read own privacy requests"
on public.privacy_requests
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can insert own privacy requests" on public.privacy_requests;
create policy "Users can insert own privacy requests"
on public.privacy_requests
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

insert into public.legal_documents (type, version, title, content, is_active, published_at)
values
  (
    'terms_of_use',
    '1.0',
    'Termos de Uso',
    $$O Nexus Finance e uma ferramenta de organizacao financeira pessoal. As informacoes, graficos, categorias, previsoes e relatorios apresentados tem finalidade informativa e nao constituem recomendacao financeira, de investimento, credito, contabil, tributaria ou juridica. O usuario e responsavel por seus dados, arquivos enviados, login, senha e conferencia dos resultados automaticos. O upload de extratos pode processar transacoes, datas, descricoes, valores, categorias, receitas, despesas e saldo quando disponivel. O sistema pode conter erros e nao substitui orientacao profissional. A conta pode ser suspensa em caso de uso indevido, fraude, tentativa de invasao ou violacao dos termos. Canal de contato: nexusfinancesltda@gmail.com.$$,
    true,
    '2026-05-02 00:00:00+00'
  ),
  (
    'privacy_policy',
    '1.0',
    'Politica de Privacidade',
    $$O Nexus Finance trata dados de cadastro, login, dados tecnicos, IP, data e hora, dispositivo, logs, extratos bancarios enviados e dados financeiros extraidos, como banco quando identificado, datas, descricoes, valores, saldo, categorias e anotacoes. As finalidades incluem autenticacao, organizacao financeira, importacao, relatorios, seguranca, suporte, prevencao de fraude, cumprimento legal e defesa de direitos. Bases legais podem incluir execucao de contrato, consentimento, cumprimento legal, legitimo interesse e exercicio regular de direitos. Dados podem ser compartilhados com fornecedores tecnicos de hospedagem, banco de dados, autenticacao, e-mail, analytics, pagamento se houver e seguranca. Nenhum sistema e 100% seguro. O titular pode solicitar acesso, correcao, exportacao, exclusao quando aplicavel e revogacao de consentimento. Canal de privacidade: nexusfinancesltda@gmail.com.$$,
    true,
    '2026-05-02 00:00:00+00'
  ),
  (
    'cookie_policy',
    '1.0',
    'Politica de Cookies',
    $$Cookies e tecnologias semelhantes podem ser usados para login, seguranca, persistencia de sessao, preferencias e funcionamento essencial. Cookies necessarios sao indispensaveis para autenticacao e seguranca. Analytics pode ser usado para estabilidade e melhoria agregada quando configurado. Cookies de marketing somente serao usados se existirem ferramentas especificas e conforme base legal aplicavel. O usuario pode gerenciar cookies pelo navegador, ciente de que bloquear recursos necessarios pode afetar login e seguranca. Duvidas: nexusfinancesltda@gmail.com.$$,
    true,
    '2026-05-02 00:00:00+00'
  ),
  (
    'user_guidelines',
    '1.0',
    'Diretrizes do Usuario',
    $$Use dados verdadeiros, nao compartilhe senha, nao envie extratos de terceiros sem autorizacao, nao tente invadir, manipular, burlar ou sobrecarregar o sistema, nao use bots nao autorizados, nao altere saldos ou dados de forma fraudulenta, confira dados processados automaticamente, comunique falhas de seguranca e use a plataforma apenas para fins licitos. Canal de contato: nexusfinancesltda@gmail.com.$$,
    true,
    '2026-05-02 00:00:00+00'
  )
on conflict (type, version) do update
set
  title = excluded.title,
  content = excluded.content,
  is_active = excluded.is_active,
  published_at = excluded.published_at,
  updated_at = now();
