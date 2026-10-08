"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Check, ChevronRight, CircleCheck, EyeOff, Loader2, Lock, Search, ShieldHalf, Sparkles, UserSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/community/ui";
import { normalize } from "@/lib/music";
import {
  PRIVACY_GROUPS,
  scopeLabel,
  valueLabel,
  type PrivacyItem,
  type PrivacyPerson,
  type PrivacyScope,
  type PrivacyState,
} from "@/lib/privacy";

function Face({ p, size = 40 }: { p: { name: string; avatarUrl: string | null }; size?: number }) {
  return p.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.avatarUrl} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-sm font-semibold text-white/70" style={{ width: size, height: size }}>
      {p.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

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

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/45">{title}</h2>
      <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-space-surface/80">{children}</div>
    </section>
  );
}

function Row({ label, hint, value, onClick }: { label: string; hint?: string; value: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/5">
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-white">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-white/45">{hint}</span>}
      </span>
      <span className="max-w-[42%] shrink-0 truncate text-right text-sm font-medium text-orbit-cyan">{value}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
    </button>
  );
}

/** Lista de amigos para "exceto…" e "alguns amigos". */
function useFriends(open: boolean) {
  const supabase = useMemo(() => createClient(), []);
  const [friends, setFriends] = useState<PrivacyPerson[] | null>(null);
  useEffect(() => {
    if (!open || friends) return;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return setFriends([]);
      const { data: links } = await supabase
        .from("Friendship")
        .select("requesterId, addresseeId")
        .eq("status", "accepted")
        .or(`requesterId.eq.${uid},addresseeId.eq.${uid}`)
        .limit(1000);
      const ids = (links ?? []).map((l) => (l.requesterId === uid ? l.addresseeId : l.requesterId));
      if (!ids.length) return setFriends([]);
      const { data: users } = await supabase.from("User").select("id, name, username, avatarUrl").in("id", ids);
      setFriends(((users ?? []) as PrivacyPerson[]).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    })();
  }, [open, friends, supabase]);
  return friends;
}

