"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { CircleCheck, Film, ListOrdered, MessageSquareOff, MessagesSquare, ShieldBan, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUserPrefs } from "@/components/user-prefs";
import type { UserPrefs } from "@/lib/user-prefs";

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx("relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50", checked ? "bg-orbit-gradient" : "bg-white/15")}
    >
      <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-snow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
            value === o.value ? "bg-orbit-gradient text-snow" : "border border-white/12 text-white/70 hover:text-white"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Row({ icon: Icon, title, hint, children, stacked = false }: { icon: React.ComponentType<{ className?: string }>; title: string; hint?: React.ReactNode; children: React.ReactNode; stacked?: boolean }) {
  return (
    <div className={clsx("flex gap-3 px-4 py-3.5", stacked ? "flex-col" : "items-center")}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-white/45" />
        <span className="min-w-0">
          <span className="block text-sm text-white">{title}</span>
          {hint && <span className="mt-0.5 block text-xs text-white/45">{hint}</span>}
        </span>
      </div>
      <div className={stacked ? "pl-8" : ""}>{children}</div>
    </div>
  );
}

export function ContentSettings({ commentsOpen: initialCommentsOpen }: { commentsOpen: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const { prefs, setPrefs } = useUserPrefs();
  const [commentsOpen, setCommentsOpen] = useState(initialCommentsOpen);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function done() {
    setError(null);
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 2200);
  }

  async function set<K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) {
    const before = prefs;
    setPrefs({ ...prefs, [key]: value });
    const { error: err } = await supabase.rpc("set_preference", { p_key: key, p_value: value as never });
    if (err) {
      setPrefs(before);
      return setError("Não foi possível salvar agora. Tente de novo.");
    }
    done();
  }

  async function toggleComments(open: boolean) {
    setCommentsOpen(open);
    const { error: err } = await supabase.rpc("set_privacy", { p_key: "comment", p_scope: open ? "all" : "only_me", p_allow: [], p_deny: [] });
    if (err) {
      setCommentsOpen(!open);
      return setError("Não foi possível salvar agora. Tente de novo.");
    }
    done();
  }

  return (
    <div className="space-y-5">
      <div className="pointer-events-none sticky top-16 z-20 -mb-5 flex h-0 justify-end md:top-20">
        <span
          aria-live="polite"
          className={clsx(
            "flex h-8 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-space-surface/95 px-3 text-xs font-semibold text-emerald-300 shadow-lg backdrop-blur transition-opacity duration-300",
            saved ? "opacity-100" : "opacity-0"
          )}
        >
          <CircleCheck className="h-4 w-4" /> Alterações salvas
        </span>
      </div>
      {error && <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-200">{error}</p>}

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/45">Configurações de conteúdo</h2>
        <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-space-surface/80">
          <Row icon={ListOrdered} title="Ordem do feed" hint="Vale para a aba “Para você”." stacked>
            <Segmented
              label="Ordem do feed"
              value={prefs.feedOrder}
              onChange={(v) => set("feedOrder", v)}
              options={[
                { value: "interesting", label: "Interessantes primeiro" },
                { value: "recent", label: "Mais recentes primeiro" },
              ]}
            />
          </Row>
          <Row icon={MessagesSquare} title="Ordem dos comentários" hint="Como os comentários abrem. Dá para trocar em cada publicação." stacked>
            <Segmented
              label="Ordem dos comentários"
              value={prefs.commentOrder}
              onChange={(v) => set("commentOrder", v)}
              options={[
                { value: "top", label: "Interessantes primeiro" },
                { value: "new", label: "Mais recentes" },
                { value: "old", label: "Mais antigos" },
              ]}
            />
          </Row>
          <Row icon={Film} title="Reproduzir vídeos automaticamente no feed" hint="Começam sem som quando aparecem na tela.">
            <Switch checked={prefs.autoplayVideo} onChange={(v) => set("autoplayVideo", v)} label="Reproduzir vídeos automaticamente no feed" />
          </Row>
          <Row icon={Sparkles} title="Reproduzir GIFs automaticamente" hint="Desligado, o GIF aparece parado até você tocar nele.">
            <Switch checked={prefs.autoplayGif} onChange={(v) => set("autoplayGif", v)} label="Reproduzir GIFs automaticamente" />
          </Row>
          <Row icon={ShieldBan} title="Filtro de linguagem ofensiva" hint="Esconde palavrões e ofensas em publicações e comentários. Só muda o que você vê.">
            <Switch checked={prefs.profanityFilter} onChange={(v) => set("profanityFilter", v)} label="Filtro de linguagem ofensiva" />
          </Row>
        </div>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/45">Configurações do perfil</h2>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-space-surface/80">
          <Row
            icon={MessageSquareOff}
            title="Permitir comentários nas minhas publicações"
            hint={
              <>
                Desligado, ninguém comenta suas publicações do perfil. Para escolher quem pode, use{" "}
                <Link href="/configuracoes/privacidade" className="font-medium text-pa hover:underline">
                  Privacidade
                </Link>
                .
              </>
            }
          >
            <Switch checked={commentsOpen} onChange={toggleComments} label="Permitir comentários nas minhas publicações" />
          </Row>
        </div>
      </section>
    </div>
  );
}
