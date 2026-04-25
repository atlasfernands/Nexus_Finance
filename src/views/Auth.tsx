import React, { useState } from "react";
import { Eye, EyeOff, Fingerprint, LockKeyhole, Mail, ShieldCheck, Smartphone, User2 } from "lucide-react";
import { useAuth } from "../features/auth/AuthContext";
import { cn } from "../lib/utils";

function createEmptyForm() {
  return {
    email: "",
    name: "",
    password: "",
  };
}

export default function Auth() {
  const { hasAccount, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(hasAccount ? "login" : "register");
  const [form, setForm] = useState(createEmptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "register") {
        if (form.name.trim().length < 3) {
          throw new Error("Informe um nome com pelo menos 3 caracteres.");
        }

        if (form.password.length < 6) {
          throw new Error("A senha precisa ter pelo menos 6 caracteres.");
        }

        await register(form.name, form.email, form.password);
      } else {
        await login(form.email, form.password);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Falha ao validar acesso.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#173122_0%,#0A0B0D_42%,#050608_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-brand-border bg-brand-card/95 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative hidden min-h-[620px] overflow-hidden border-r border-brand-border/80 bg-[linear-gradient(160deg,rgba(0,255,157,0.14)_0%,rgba(10,11,13,0.05)_38%,rgba(10,11,13,0.9)_100%)] p-10 lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,157,0.18),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.18),transparent_30%)]" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-3 rounded-full border border-brand-green/20 bg-brand-green/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-green">
                  <Fingerprint size={14} />
                  Nexus Access
                </div>
                <div className="max-w-md space-y-4">
                  <h1 className="text-4xl font-semibold leading-tight text-white">
                    Acesso protegido para cuidar do caixa sem perder o ritmo.
                  </h1>
                  <p className="text-base leading-7 text-slate-300">
                    Fluxo pensado para mobile: rápido no toque, legível em telas menores e pronto para virar login real em produção.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                {[
                  {
                    icon: ShieldCheck,
                    title: "Sessão persistida no aparelho",
                    text: "Entrou uma vez, volta mais rápido no dia a dia.",
                  },
                  {
                    icon: Smartphone,
                    title: "Mobile-first de verdade",
                    text: "Campos grandes, foco claro e ações fáceis com o polegar.",
                  },
                  {
                    icon: LockKeyhole,
                    title: "Base pronta para produção",
                    text: "Estrutura preparada para plugar Supabase ou Clerk depois.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-white/6 p-2 text-brand-green">
                        <item.icon size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-400">{item.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="p-5 sm:p-8 lg:p-10">
            <div className="mx-auto flex w-full max-w-md flex-col justify-center">
              <div className="mb-8 space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-slate-900/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 lg:hidden">
                  <Fingerprint size={13} className="text-brand-green" />
                  Nexus Access
                </div>
                <h2 className="text-3xl font-semibold text-white">
                  {mode === "register" ? "Criar acesso" : "Entrar"}
                </h2>
                <p className="text-sm leading-6 text-slate-400">
                  {mode === "register"
                    ? "Cadastre o primeiro acesso do app neste aparelho."
                    : "Use seu email e senha para abrir o painel financeiro."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <label className="block space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Nome</span>
                    <div className="flex h-14 items-center gap-3 rounded-2xl border border-brand-border bg-slate-950/70 px-4 transition-all focus-within:border-brand-green/60">
                      <User2 size={18} className="text-slate-500" />
                      <input
                        required
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Seu nome"
                        className="h-full w-full bg-transparent text-base text-white outline-none placeholder:text-slate-600"
                      />
                    </div>
                  </label>
                )}

                <label className="block space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Email</span>
                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-brand-border bg-slate-950/70 px-4 transition-all focus-within:border-brand-green/60">
                    <Mail size={18} className="text-slate-500" />
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="voce@exemplo.com"
                      className="h-full w-full bg-transparent text-base text-white outline-none placeholder:text-slate-600"
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Senha</span>
                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-brand-border bg-slate-950/70 px-4 transition-all focus-within:border-brand-green/60">
                    <LockKeyhole size={18} className="text-slate-500" />
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                      value={form.password}
                      onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder={mode === "register" ? "Crie uma senha segura" : "Digite sua senha"}
                      className="h-full w-full bg-transparent text-base text-white outline-none placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="rounded-full p-1 text-slate-500 transition-colors hover:text-white"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                {error && (
                  <div className="rounded-2xl border border-brand-red/30 bg-brand-red/5 px-4 py-3 text-sm text-brand-red">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "flex h-14 w-full items-center justify-center rounded-2xl bg-brand-green px-5 text-base font-semibold text-black transition-all",
                    loading ? "cursor-wait opacity-70" : "hover:brightness-110 active:scale-[0.99]"
                  )}
                >
                  {loading ? "Validando acesso..." : mode === "register" ? "Criar e entrar" : "Entrar no Nexus"}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-brand-border bg-slate-950/70 p-4 text-sm text-slate-400">
                <p className="font-semibold text-white">
                  {mode === "register" ? "Primeiro acesso neste aparelho" : "Quer redefinir o acesso?"}
                </p>
                <p className="mt-1 leading-6">
                  {mode === "register"
                    ? "Essa versão já segura o acesso localmente e está pronta para trocar por autenticação real quando subirmos para produção."
                    : "Na etapa seguinte eu posso ligar este fluxo a um provedor real de autenticação para produção."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setForm(createEmptyForm());
                  setMode((current) => (current === "register" ? "login" : "register"));
                }}
                className="mt-5 text-sm font-medium text-brand-green transition-colors hover:text-white"
              >
                {mode === "register" ? "Ja tenho acesso" : "Criar primeiro acesso neste aparelho"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
