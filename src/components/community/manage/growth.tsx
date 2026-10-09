"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  Check,
  ChevronRight,
  Globe2,
  Mail,
  MessageCircle,
  Phone,
  ShieldAlert,
} from "lucide-react";
import {
  communityError,
  type CommunityCta,
  type CommunityCtaType,
} from "@/lib/communities";
import { useCommunity } from "../context";
import { Card, Field, inputCls, SaveButton, Toggle } from "./fields";

const TYPES: {
  id: CommunityCtaType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  field?: {
    label: string;
    placeholder: string;
    inputMode?: "url" | "tel" | "email";
  };
}[] = [
  { id: "message", label: "Escrever mensagem", icon: MessageCircle },
  {
    id: "site",
    label: "Abrir site",
    icon: Globe2,
    field: {
      label: "Endereço do site",
      placeholder: "https://seusite.com.br",
      inputMode: "url",
    },
  },
  {
    id: "whatsapp",
    label: "Abrir WhatsApp",
    icon: MessageCircle,
    field: {
      label: "Número do WhatsApp (com DDD)",
      placeholder: "(71) 99999-0000",
      inputMode: "tel",
    },
  },
  {
    id: "phone",
    label: "Ligar",
    icon: Phone,
    field: {
      label: "Telefone (com DDD)",
      placeholder: "(71) 3333-0000",
      inputMode: "tel",
    },
  },
  {
    id: "email",
    label: "Enviar e-mail",
    icon: Mail,
    field: {
      label: "E-mail",
      placeholder: "contato@seudominio.com.br",
      inputMode: "email",
    },
  },
];

