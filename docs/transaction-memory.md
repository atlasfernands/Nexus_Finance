# Memoria de Categorias e Descricoes

## Objetivo

Evitar que o usuario precise escrever categorias exatamente iguais a lancamentos anteriores. O app passa a lembrar categorias e descricoes por conta.

## Comportamento

- No modal de novo lancamento, `Categoria` e um seletor.
- O usuario pode escolher uma categoria existente ou usar `+ Criar nova categoria`.
- Ao salvar, a categoria nova entra na memoria da conta.
- `Descricao` usa `datalist` para sugerir descricoes ja usadas.
- Importacoes CSV/XLSX tambem alimentam a memoria.
- Edicoes de lancamento tambem atualizam a memoria.

## Persistencia

O estado local usa `FinanceState.transactionMemory`:

```ts
transactionMemory: {
  categories: string[];
  descriptions: string[];
}
```

No Supabase, a memoria fica em `finance_profiles`:

- `category_memory jsonb`
- `description_memory jsonb`

Migration:

```text
supabase/migrations/20260426012000_add_transaction_memory.sql
```

## Compatibilidade

O app deriva sugestoes dos lancamentos existentes se a memoria remota vier vazia. O sync tambem tem fallback para ambientes que ainda nao aplicaram as colunas novas.
