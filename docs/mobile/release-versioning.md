# Release Versioning

## Fonte de versao

- Web: `package.json` em `version`.
- Android: `android/app/build.gradle` em `versionCode` e `versionName`.
- Git: tag `mobile-vX.Y.Z` para releases mobile.

## Regras

- A cada APK/AAB publico, incremente `versionCode`.
- Mantenha `versionName` alinhado ao `package.json`.
- Use tags para marcar o commit exato publicado.
- Nunca reutilize `versionCode` na Play Store.

## Exemplo

```text
package.json: 0.2.0
versionName: 0.2.0
versionCode: 2
tag: mobile-v0.2.0
```

## Checklist por release

- Atualizar `package.json`.
- Atualizar `android/app/build.gradle`.
- Rodar `npm run lint`.
- Rodar `npm run build`.
- Rodar `npm run mobile:sync`.
- Gerar APK/AAB.
- Testar em aparelho real.
- Criar tag Git.
