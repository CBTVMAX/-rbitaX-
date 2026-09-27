"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Loader2, ScrollText } from "lucide-react";
import { Avatar } from "@/components/post-card";
import { ago, ROLE_LABEL, type Role } from "@/lib/communities";
import { useCommunity } from "../context";
import { EmptyState } from "../ui";
import { Card } from "./fields";

type Row = {
  id: number;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
  actor: { name: string; username: string; avatarUrl: string | null } | null;
};
type Group = "todos" | "membros" | "conteudo" | "config";
const GROUPS: { id: Group; label: string; match: (a: string) => boolean }[] = [
  { id: "todos", label: "Tudo", match: () => true },
  { id: "membros", label: "Membros", match: (a) => a.startsWith("member_") || a.startsWith("role_") || a.startsWith("request_") },
  { id: "conteudo", label: "Conteúdo", match: (a) => /^(post_|discussion_|album_|event_|story_|report_)/.test(a) },
  { id: "config", label: "Configurações", match: (a) => a === "settings_update" },
];
const SETTING: Record<string, string> = {
  name: "nome",
  username: "@",
  description: "descrição",
  category: "categoria",
  avatar: "foto",
  cover: "capa",
  theme: "tema",
  rules: "regras",
  links: "links",
  privacy: "privacidade",
  permissions: "permissões",
  moderation: "moderação",
  notifications: "notificações",
};
const PAGE = 40;

