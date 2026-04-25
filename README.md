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
3. Em `Authentication > Providers`, deixe Email habilitado.
4. Em `Authentication > URL Configuration`, configure:
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

## Auth atual

- Login e cadastro por email/senha usando Supabase Auth
- Sessao persistida pelo SDK do Supabase
- UI mobile-first para uso principal em celular

## Proximos passos recomendados

- Configurar recuperacao de senha
- Criar perfis de usuario no banco
- Sincronizar dados financeiros por usuario no Supabase
- Aplicar Row Level Security antes de publicar dados multiusuario
