# Security Hardening

Atualizado em: 2026-04-27

## Correcoes aplicadas

- A chave Gemini deixou de ir para o frontend. A IA agora usa a rota server-side `api/analyze-finance.ts`.
- A rota de IA exige `Authorization: Bearer <supabase_access_token>` e valida a sessao no Supabase antes de chamar Gemini.
- `GEMINI_API_KEY` agora deve existir apenas no ambiente da Vercel/servidor. Nao use `VITE_GEMINI_API_KEY`.
- `vercel.json` recebeu headers de seguranca: CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy`.
- Senhas novas exigem pelo menos 8 caracteres com letras e numeros na UI.
- Config local do Supabase endurecida com `minimum_password_length = 8`, `password_requirements = "letters_digits"` e `secure_password_change = true`.
- Migration `20260427135000_security_hardening.sql` aplicada no Supabase remoto.
- Dependencias nao usadas `express`, `dotenv` e `@types/express` removidas.
- `npm audit --audit-level=moderate` voltou sem vulnerabilidades.

## Supabase advisors

Depois da migration:

- Security: resta apenas `Leaked Password Protection Disabled`.
- Performance: sem avisos.

Acao manual recomendada no Supabase:

1. Abrir `Authentication > Protection` ou `Authentication > Settings`.
2. Ativar leaked password protection/compromised password protection.
3. Conferir se a politica de senha do painel bate com o repo: minimo 8 caracteres e letras + numeros.

## Vercel Firewall recomendado

O repo ja tem headers de seguranca. No painel da Vercel, vale habilitar:

- Bot Protection em modo `challenge`.
- Attack Challenge Mode apenas durante ataque ou pico suspeito.
- Rate limit para `/api/analyze-finance`, por exemplo 10 requisicoes por minuto por IP.
- Regra para bloquear scanners comuns em caminhos como `/wp-admin`, `/wp-login.php`, `/.env`, `/phpmyadmin`.

## Checklist antes de publicar

- Definir `GEMINI_API_KEY` apenas em Production/Preview na Vercel.
- Remover qualquer `VITE_GEMINI_API_KEY` da Vercel.
- Confirmar que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` continuam configuradas.
- Rodar `npm run lint`, `npx vitest run`, `npm run build` e `npm audit --audit-level=moderate`.