function describe(r: Row, who: (id: string | null) => string) {
  const d = r.details ?? {};
  const t = who(r.targetId);
  const q = (k: string) => (typeof d[k] === "string" && d[k] ? `“${String(d[k]).slice(0, 60)}”` : "");
  const role = (k: string) => (ROLE_LABEL[d[k] as Role] ?? String(d[k] ?? "")).toLowerCase();
  switch (r.action) {
    case "role_change":
      return `mudou o cargo de ${t}: ${role("from")} → ${role("to")}`;
    case "member_remove":
      return `removeu ${t} da comunidade`;
    case "member_ban":
      return `bloqueou ${t}${d.reason ? ` (motivo: ${String(d.reason)})` : ""}`;
    case "member_unban":
      return `desbloqueou ${t}`;
    case "member_mute":
      return `silenciou ${t}${d.until ? ` até ${new Date(String(d.until)).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : " sem prazo"}`;
    case "member_unmute":
      return `removeu o silêncio de ${t}`;
    case "request_approved":
      return `aprovou o pedido de ${t}`;
    case "request_rejected":
      return `recusou o pedido de ${t}`;
    case "settings_update":
      return `alterou ${((d.changed as string[]) ?? []).map((c) => SETTING[c] ?? c).join(", ") || "as configurações"}`;
    case "post_pin":
      return `fixou a publicação ${q("excerpt")}`;
    case "post_unpin":
      return `desafixou a publicação ${q("excerpt")}`;
    case "post_visible":
      return `aprovou/restaurou a publicação ${q("excerpt")}`;
    case "post_removed":
      return `removeu a publicação ${q("excerpt")}`;
    case "post_pending":
      return `enviou para revisão a publicação ${q("excerpt")}`;
    case "post_delete":
      return `excluiu a publicação ${q("excerpt")} de outro membro`;
    case "discussion_pin":
      return `fixou a discussão ${q("title")}`;
    case "discussion_unpin":
      return `desafixou a discussão ${q("title")}`;
    case "discussion_close":
      return `fechou a discussão ${q("title")}`;
    case "discussion_open":
      return `reabriu a discussão ${q("title")}`;
    case "discussion_visible":
      return `aprovou/restaurou a discussão ${q("title")}`;
    case "discussion_removed":
      return `removeu a discussão ${q("title")}`;
    case "discussion_delete":
      return `excluiu a discussão ${q("title")}`;
    case "album_create":
      return `criou o álbum ${q("title")}`;
    case "album_delete":
      return `excluiu o álbum ${q("title")}`;
    case "event_create":
      return `criou o evento ${q("title")}`;
    case "event_update":
      return `editou o evento ${q("title")}`;
    case "event_cancel":
      return `cancelou o evento ${q("title")}`;
    case "event_restore":
      return `reativou o evento ${q("title")}`;
    case "event_delete":
      return `excluiu o evento ${q("title")}`;
    case "story_create":
      return "publicou uma história";
    case "story_delete":
      return "excluiu uma história de outro membro";
    default:
      if (r.action.startsWith("report_")) return `marcou uma denúncia como ${r.action === "report_dismissed" ? "descartada" : "resolvida"}${d.reason ? ` (${String(d.reason)})` : ""}`;
      return r.action;
  }
}

/** Who did what and when — every sensitive action is written by the database itself (not by the app). */
export function LogSection() {
  const { supabase, community } = useCommunity();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [group, setGroup] = useState<Group>("todos");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load(offset: number) {
    setLoading(true);
    const { data } = await supabase
      .from("CommunityActionLog")
      .select("id, action, targetType, targetId, details, createdAt, actor:User!CommunityActionLog_actorId_fkey(name, username, avatarUrl)")
      .eq("communityId", community.id)
      .order("createdAt", { ascending: false })
      .range(offset, offset + PAGE - 1);
    const list = (data ?? []) as unknown as Row[];
    const ids = Array.from(new Set(list.filter((r) => r.targetType === "user" && r.targetId && !names[r.targetId]).map((r) => r.targetId!)));
    if (ids.length) {
      const { data: users } = await supabase.from("User").select("id, name").in("id", ids);
      setNames((n) => ({ ...n, ...Object.fromEntries((users ?? []).map((u) => [u.id, u.name])) }));
    }
    setRows((l) => (offset ? [...(l ?? []), ...list] : list));
    setDone(list.length < PAGE);
    setLoading(false);
  }
  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const who = (id: string | null) => (id && names[id]) || "um membro";
  const shown = (rows ?? []).filter((r) => GROUPS.find((g) => g.id === group)!.match(r.action));

  return (
    <div className="space-y-4">
      <Card title="Registro de ações" desc="Cargos, remoções, bloqueios, silenciamentos, moderação, eventos e mudanças nas configurações. Visível para administradores e proprietário.">
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button key={g.id} type="button" onClick={() => setGroup(g.id)} className={clsx("rounded-full px-4 py-2 text-xs font-semibold", group === g.id ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}>
              {g.label}
            </button>
          ))}
        </div>
      </Card>
      {rows === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      ) : shown.length === 0 ? (
        <EmptyState icon={<ScrollText className="h-6 w-6" />} title="Nenhuma ação registrada" text="As ações da equipe aparecem aqui assim que acontecem." />
      ) : (
        <ol className="divide-y divide-white/[0.05] overflow-hidden rounded-3xl border border-white/[0.08] bg-space-card/70">
          {shown.map((r) => (
            <li key={r.id} className="flex items-start gap-3 px-4 py-3">
              {r.actor ? <Avatar name={r.actor.name} url={r.actor.avatarUrl} size={34} /> : <span className="h-[34px] w-[34px] shrink-0 rounded-full bg-white/10" />}
              <p className="min-w-0 flex-1 text-sm text-white/75">
                {r.actor ? (
                  <Link href={`/perfil/${r.actor.username}`} className="font-semibold text-white hover:underline">
                    {r.actor.name}
                  </Link>
                ) : (
                  <span className="font-semibold text-white">Sistema</span>
                )}{" "}
                {describe(r, who)}
                <span className="mt-0.5 block text-[11px] text-white/40" title={new Date(r.createdAt).toLocaleString("pt-BR")}>
                  {ago(r.createdAt)}
                </span>
              </p>
            </li>
          ))}
        </ol>
      )}
      {!done && rows && (
        <button type="button" onClick={() => load(rows.length)} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 text-sm font-semibold text-white/75 hover:bg-white/5">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Carregar mais
        </button>
      )}
    </div>
  );
}
