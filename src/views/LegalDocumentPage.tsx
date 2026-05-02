import React from "react";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { LEGAL_DOCUMENTS, LegalDocument } from "../legal/legalDocuments";

interface LegalDocumentPageProps {
  document: LegalDocument;
}

export default function LegalDocumentPage({ document }: LegalDocumentPageProps) {
  const relatedDocuments = Object.values(LEGAL_DOCUMENTS);

  return (
    <main className="min-h-screen bg-brand-bg px-4 py-8 text-slate-200 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-card px-4 py-2 text-sm text-slate-300 transition-colors hover:border-brand-green/50 hover:text-white"
        >
          <ArrowLeft size={16} />
          Voltar ao Nexus
        </a>

        <section className="mt-8 overflow-hidden rounded-[28px] border border-brand-border bg-brand-card shadow-2xl">
          <div className="border-b border-brand-border bg-[radial-gradient(circle_at_top_left,rgba(0,255,157,0.18),transparent_34%),#111418] p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-green/20 bg-brand-green/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-green">
              <ShieldCheck size={14} />
              Legal e Privacidade
            </div>
            <h1 className="mt-5 text-3xl font-bold text-white sm:text-4xl">{document.title}</h1>
            <p className="mt-3 text-sm text-slate-400">
              Versao {document.version} publicada em {document.publishedAt}
            </p>
          </div>

          <div className="space-y-8 p-6 sm:p-8">
            {document.sections.map((section) => (
              <section key={section.heading} className="space-y-3">
                <h2 className="text-lg font-bold text-white">{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-slate-300">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-brand-border bg-brand-card p-5">
          <div className="flex items-center gap-2 text-brand-green">
            <FileText size={18} />
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white">Outros documentos</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {relatedDocuments.map((item) => (
              <a
                key={item.type}
                href={`/${item.slug}`}
                className="rounded-full border border-brand-border px-4 py-2 text-sm text-slate-300 transition-colors hover:border-brand-green/50 hover:text-white"
              >
                {item.title}
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
