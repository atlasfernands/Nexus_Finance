# Nexus Finance

Painel financeiro web para casa + MEI, com dashboard, importacao de CSV/XLSX, relatorios, alertas de caixa e autenticacao.

## Stack

- React 19 + Vite
- Tailwind CSS
- Recharts
- Supabase Auth
- Vercel para deploy

## Rodando localmente

```bash
npm install
npm run dev
```

Crie um `.env` baseado em `.env.example`.

## Variaveis de ambiente

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=
```

## Preparacao para Supabase

1. Crie um projeto no Supabase.
2. Em `Project Settings > API`, copie:
   - `Project URL` para `VITE_SUPABASE_URL`
   - `anon public key` para `VITE_SUPABASE_ANON_KEY`
3. Abra o `SQL Editor` e rode o script `supabase/schema.sql`.
4. Em `Authentication > Providers`, deixe Email habilitado.
5. Em `Authentication > URL Configuration`, configure:
   - `Site URL`: sua URL final da Vercel
   - `Redirect URLs`:
     - `http://localhost:3000`
     - `https://seu-projeto.vercel.app`
     - se usar previews, adicione uma regra de preview adequada

## Preparacao para Vercel

1. Importe este repositorio na Vercel.
2. Framework preset: `Vite`.
3. Adicione as variaveis:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY` se usar IA
4. Deploy.

O arquivo `vercel.json` ja foi incluido para fallback de SPA.

## Vercel Analytics

- O projeto ja esta preparado com `@vercel/analytics`.
- Em apps `React + Vite`, o componente foi ligado em `src/main.tsx`.
- O Analytics nao coleta dados em desenvolvimento local; os dados aparecem apos deploy na Vercel.
- Como este painel usa navegacao interna em SPA, o Web Analytics mede visitas e carregamentos da aplicacao. Se voce quiser medir mudancas entre modulos internos como eventos separados, o proximo passo e instrumentar eventos customizados ou migrar as views para rotas reais.

## Auth atual

- Login e cadastro por email/senha usando Supabase Auth
- Sessao persistida pelo SDK do Supabase
- Dados financeiros sincronizados por usuario no Supabase
- Fallback local para migracao inicial e resiliencia offline
- UI mobile-first para uso principal em celular

## Proximos passos recomendados

- Configurar recuperacao de senha
- Criar fluxo de confirmacao e redefinicao de senha
- Adicionar auditoria ou `updated_by` se houver operacao em equipe
- Evoluir importacao para batch insert server-side se o volume crescer
