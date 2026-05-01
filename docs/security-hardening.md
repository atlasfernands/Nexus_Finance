# Security Hardening

Atualizado em: 2026-05-01

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
- Rotas comuns de arquivos sensiveis (`/backup.sql`, `/db.sql`, `/dump.sql`, `/database.sql`, `/.env`) agora retornam 404 real via `api/not-found.ts` antes do fallback SPA da Vercel.

## Scan externo 2026-05-01

Relatorio analisado:

```text
d:\Vscode\ferramentas\site-security-tester\reports\web_scan_20260501_124045.html
```

Resultado da triagem:

- `Direct Sensitive File Exposure` em `/backup.sql` e `/db.sql`: falso positivo. As URLs respondiam `200` porque o fallback SPA da Vercel entregava `index.html`, nao um dump SQL.
- Correcao aplicada mesmo assim: caminhos sensiveis conhecidos agora sao reescritos para `api/not-found`, que retorna `404`, `Cache-Control: no-store` e `X-Content-Type-Options: nosniff`.
- `CORS Misconfiguration`: confirmado `Access-Control-Allow-Origin: *` na pagina estatica. Sem `Access-Control-Allow-Credentials`, o risco pratico e baixo para a home, mas fica como item de hardening futuro.
- `Content-Security-Policy`: `script-src` segue sem `unsafe-inline`; a permissividade atual esta em `style-src 'unsafe-inline'` e em `data:` para fontes/imagens/downloads. Manter por enquanto para nao quebrar UI/exportacoes; endurecer em rodada propria.

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

## Proximos hardenings recomendados

- Avaliar se o `Access-Control-Allow-Origin: *` da pagina estatica pode ser removido ou restringido por configuracao da Vercel sem quebrar assets/cache.
- Refatorar os poucos `style={{ ... }}` restantes para classes/CSS e entao testar a remocao de `unsafe-inline` em `style-src`.
- Revisar usos de `data:` em downloads/exportacoes antes de remover essa permissao da CSP.

## Checklist antes de publicar

- Definir `GEMINI_API_KEY` apenas em Production/Preview na Vercel.
- Remover qualquer `VITE_GEMINI_API_KEY` da Vercel.
- Confirmar que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` continuam configuradas.
- Rodar `npm run lint`, `npx vitest run`, `npm run build` e `npm audit --audit-level=moderate`.
