export type LegalDocumentType =
  | "terms_of_use"
  | "privacy_policy"
  | "cookie_policy"
  | "user_guidelines";

export interface LegalDocumentSection {
  heading: string;
  body: string[];
}

export interface LegalDocument {
  type: LegalDocumentType;
  slug: string;
  title: string;
  version: string;
  publishedAt: string;
  sections: LegalDocumentSection[];
}

export const LEGAL_DOCUMENT_VERSION = "1.0";
export const BANK_STATEMENT_CONSENT_VERSION = "1.0";
export const LEGAL_CONTACT_EMAIL = "nexusfinancesltda@gmail.com";

export const LEGAL_DOCUMENTS: Record<LegalDocumentType, LegalDocument> = {
  terms_of_use: {
    type: "terms_of_use",
    slug: "termos-de-uso",
    title: "Termos de Uso",
    version: LEGAL_DOCUMENT_VERSION,
    publishedAt: "2026-05-02",
    sections: [
      {
        heading: "1. Identificacao da plataforma",
        body: [
          "O Nexus Finance e uma plataforma de organizacao financeira pessoal disponibilizada para usuarios cadastrados.",
          "Estes Termos de Uso regulam o acesso e o uso da plataforma, incluindo recursos de cadastro, importacao de extratos, categorizacao, graficos, relatorios e analises informativas.",
        ],
      },
      {
        heading: "2. Aceitacao dos termos",
        body: [
          "Ao criar uma conta, acessar ou utilizar o Nexus Finance, voce declara que leu, compreendeu e aceitou estes Termos de Uso e a Politica de Privacidade.",
          "Caso nao concorde com estes termos, voce nao deve utilizar a plataforma.",
        ],
      },
      {
        heading: "3. Cadastro, conta e seguranca",
        body: [
          "Para usar recursos autenticados, voce deve informar dados verdadeiros, atuais e completos.",
          "Voce e responsavel por manter a confidencialidade do seu login e senha e por todas as atividades realizadas na sua conta.",
          "Informe imediatamente qualquer suspeita de acesso indevido, vazamento de senha ou uso nao autorizado da sua conta.",
        ],
      },
      {
        heading: "4. Uso permitido e usos proibidos",
        body: [
          "Voce deve utilizar a plataforma apenas para fins licitos e de organizacao das suas proprias informacoes financeiras pessoais.",
          "E proibido tentar invadir, manipular, burlar mecanismos de seguranca, interferir na operacao do sistema, usar bots ou automacoes nao autorizadas, ou enviar dados de terceiros sem autorizacao.",
          "Tambem e proibido tentar alterar saldos, categorias, dados, relatorios ou registros de forma fraudulenta.",
        ],
      },
      {
        heading: "5. Upload e processamento de extratos bancarios",
        body: [
          "Voce pode enviar arquivos de extrato bancario para que o sistema tente identificar transacoes, datas, descricoes, valores, categorias, receitas, despesas e saldo, quando disponivel.",
          "Voce e responsavel pelos arquivos enviados, pela licitude do envio e por conferir se o conteudo pertence a voce ou se voce possui autorizacao para processa-lo.",
          "O processamento e automatico e pode conter erros, inclusive em categorias, graficos, saldos, relatorios, previsoes ou interpretacoes de transacoes.",
        ],
      },
      {
        heading: "6. Finalidade informativa",
        body: [
          "A plataforma e uma ferramenta de organizacao financeira pessoal. As informacoes, graficos, categorias, previsoes e relatorios apresentados tem finalidade informativa e nao constituem recomendacao financeira, de investimento, credito, contabil, tributaria ou juridica.",
          "O Nexus Finance nao e banco, instituicao financeira, consultoria financeira, consultoria contabil, consultoria tributaria ou escritorio juridico. O sistema nao concede credito, nao administra investimentos e nao substitui orientacao profissional.",
        ],
      },
      {
        heading: "7. Cancelamento, suspensao e exclusao",
        body: [
          "Voce pode solicitar cancelamento de conta, exclusao de extratos e exclusao de dados pela area de privacidade da sua conta.",
          "Podemos suspender ou limitar acesso em caso de uso indevido, fraude, tentativa de invasao, violacao destes termos, risco de seguranca ou obrigacao legal.",
          "A exclusao de dados pode observar retencoes necessarias para seguranca, prevencao a fraude, cumprimento legal ou defesa de direitos.",
        ],
      },
      {
        heading: "8. Propriedade intelectual",
        body: [
          "A marca, interface, codigo, textos, graficos, fluxos, componentes e demais elementos da plataforma pertencem ao Nexus Finance ou a seus licenciadores.",
          "O uso da plataforma nao concede licenca para copiar, vender, distribuir, modificar ou explorar comercialmente qualquer parte do sistema sem autorizacao.",
        ],
      },
      {
        heading: "9. Alteracoes dos termos e contato",
        body: [
          "Estes termos podem ser atualizados para refletir mudancas no produto, requisitos legais, seguranca ou operacao.",
          `Duvidas, solicitacoes e comunicacoes podem ser enviadas para ${LEGAL_CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
  privacy_policy: {
    type: "privacy_policy",
    slug: "politica-de-privacidade",
    title: "Politica de Privacidade",
    version: LEGAL_DOCUMENT_VERSION,
    publishedAt: "2026-05-02",
    sections: [
      {
        heading: "1. Controlador dos dados",
        body: [
          `O controlador dos dados pessoais tratados no Nexus Finance e o operador da plataforma Nexus Finance. O canal de contato de privacidade e ${LEGAL_CONTACT_EMAIL}.`,
          "Esta politica explica quais dados podem ser tratados, para quais finalidades, com quais bases legais e como o titular pode exercer seus direitos.",
        ],
      },
      {
        heading: "2. Dados coletados",
        body: [
          "Podemos tratar dados de cadastro, como nome, e-mail, telefone se existir, senha protegida por hash e informacoes adicionadas pelo usuario.",
          "Podemos tratar dados de login e tecnicos, como IP, data e hora de acesso, user agent, dispositivo, registros de login, logs de seguranca e eventos de uso.",
          "Podemos tratar arquivos de extrato bancario enviados pelo usuario e dados extraidos desses arquivos, incluindo nome do banco quando identificado, datas das transacoes, descricoes, valores de receitas e despesas, saldo quando presente, categorias financeiras, anotacoes e informacoes adicionadas pelo usuario.",
          "Se houver assinatura ou pagamento no futuro, poderemos tratar dados relacionados a plano, status de assinatura, pagamentos e identificadores fornecidos por provedores de pagamento.",
        ],
      },
      {
        heading: "3. Finalidades do tratamento",
        body: [
          "Usamos dados para criar e proteger contas, autenticar usuarios, organizar informacoes financeiras, importar extratos, exibir transacoes, categorias, relatorios, graficos e preferencias da conta.",
          "Tambem usamos dados para suporte, seguranca, prevencao de fraude, correcao de falhas, cumprimento legal, exercicio regular de direitos e melhoria do funcionamento da plataforma.",
          "Nao usamos dados financeiros identificaveis para marketing e nao usamos extratos bancarios identificaveis para treinar IA ou melhorar produto sem consentimento especifico ou anonimizacao robusta.",
        ],
      },
      {
        heading: "4. Bases legais da LGPD",
        body: [
          "As bases legais podem incluir execucao de contrato ou procedimentos preliminares relacionados ao servico solicitado, consentimento do titular, cumprimento de obrigacao legal ou regulatoria, legitimo interesse para seguranca e melhoria do servico, e exercicio regular de direitos.",
          "Quando o tratamento depender de consentimento, voce pode revoga-lo pela area de privacidade, sem apagar automaticamente dados antigos, salvo quando tambem houver solicitacao especifica de exclusao aplicavel.",
        ],
      },
      {
        heading: "5. Compartilhamento e fornecedores tecnicos",
        body: [
          "Podemos compartilhar dados com fornecedores tecnicos estritamente necessarios para operar a plataforma, como hospedagem, banco de dados, autenticacao, e-mail transacional, analytics, processamento de pagamento se houver, seguranca e suporte.",
          "Esses fornecedores atuam para viabilizar a prestacao do servico e devem observar medidas de seguranca e confidencialidade compativeis com suas funcoes.",
        ],
      },
      {
        heading: "6. Transferencia internacional",
        body: [
          "Alguns fornecedores tecnicos podem armazenar ou processar dados fora do Brasil. Nesses casos, adotamos medidas contratuais, tecnicas e organizacionais razoaveis para proteger os dados conforme a LGPD.",
        ],
      },
      {
        heading: "7. Retencao e seguranca",
        body: [
          "Mantemos dados pelo tempo necessario para prestar o servico, cumprir obrigacoes legais, preservar seguranca, prevenir fraude, resolver disputas e exercer direitos.",
          "Adotamos medidas de seguranca tecnicas e organizacionais para reduzir riscos de acesso indevido, perda, alteracao ou divulgacao nao autorizada. Nenhum sistema e 100% seguro, mas buscamos proteger os dados com controles proporcionais ao risco.",
        ],
      },
      {
        heading: "8. Direitos do titular",
        body: [
          "Voce pode solicitar confirmacao de tratamento, acesso, correcao, exportacao, anonimizacao, bloqueio, eliminacao quando aplicavel, informacao sobre compartilhamento e revogacao de consentimento.",
          "As solicitacoes podem ser feitas em Configuracoes > Legal e Privacidade ou pelo canal de contato informado nesta politica.",
          "A exclusao pode nao ser total ou imediata quando houver necessidade de retencao por seguranca, prevencao de fraude, cumprimento legal ou defesa de direitos.",
        ],
      },
    ],
  },
  cookie_policy: {
    type: "cookie_policy",
    slug: "politica-de-cookies",
    title: "Politica de Cookies",
    version: LEGAL_DOCUMENT_VERSION,
    publishedAt: "2026-05-02",
    sections: [
      {
        heading: "1. O que sao cookies e tecnologias semelhantes",
        body: [
          "Cookies, armazenamento local e tecnologias semelhantes ajudam a manter sessao, preferencias, seguranca e funcionamento da plataforma.",
          "No Nexus Finance, algumas tecnologias sao essenciais para login, persistencia de sessao, seguranca e experiencia basica do aplicativo.",
        ],
      },
      {
        heading: "2. Cookies necessarios, autenticacao e seguranca",
        body: [
          "Cookies e armazenamentos necessarios sao essenciais para autenticar o usuario, manter a sessao ativa, proteger contra acessos indevidos e lembrar configuracoes indispensaveis.",
          "Esses recursos nao podem ser desativados pela plataforma sem prejudicar login, seguranca ou funcionamento do aplicativo.",
        ],
      },
      {
        heading: "3. Cookies analiticos e de marketing",
        body: [
          "Podemos usar analytics para entender estabilidade, desempenho e uso agregado do produto, quando configurado.",
          "Cookies de marketing somente serao usados se existirem ferramentas especificas para essa finalidade e conforme preferencia ou base legal aplicavel.",
          "Dados financeiros identificaveis nao devem ser usados para marketing.",
        ],
      },
      {
        heading: "4. Como gerenciar preferencias",
        body: [
          "Voce pode gerenciar cookies pelo navegador, apagando dados do site ou bloqueando cookies nao essenciais.",
          "Ao bloquear cookies ou armazenamento necessario, login, seguranca e sincronizacao podem deixar de funcionar corretamente.",
          `Duvidas sobre cookies podem ser enviadas para ${LEGAL_CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
  user_guidelines: {
    type: "user_guidelines",
    slug: "diretrizes-do-usuario",
    title: "Diretrizes do Usuario",
    version: LEGAL_DOCUMENT_VERSION,
    publishedAt: "2026-05-02",
    sections: [
      {
        heading: "Regras simples de uso",
        body: [
          "Use dados verdadeiros, atuais e pertencentes a voce.",
          "Nao compartilhe sua senha e informe suspeitas de acesso indevido.",
          "Nao envie extrato de terceiros sem autorizacao.",
          "Nao tente invadir, manipular, burlar ou sobrecarregar o sistema.",
          "Nao use bots, scripts ou automacoes nao autorizadas.",
          "Nao tente alterar saldos, categorias ou dados de forma fraudulenta.",
          "Confira os dados processados automaticamente antes de tomar decisoes.",
          "Comunique erro, falha de seguranca ou acesso indevido pelo canal de privacidade.",
          "Use a plataforma apenas para fins licitos e de organizacao financeira pessoal.",
        ],
      },
    ],
  },
};

export const PUBLIC_LEGAL_ROUTES: Record<string, LegalDocumentType> = {
  "/termos-de-uso": "terms_of_use",
  "/politica-de-privacidade": "privacy_policy",
  "/politica-de-cookies": "cookie_policy",
  "/diretrizes-do-usuario": "user_guidelines",
};

export function getLegalDocumentByPath(pathname: string): LegalDocument | null {
  const documentType = PUBLIC_LEGAL_ROUTES[pathname];
  return documentType ? LEGAL_DOCUMENTS[documentType] : null;
}

export function getLegalDocumentText(document: LegalDocument) {
  return document.sections
    .map((section) => `${section.heading}\n${section.body.join("\n\n")}`)
    .join("\n\n");
}
