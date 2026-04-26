# iOS Options

## Rota gratis agora: PWA

O caminho sem custo para iPhone e instalar o Nexus Finance pelo Safari:

1. Abrir a URL da Vercel no Safari.
2. Tocar em Compartilhar.
3. Tocar em Adicionar a Tela de Inicio.
4. Abrir pelo icone criado.

Esse fluxo usa o manifesto e os icones do PWA. Ele nao exige conta Apple Developer.

## Rota App Store depois

Para publicar na App Store, sera necessario:

- Apple Developer Program ativo.
- Taxa anual de US$99.
- Mac com Xcode.
- Projeto iOS do Capacitor.
- App Store Connect configurado.
- TestFlight para testes.
- Revisao da Apple antes de producao.

Fonte oficial: https://developer.apple.com/support/compare-memberships/

## Decisao desta fase

Nao criar `ios/` agora. Sem Mac/Xcode e sem conta Apple Developer, o projeto nativo iOS ficaria incompleto e geraria manutencao sem ganho imediato.