/** Botão de ação no topo da comunidade, como no VK, e os cliques que ele recebeu. */
export function ActionButtonSection({
  onSaved,
}: {
  onSaved: (cta: CommunityCta | null) => void;
}) {
  const { community, supabase, toast } = useCommunity();
  const initial = community.cta ?? null;
  const [enabled, setEnabled] = useState(!!initial?.enabled);
  const [type, setType] = useState<CommunityCtaType>(
    initial?.type ?? "message",
  );
  const [target, setTarget] = useState(initial?.target ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [busy, setBusy] = useState(false);
  const [clicks, setClicks] = useState<{
    clicks: number;
    people: number;
  } | null>(null);
  const def = TYPES.find((t) => t.id === type)!;

  useEffect(() => {
    supabase
      .rpc("community_cta_stats", { p_community: community.id, p_days: 30 })
      .then(
        ({ data }) =>
          data &&
          setClicks(data as unknown as { clicks: number; people: number }),
      );
  }, [supabase, community.id]);

  async function save() {
    setBusy(true);
    const { data, error } = await supabase.rpc("community_set_cta", {
      p_community: community.id,
      p_cta: (enabled
        ? { enabled: true, type, target, label }
        : { enabled: false }) as never,
    });
    setBusy(false);
    if (error) {
      if (/invalid_target/.test(error.message))
        return toast(
          type === "site"
            ? "Use um endereço completo começando com https://"
            : type === "email"
              ? "Confira o e-mail."
              : "Confira o número: DDD + telefone.",
          true,
        );
      return toast(communityError(error.message), true);
    }
    const next = data as unknown as CommunityCta;
    if (next?.label) setLabel(next.label);
    if (next?.target !== undefined) setTarget(next.target ?? "");
    onSaved(next);
    toast("Botão de ação salvo.");
  }

  const preview =
    label.trim() || (type === "message" ? "Enviar mensagem" : def.label);

  return (
    <div className="space-y-4">
      <Card
        title="Botão de ação"
        desc="Um botão em destaque no topo da comunidade, ao lado de Seguir: para conversar, visitar seu site, chamar no WhatsApp, ligar ou mandar e-mail."
      >
        <Toggle
          checked={enabled}
          onChange={setEnabled}
          label="Mostrar o botão de ação"
        />
        {enabled && (
          <div className="mt-3 space-y-4">
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
                Tipo de ação
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      aria-pressed={type === t.id}
                      className={clsx(
                        "flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left text-sm transition",
                        type === t.id
                          ? "border-orbit-purple/60 bg-orbit-purple/10 text-white"
                          : "border-white/10 text-white/75 hover:bg-white/[0.04]",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-orbit-cyan" />{" "}
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {def.field && (
              <Field label={def.field.label}>
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  inputMode={def.field.inputMode}
                  placeholder={def.field.placeholder}
                  maxLength={300}
                  className={inputCls}
                />
              </Field>
            )}
            {type === "message" && (
              <p className="text-xs text-white/50">
                Abre a conversa com a comunidade no Messenger.
              </p>
            )}
            <Field
              label="Texto do botão"
              hint="Até 30 caracteres. Em branco, usamos um texto padrão."
            >
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={30}
                placeholder={type === "message" ? "Enviar mensagem" : def.label}
                className={inputCls}
              />
            </Field>
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-white/10 p-3">
              <span className="text-xs text-white/45">Prévia</span>
              <span className="rounded-xl bg-orbit-gradient px-4 py-2 text-sm font-semibold text-snow shadow-glow">
                {preview}
              </span>
            </div>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <SaveButton busy={busy} onClick={save} />
        </div>
      </Card>
      <Card
        title="Cliques no botão"
        desc="Últimos 30 dias. Cada pessoa conta uma vez por dia."
      >
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-white/50">Cliques</p>
            <p className="mt-1 font-display text-2xl font-semibold text-white">
              {clicks ? clicks.clicks.toLocaleString("pt-BR") : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-white/50">Pessoas</p>
            <p className="mt-1 font-display text-2xl font-semibold text-white">
              {clicks ? clicks.people.toLocaleString("pt-BR") : "—"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Restrição por idade (fica em Privacidade). */
export function AgeLimitCard({
  onSaved,
}: {
  onSaved: (limit: number) => void;
}) {
  const { community, supabase, toast } = useCommunity();
  const [value, setValue] = useState(community.ageLimit ?? 0);
  const [busy, setBusy] = useState(false);
  async function pick(limit: number) {
    if (limit === value) return;
    setBusy(true);
    const { error } = await supabase.rpc("community_set_age_limit", {
      p_community: community.id,
      p_limit: limit,
    });
    setBusy(false);
    if (error) return toast(communityError(error.message), true);
    setValue(limit);
    onSaved(limit);
    toast(
      limit
        ? `Comunidade marcada como ${limit}+.`
        : "Restrição por idade removida.",
    );
  }
  return (
    <Card
      title="Restrição por idade"
      desc="Comunidades 16+ e 18+ não aparecem nas recomendações nem na busca, e quem tem menos idade (ou não informou a data de nascimento) vê um aviso em vez do conteúdo."
    >
      <div
        role="radiogroup"
        aria-label="Restrição por idade"
        className="flex flex-wrap gap-2"
      >
        {[
          { v: 0, label: "Sem limites" },
          { v: 16, label: "16+" },
          { v: 18, label: "18+" },
        ].map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={value === o.v}
            disabled={busy}
            onClick={() => pick(o.v)}
            className={clsx(
              "rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60",
              value === o.v
                ? "bg-orbit-gradient text-snow"
                : "border border-white/12 text-white/70 hover:text-white",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

type Mission = {
  id: string;
  title: string;
  done: boolean;
  action: string;
  href: string;
};

/** Lista de verificação ("Recomendações" do VK): missões para a comunidade crescer. */
export function ChecklistSection({ base }: { base: string }) {
  const { community, supabase } = useCommunity();
  const [counts, setCounts] = useState<{
    posts: number;
    events: number;
    discussions: number;
    contacts: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [posts, events, discussions, row] = await Promise.all([
          supabase
            .from("Post")
            .select("id", { count: "exact", head: true })
            .eq("communityId", community.id),
          supabase
            .from("CommunityEvent")
            .select("id", { count: "exact", head: true })
            .eq("communityId", community.id),
          supabase
            .from("CommunityDiscussion")
            .select("id", { count: "exact", head: true })
            .eq("communityId", community.id),
          supabase
            .from("Community")
            .select("*")
            .eq("id", community.id)
            .maybeSingle(),
        ]);
        const contacts =
          row.data && "contacts" in row.data && Array.isArray(row.data.contacts)
            ? row.data.contacts.length
            : 0;
        setCounts({
          posts: posts.count ?? 0,
          events: events.count ?? 0,
          discussions: discussions.count ?? 0,
          contacts,
        });
      } catch {
        setCounts({ posts: 0, events: 0, discussions: 0, contacts: 0 });
      }
    })();
  }, [supabase, community.id]);

  const m = `${base}/gerenciar?secao=`;
  const steps: { title: string; missions: Mission[] }[] = [
    {
      title: "Configure a comunidade",
      missions: [
        {
          id: "avatar",
          title: "Adicione uma foto",
          done: !!community.avatarUrl,
          action: "Adicionar",
          href: `${m}personalizacao`,
        },
        {
          id: "cover",
          title: "Coloque uma capa",
          done: !!community.coverUrl,
          action: "Adicionar",
          href: `${m}personalizacao`,
        },
        {
          id: "desc",
          title: "Escreva a descrição",
          done: (community.description ?? "").trim().length >= 20,
          action: "Escrever",
          href: `${m}geral`,
        },
        {
          id: "category",
          title: "Escolha a categoria",
          done: !!community.category,
          action: "Escolher",
          href: `${m}geral`,
        },
        {
          id: "rules",
          title: "Defina as regras",
          done: !!community.rules?.trim(),
          action: "Definir",
          href: `${m}geral`,
        },
      ],
    },
    {
      title: "Primeiros membros",
      missions: [
        {
          id: "cta",
          title: "Ative o botão de ação",
          done: !!community.cta?.enabled,
          action: "Ativar",
          href: `${m}botao`,
        },
        {
          id: "links",
          title: "Monte o menu de atalhos",
          done: (community.links ?? []).length > 0,
          action: "Configurar",
          href: `${m}geral#links`,
        },
        {
          id: "first-post",
          title: "Faça a primeira publicação",
          done: (counts?.posts ?? 0) > 0,
          action: "Publicar",
          href: base,
        },
        {
          id: "members",
          title: "Chegue a 10 membros",
          done: community.memberCount >= 10,
          action: "Convidar",
          href: base,
        },
      ],
    },
    {
      title: "Movimente a comunidade",
      missions: [
        {
          id: "contacts",
          title: "Mostre os contatos da equipe",
          done: (counts?.contacts ?? 0) > 0,
          action: "Configurar",
          href: `${m}contatos`,
        },
        {
          id: "discussion",
          title: "Abra uma discussão",
          done: (counts?.discussions ?? 0) > 0,
          action: "Criar",
          href: `${base}/discussoes`,
        },
        {
          id: "event",
          title: "Crie um evento",
          done: (counts?.events ?? 0) > 0,
          action: "Criar",
          href: `${m}eventos`,
        },
      ],
    },
  ];
  const all = steps.flatMap((s) => s.missions);
  const done = counts ? all.filter((x) => x.done).length : null;

  return (
    <div className="space-y-4">
      <Card
        title="Lista de verificação"
        desc="Missões para deixar a comunidade completa e atrair membros."
      >
        <div className="flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-orbit-gradient transition-all duration-500"
              style={{
                width: `${done === null ? 0 : (done / all.length) * 100}%`,
              }}
            />
          </div>
          <span className="shrink-0 text-sm font-semibold text-white">
            {done ?? "—"} / {all.length}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-white/45">missões completas</p>
      </Card>
      {steps.map((s, i) => (
        <Card key={s.title} title={`${i + 1}. ${s.title}`}>
          <ul className="divide-y divide-white/[0.06]">
            {s.missions.map((x) => (
              <li key={x.id} className="flex items-center gap-3 py-2.5">
                <span
                  className={clsx(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    x.done
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "border border-white/15 text-white/30",
                  )}
                >
                  {x.done ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span
                  className={clsx(
                    "min-w-0 flex-1 text-sm",
                    x.done ? "text-white/45 line-through" : "text-white/90",
                  )}
                >
                  {x.title}
                </span>
                {!x.done && counts && (
                  <Link
                    href={x.href}
                    className="flex shrink-0 items-center gap-0.5 rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/5"
                  >
                    {x.action} <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

/** Aviso para quem não tem a idade mínima da comunidade. */
export function AgeGate({ limit, name }: { limit: number; name: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-300">
        <ShieldAlert className="h-8 w-8" />
      </span>
      <h1 className="mt-5 font-display text-xl font-bold text-white">
        Comunidade para maiores de {limit} anos
      </h1>
      <p className="mt-2 text-sm text-white/60">
        {name} é marcada como {limit}+. Para ver o conteúdo, a data de
        nascimento na sua conta precisa indicar {limit} anos ou mais.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/comunidades"
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/5"
        >
          Voltar para Comunidades
        </Link>
        <Link
          href="/configuracoes/conta"
          className="rounded-full bg-orbit-gradient px-5 py-2.5 text-sm font-semibold text-snow shadow-glow"
        >
          Conferir minha data de nascimento
        </Link>
      </div>
    </div>
  );
}