function ScopeSheet({
  item,
  value,
  onClose,
  onSave,
}: {
  item: PrivacyItem | null;
  value: PrivacyState["settings"][keyof PrivacyState["settings"]] | null;
  onClose: () => void;
  onSave: (scope: PrivacyScope, ids: string[]) => Promise<boolean>;
}) {
  const [scope, setScope] = useState<PrivacyScope>("all");
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const needsList = scope === "friends_except" || scope === "selected";
  const friends = useFriends(!!item && needsList);

  useEffect(() => {
    if (!item || !value) return;
    setScope(value.scope);
    setPicked((value.scope === "selected" ? value.allow : value.deny).map((p) => p.id));
    setQ("");
  }, [item, value]);

  const list = useMemo(() => {
    const n = normalize(q.trim());
    return (friends ?? []).filter((f) => !n || normalize(`${f.name} ${f.username}`).includes(n));
  }, [friends, q]);

  async function choose(s: PrivacyScope) {
    setScope(s);
    if (s === "friends_except" || s === "selected") {
      if (s !== value?.scope) setPicked([]);
      return;
    }
    setBusy(true);
    const ok = await onSave(s, []);
    setBusy(false);
    if (ok) onClose();
  }

  async function saveList() {
    setBusy(true);
    const ok = await onSave(scope, picked);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Sheet
      open={!!item}
      onClose={onClose}
      title={item?.label}
      footer={
        needsList ? (
          <button
            type="button"
            onClick={saveList}
            disabled={busy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {scope === "selected"
              ? picked.length
                ? `Salvar · ${picked.length} ${picked.length === 1 ? "amigo" : "amigos"}`
                : "Salvar · nenhum amigo"
              : picked.length
                ? `Salvar · exceto ${picked.length}`
                : "Salvar · todos os amigos"}
          </button>
        ) : undefined
      }
    >
      {item && (
        <div className="space-y-3 pb-1">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            {item.scopes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => choose(s)}
                disabled={busy}
                aria-pressed={scope === s}
                className="flex w-full items-center gap-3 border-b border-white/10 px-4 py-3 text-left text-sm text-white transition last:border-b-0 hover:bg-white/5"
              >
                <span
                  className={clsx(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                    scope === s ? "border-transparent bg-orbit-gradient" : "border-white/25"
                  )}
                >
                  {scope === s && <span className="h-2 w-2 rounded-full bg-snow" />}
                </span>
                {scopeLabel(s, item.action)}
              </button>
            ))}
          </div>

          {needsList && (
            <div className="space-y-2">
              <p className="px-1 text-xs text-white/50">
                {scope === "selected" ? "Escolha os amigos que podem." : "Escolha os amigos que não podem."}
              </p>
              <label className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 focus-within:border-orbit-purple/60">
                <Search className="h-4 w-4 text-white/40" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar amigos" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40" />
              </label>
              <div className="max-h-[38vh] space-y-0.5 overflow-y-auto">
                {friends === null ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                  </div>
                ) : list.length === 0 ? (
                  <p className="py-6 text-center text-sm text-white/45">{friends.length ? "Ninguém encontrado." : "Você ainda não tem amigos no Órbita X."}</p>
                ) : (
                  list.map((f) => {
                    const on = picked.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setPicked((p) => (on ? p.filter((x) => x !== f.id) : [...p, f.id]))}
                        className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-white/[0.05]"
                      >
                        <Face p={f} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-white">{f.name}</span>
                          <span className="block truncate text-xs text-white/45">@{f.username}</span>
                        </span>
                        <span className={clsx("flex h-6 w-6 items-center justify-center rounded-full border-2 transition", on ? "border-transparent bg-orbit-gradient text-snow" : "border-white/25")}>
                          {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

const untilLabel = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export function PrivacySettings({ initial }: { initial: PrivacyState }) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<PrivacyState>(initial);
  const [editing, setEditing] = useState<PrivacyItem | null>(null);
  const [profileSheet, setProfileSheet] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function done(next?: PrivacyState) {
    if (next) setState(next);
    setError(null);
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 2200);
  }
  const fail = () => setError("Não foi possível salvar agora. Tente de novo.");

  async function saveScope(scope: PrivacyScope, ids: string[]) {
    if (!editing) return false;
    const { data, error: err } = await supabase.rpc("set_privacy", {
      p_key: editing.key,
      p_scope: scope,
      p_allow: scope === "selected" ? ids : [],
      p_deny: scope === "friends_except" ? ids : [],
    });
    if (err || !data) {
      fail();
      return false;
    }
    done(data as unknown as PrivacyState);
    return true;
  }

  async function setFlag(flag: "isPrivate" | "discoverable", value: boolean) {
    setBusy(flag);
    const { data: auth } = await supabase.auth.getUser();
    const patch = flag === "isPrivate" ? { isPrivate: value } : { discoverable: value };
    const { error: err } = await supabase.from("User").update(patch).eq("id", auth.user?.id ?? "");
    setBusy(null);
    if (err) return fail();
    setState((s) => ({ ...s, [flag]: value }));
    done();
  }

  async function setInvisible(value: boolean) {
    setBusy("invisible");
    const { error: err } = await supabase.rpc("presence_set_mode", { p_mode: value ? "invisible" : "auto" });
    setBusy(null);
    if (err) return fail();
    setState((s) => ({ ...s, invisible: value }));
    done();
  }

  async function personalSpace(on: boolean) {
    setBusy("space");
    const { data, error: err } = await supabase.rpc("set_personal_space", { p_on: on });
    setBusy(null);
    if (err || !data) return fail();
    done(data as unknown as PrivacyState);
  }

  const spaceOn = !!state.personalSpaceUntil && new Date(state.personalSpaceUntil) > new Date();

  return (
    <div className="space-y-6">
      <div className="pointer-events-none sticky top-16 z-20 -mb-4 flex h-0 justify-end md:top-20">
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

      <section className="overflow-hidden rounded-2xl border border-orbit-purple/25 bg-gradient-to-br from-orbit-purple/15 via-space-surface/90 to-space-surface/90 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orbit-gradient text-snow shadow-glow">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-white">Modo Espaço Pessoal</h2>
            <p className="mt-0.5 text-sm text-white/65">
              Uma semana sem atenção indesejada: quem não é seu amigo não comenta, não marca, não liga e não convida você. Pedidos de amizade só de amigos de amigos.
            </p>
            {spaceOn && <p className="mt-2 text-xs font-semibold text-emerald-300">Ativo até {untilLabel(state.personalSpaceUntil!)}</p>}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => personalSpace(!spaceOn)}
            disabled={busy === "space"}
            className={clsx(
              "flex min-h-[40px] items-center gap-2 rounded-full px-5 text-sm font-semibold transition disabled:opacity-50",
              spaceOn ? "border border-white/15 text-white/85 hover:bg-white/5" : "bg-orbit-gradient text-snow shadow-glow hover:opacity-90"
            )}
          >
            {busy === "space" && <Loader2 className="h-4 w-4 animate-spin" />}
            {spaceOn ? "Desativar" : "Ativar por 7 dias"}
          </button>
        </div>
      </section>

      {PRIVACY_GROUPS.map((g) => (
        <Group key={g.title} title={g.title}>
          {g.items.map((item) => (
            <Row key={item.key} label={item.label} hint={item.hint} value={valueLabel(state.settings[item.key], item.action)} onClick={() => setEditing(item)} />
          ))}
        </Group>
      ))}

      <Group title="Outros">
        <Row
          label="Tipo de perfil"
          hint={state.isPrivate ? "Você aprova cada pedido para seguir" : "Qualquer pessoa com conta pode seguir você"}
          value={state.isPrivate ? "Privado" : "Público"}
          onClick={() => setProfileSheet(true)}
        />
        <div className="flex items-center gap-3 px-4 py-3.5">
          <UserSearch className="h-5 w-5 shrink-0 text-white/45" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-white">Aparecer na busca do Órbita X</span>
            <span className="mt-0.5 block text-xs text-white/45">Desligado, só encontram você pelo seu @</span>
          </span>
          <Switch checked={state.discoverable} onChange={(v) => setFlag("discoverable", v)} label="Aparecer na busca do Órbita X" disabled={busy === "discoverable"} />
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <EyeOff className="h-5 w-5 shrink-0 text-white/45" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-white">Ficar invisível</span>
            <span className="mt-0.5 block text-xs text-white/45">Ninguém vê quando você está online</span>
          </span>
          <Switch checked={state.invisible} onChange={setInvisible} label="Ficar invisível" disabled={busy === "invisible"} />
        </div>
      </Group>

      <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-white/45">
        <ShieldHalf className="mt-0.5 h-4 w-4 shrink-0" />
        Quem você bloquear não vê nada disso, independentemente do que estiver escolhido aqui. O que aparece no perfil (idade, signo, cidade…) você escolhe em Minha conta.
      </p>

      <ScopeSheet item={editing} value={editing ? state.settings[editing.key] : null} onClose={() => setEditing(null)} onSave={saveScope} />

      <Sheet open={profileSheet} onClose={() => setProfileSheet(false)} title="Tipo de perfil">
        <div className="space-y-2 pb-1">
          {[
            { v: false, title: "Público", desc: "Qualquer pessoa com conta no Órbita X pode seguir você." },
            { v: true, title: "Privado", desc: "Para seguir você é preciso pedir, e você aprova cada pedido. Suas histórias ficam só para amigos e seguidores aprovados." },
          ].map((o) => (
            <button
              key={o.title}
              type="button"
              disabled={busy === "isPrivate"}
              onClick={async () => {
                if (o.v !== state.isPrivate) await setFlag("isPrivate", o.v);
                setProfileSheet(false);
              }}
              className={clsx(
                "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition",
                state.isPrivate === o.v ? "border-orbit-purple/60 bg-orbit-purple/10" : "border-white/10 hover:bg-white/5"
              )}
            >
              <Lock className={clsx("mt-0.5 h-5 w-5 shrink-0", state.isPrivate === o.v ? "text-orbit-cyan" : "text-white/40")} />
              <span>
                <span className="block text-sm font-semibold text-white">{o.title}</span>
                <span className="mt-0.5 block text-xs text-white/55">{o.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
