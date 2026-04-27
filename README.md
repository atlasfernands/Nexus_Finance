# Nexus Finance

Painel financeiro web para casa + MEI, com dashboard, importacao de CSV, relatorios, alertas de caixa e autenticacao.

## Stack

- React 19 + Vite
- Tailwind CSS
- Recharts
- Supabase Auth
- Vercel para deploy
- Capacitor para Android nativo
- PWA com manifesto, icones e service worker simples

## Leitura rapida para agentes

Antes de varrer o projeto inteiro, leia a pasta `.ignore`:

- `.ignore/README.md`: ordem de leitura e regras do projeto
- `.ignore/PROJECT_BRIEF.md`: estado atual do produto, Supabase, mobile e riscos
- `.ignore/NEXT_AGENT_CHECKLIST.md`: comandos, validacoes e proximos passos

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
GEMINI_API_KEY=
VITE_API_BASE_URL=
```

`VITE_API_BASE_URL` e opcional. Use apenas em builds Android/Capacitor se o app precisar chamar a API da Vercel por URL absoluta.

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
   - `GEMINI_API_KEY` se usar IA. Esta variavel deve ficar apenas no servidor/Vercel, nunca com prefixo `VITE_`.
4. Deploy.

O arquivo `vercel.json` ja foi incluido com fallback de SPA e headers de seguranca.

## Vercel Analytics

- O projeto ja esta preparado com `@vercel/analytics`.
- Em apps `React + Vite`, o componente foi ligado em `src/main.tsx`.
- O Analytics nao coleta dados em desenvolvimento local; os dados aparecem apos deploy na Vercel.
- Como este painel usa navegacao interna em SPA, o Web Analytics mede visitas e carregamentos da aplicacao. Se voce quiser medir mudancas entre modulos internos como eventos separados, o proximo passo e instrumentar eventos customizados ou migrar as views para rotas reais.

## Mobile

- O projeto esta preparado para PWA e Android nativo via Capacitor.
- A documentacao de implementacao e release fica em `docs/mobile`.
- O APK debug ja compila localmente.
- O APK separado para testes fica em `D:\NexusFinance-APK`.
- As ferramentas Android ficam em `D:\DevTools\NexusAndroid` para nao ocupar o `C:\`.
- Para sincronizar o build web com o Android:

```bash
npm run mobile:sync
```

- Para abrir o projeto no Android Studio:

```bash
npm run android:open
```

- Para gerar APK debug:

```bash
npm run android:apk:debug
```

## Lancamentos e memoria

- Categorias e descricoes usadas em lancamentos ficam salvas por conta.
- No modal de novo lancamento, a categoria pode ser selecionada ou criada.
- Descricoes anteriores aparecem como sugestoes enquanto o usuario digita.
- A memoria e persistida no Supabase em `finance_profiles.category_memory` e `finance_profiles.description_memory`.

## Auth atual

- Login e cadastro por email/senha usando Supabase Auth
- Sessao persistida pelo SDK do Supabase
- Dados financeiros sincronizados por usuario no Supabase
- Fallback local para migracao inicial e resiliencia offline
- UI mobile-first para uso principal em celular

## Proximos passos recomendados

- Configurar recuperacao de senha
- Criar fluxo de confirmacao e redefinicao de senha
- Testar APK debug em um Android real
- Criar keystore fora do Git e gerar release assinado
- Adicionar auditoria ou `updated_by` se houver operacao em equipe
- Evoluir importacao para batch insert server-side se o volume crescer
