"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Loader2, Megaphone, Plus, ScrollText, Send, Sparkles, Trash2 } from "lucide-react";
import { communityError } from "@/lib/communities";
import { useCommunity } from "../context";
import { Confirm } from "../ui";

type Rule = { id: string; title: string; body: string };
const field = "w-full rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60";
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()));

function Panel({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-space-card/60 p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orbit-gradient text-snow">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-white/45">{desc}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function WelcomeSection() {
  const { supabase, community, toast } = useCommunity();
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState("");
  const [rules, setRules] = useState<Rule[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("Community")
      .select("welcome, rulesList")
      .eq("id", community.id)
      .maybeSingle()
      .then(({ data }) => {
        const w = (data?.welcome ?? {}) as { enabled?: boolean; text?: string };
        setEnabled(!!w.enabled);
        setText(w.text ?? "");
        setRules(((data?.rulesList ?? []) as Rule[]).map((r) => ({ id: r.id || uid(), title: r.title ?? "", body: r.body ?? "" })));
        setLoaded(true);
      });
  }, [supabase, community.id]);

  // Mensagem coletiva
  const [bcTitle, setBcTitle] = useState("");
  const [bcMsg, setBcMsg] = useState("");
  const [confirmBc, setConfirmBc] = useState(false);

  async function saveWelcome() {
    setBusy("w");
    const { error } = await supabase.rpc("community_set_welcome", { p_community: community.id, p: { enabled, text: text.trim() } as never });
    setBusy(null);
    if (error) return toast(communityError(error.message), true);
    toast("Boas-vindas salvas.");
  }
  async function saveRules() {
    setBusy("r");
    const clean = rules.filter((r) => r.title.trim());
    const { error } = await supabase.rpc("community_set_rules", { p_community: community.id, p: clean as never });
    setBusy(null);
    if (error) return toast(communityError(error.message), true);
    setRules(clean.map((r) => ({ ...r, id: r.id || uid() })));
    toast("Regras salvas.");
  }
  async function sendBroadcast() {
    setBusy("bc");
    const { error } = await supabase.rpc("community_send_broadcast", { p_community: community.id, p_title: bcTitle.trim(), p_message: bcMsg.trim() });
    setBusy(null);
    setConfirmBc(false);
    if (error) return toast(/rate_limited/.test(error.message) ? "Aguarde: só é possível enviar uma mensagem coletiva a cada 3 horas." : communityError(error.message), true);
    setBcTitle("");
    setBcMsg("");
    toast("Mensagem enviada a todos os membros com notificações ativas.");
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rules.length) return;
    setRules((l) => {
      const n = [...l];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  };

  if (!loaded) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;

  return (
    <div className="space-y-4">
      <Panel icon={<Sparkles className="h-5 w-5" />} title="Mensagem de boas-vindas" desc="Enviada uma vez a cada novo membro ao entrar.">
        <label className="mb-3 flex items-center gap-3">
          <button type="button" onClick={() => setEnabled((v) => !v)} aria-pressed={enabled} className={clsx("relative h-6 w-11 shrink-0 rounded-full transition", enabled ? "bg-orbit-gradient" : "bg-white/15")}>
            <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", enabled ? "left-[22px]" : "left-0.5")} />
          </button>
          <span className="text-sm text-white/80">Ativar boas-vindas automáticas</span>
        </label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={4} placeholder="Seja bem-vindo(a)! Leia as regras antes de participar." className={clsx(field, "resize-none")} />
        <button type="button" onClick={saveWelcome} disabled={busy === "w"} className="mt-3 flex h-11 items-center gap-2 rounded-full bg-orbit-gradient px-6 text-sm font-semibold text-snow shadow-glow disabled:opacity-60">
          {busy === "w" && <Loader2 className="h-4 w-4 animate-spin" />} Salvar boas-vindas
        </button>
      </Panel>

      <Panel icon={<ScrollText className="h-5 w-5" />} title="Regras da comunidade" desc="Exibidas na comunidade e no momento da entrada.">
        <ul className="space-y-2">
          {rules.map((r, i) => (
            <li key={r.id} className="flex items-start gap-2 rounded-xl border border-white/[0.07] bg-space-bg/40 p-2.5">
              <div className="flex shrink-0 flex-col pt-1 text-white/30">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="hover:text-white disabled:opacity-25" aria-label="Subir">▲</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rules.length - 1} className="hover:text-white disabled:opacity-25" aria-label="Descer">▼</button>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <input value={r.title} onChange={(e) => setRules((l) => l.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))} maxLength={120} placeholder={`Regra ${i + 1}`} className={clsx(field, "py-2 font-semibold")} />
                <input value={r.body} onChange={(e) => setRules((l) => l.map((x, k) => (k === i ? { ...x, body: e.target.value } : x)))} maxLength={1000} placeholder="Descrição (opcional)" className={clsx(field, "py-2")} />
              </div>
              <button type="button" onClick={() => setRules((l) => l.filter((_, k) => k !== i))} aria-label="Remover regra" className="mt-1 shrink-0 text-red-300/80 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setRules((l) => [...l, { id: uid(), title: "", body: "" }])} className="flex h-10 items-center gap-1.5 rounded-full border border-white/10 px-4 text-xs font-semibold text-white/80 hover:bg-white/5">
            <Plus className="h-4 w-4" /> Adicionar regra
          </button>
          <button type="button" onClick={saveRules} disabled={busy === "r"} className="flex h-10 items-center gap-2 rounded-full bg-orbit-gradient px-5 text-xs font-semibold text-snow shadow-glow disabled:opacity-60">
            {busy === "r" && <Loader2 className="h-4 w-4 animate-spin" />} Salvar regras
          </button>
        </div>
      </Panel>

      <Panel icon={<Megaphone className="h-5 w-5" />} title="Mensagem coletiva" desc="Notifica todos os membros com notificações ativas. Máx. 1 a cada 3 horas.">
        <input value={bcTitle} onChange={(e) => setBcTitle(e.target.value)} maxLength={120} placeholder="Título (opcional)" className={clsx(field, "mb-2 font-semibold")} />
        <textarea value={bcMsg} onChange={(e) => setBcMsg(e.target.value)} maxLength={300} rows={3} placeholder="Escreva a mensagem para todos os membros" className={clsx(field, "resize-none")} />
        <button type="button" onClick={() => bcMsg.trim() && setConfirmBc(true)} disabled={!bcMsg.trim()} className="mt-3 flex h-11 items-center gap-2 rounded-full bg-orbit-gradient px-6 text-sm font-semibold text-snow shadow-glow disabled:opacity-50">
          <Send className="h-4 w-4" /> Enviar a todos
        </button>
      </Panel>

      <Confirm
        open={confirmBc}
        danger={false}
        title="Enviar mensagem coletiva?"
        message={`Todos os membros com notificações ativas receberão esta mensagem. ${community.memberCount ? `Até ${community.memberCount} pessoas.` : ""}`}
        confirmLabel="Enviar agora"
        busy={busy === "bc"}
        onConfirm={sendBroadcast}
        onClose={() => setConfirmBc(false)}
      />
    </div>
  );
}
