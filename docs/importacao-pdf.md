# Importacao PDF De Extrato Bancario

## Objetivo

Permitir que o usuario importe extratos em PDF sem enviar o arquivo para servidores. O PDF e lido no front-end, convertido para linhas internas equivalentes ao CSV e depois passa pelo mesmo preview de importacao ja usado pelo app.

## Fluxo Atual

1. Usuario seleciona um arquivo `.pdf` na tela de importacao.
2. `src/services/pdfImport.ts` valida tamanho maximo de 10 MB.
3. `pdfjs-dist` extrai texto localmente no navegador usando worker empacotado pelo Vite.
4. O adaptador inicial reconhece texto de extrato Nubank.
5. O resultado vira `RawImportRow[]` com `Data`, `Valor`, `Identificador` e `Descricao`.
6. `ImportService.parseFile()` reaproveita o pipeline existente de CSV para validar, inferir tipo, calcular saldo acumulado e exibir preview.
7. So os lancamentos confirmados pelo usuario sao persistidos no app/Supabase.

## Regras De Seguranca

- O PDF nao e enviado ao Supabase, Vercel, Gemini ou qualquer API externa.
- Nao usamos CDN para o parser; `pdfjs-dist` fica empacotado no build.
- O worker de PDF fica em chunk separado para nao pesar o carregamento inicial.
- Arquivos acima de 10 MB sao recusados.
- PDFs sem texto selecionavel sao recusados. OCR fica fora da primeira versao.
- O usuario sempre revisa a previa antes de confirmar a importacao.

## Limites Conhecidos

- A primeira versao aceita apenas extratos Nubank em PDF pesquisavel/texto.
- PDF escaneado, foto ou protegido por senha deve ser exportado como CSV pelo banco.
- Layouts de outros bancos devem entrar como novos adaptadores dentro de `src/services/pdfImport.ts`.

## Proximos Adaptadores

Para adicionar outro banco, crie uma nova estrategia de deteccao por texto e converta para o mesmo formato:

```ts
{
  Data: "13/03/2026",
  Valor: "-98.82",
  Identificador: "pdf-banco-linha-1",
  Descricao: "Pagamento exemplo"
}
```

Depois cubra o layout com teste em `src/services/pdfImport.test.ts`.
