"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  AtSign,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Link2,
  Loader2,
  MessageSquareText,
  PenLine,
  Pin,
  RefreshCw,
  Share2,
  ShieldBan,
  ShieldPlus,
  UserPlus,
} from "lucide-react";
import {
  levelLabel,
  PERMISSION_ROWS,
  type GroupConfig,
  type GroupPermKey,
  type GroupPermLevel,
} from "@/lib/messenger/group-rules";
import type { Conversation } from "@/lib/messenger/types";
import { useMessenger } from "./context";
import { ConversationAvatar, GhostButton, Modal, Popover } from "./ui";

const PERM_ICONS: Record<GroupPermKey, React.ComponentType<{ className?: string }>> = {
  invite: UserPlus,
  edit: PenLine,
  pin: Pin,
  mentions: AtSign,
  link: Link2,
  add_admins: ShieldPlus,
};

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={clsx(
        "relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors disabled:opacity-50",
        on ? "bg-chat" : "bg-white/15"
      )}
    >
      <span className={clsx("absolute top-[3px] h-5 w-5 rounded-full bg-snow shadow transition-all", on ? "left-[21px]" : "left-[3px]")} />
    </button>
  );
}

function SettingRow({
  icon: Icon,
  label,
  value,
  hint,
  onClick,
  right,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  hint?: string;
  onClick?: () => void;
  right?: React.ReactNode;
  disabled?: boolean;
}) {
  const body = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-chat/15 text-chat">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-white/90">{label}</span>
        {value && <span className="block truncate text-[13px] text-chat">{value}</span>}
        {hint && <span className="block text-xs leading-snug text-white/45">{hint}</span>}
      </span>
      {right}
    </>
  );
  if (!onClick) return <div className="flex items-center gap-3 px-4 py-3">{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04] disabled:cursor-default disabled:hover:bg-transparent"
    >
      {body}
    </button>
  );
}

/**
 * "Configurações do chat" (só dono e administradores), no modelo do VK: cada regra mostra quem pode
 * — Todos os participantes ou Administradores — e abre a escolha ao tocar.
 */
export function GroupChatSettings({
  c,
  config,
  onClose,
  onEdit,
  onChanged,
}: {
  c: Conversation;
  config: GroupConfig | null;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const { supabase, toast } = useMessenger();
  const [local, setLocal] = useState<GroupConfig | null>(config);
  const [picker, setPicker] = useState<GroupPermKey | null>(null);
  const owner = c.role === "owner";

  useEffect(() => setLocal(config), [config]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !picker && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, picker]);

  async function setLevel(key: GroupPermKey, level: GroupPermLevel) {
    setPicker(null);
    if (!local || local.permissions[key] === level) return;
    setLocal({ ...local, permissions: { ...local.permissions, [key]: level } });
    const { error } = await supabase.rpc("set_group_permissions", { p_conversation_id: c.id, p_patch: { [key]: level } });
    if (error) {
      toast(/owner_only/.test(error.message) ? "Só o criador do chat muda isso." : "Não foi possível salvar.", "error");
      setLocal(config);
    }
    onChanged();
  }

  async function setNoForward(on: boolean) {
    if (!local) return;
    setLocal({ ...local, noForward: on });
    const { error } = await supabase.rpc("set_group_permissions", { p_conversation_id: c.id, p_patch: {}, p_no_forward: on });
    if (error) {
      toast("Não foi possível salvar.", "error");
      setLocal(config);
    } else toast(on ? "Encaminhamento proibido neste chat." : "Encaminhamento liberado.");
    onChanged();
  }

  async function setSystemMessages(on: boolean) {
    if (!local) return;
    setLocal({ ...local, systemMessages: on });
    const { error } = await supabase.rpc("set_group_system_messages", { p_conversation_id: c.id, p_on: on });
    if (error) {
      toast("Não foi possível salvar.", "error");
      setLocal(config);
    }
    onChanged();
  }

  return (
    <div className="animate-pop-in absolute inset-0 z-20 flex flex-col bg-space-surface" role="dialog" aria-label="Configurações do chat">
      <div className="flex min-h-[56px] items-center gap-1 border-b border-white/[0.07] px-2">
        <button type="button" onClick={onClose} aria-label="Voltar" className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition hover:bg-white/[0.06] hover:text-white">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="text-[17px] font-semibold text-white">Configurações do chat</h2>
      </div>

      <div className="orbit-scrollbar min-h-0 flex-1 overflow-y-auto pb-8">
        <button type="button" onClick={onEdit} className="flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-white/[0.04]">
          <ConversationAvatar c={c} size={60} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-semibold text-white">{c.name || "Grupo"}</span>
            <span className="block text-[13px] text-chat">Alterar nome, foto e descrição</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </button>

        {!local ? (
          <Loader2 className="mx-auto mt-8 h-6 w-6 animate-spin text-white/35" />
        ) : (
          <>
            <div className="mx-3 mt-2 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
              <p className="px-4 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-wider text-white/40">Quem pode</p>
              {PERMISSION_ROWS.map((row) => {
                const ownerOnlyRow = row.key === "add_admins";
                const locked = ownerOnlyRow && !owner;
                return (
                  <div key={row.key} className="relative">
                    <SettingRow
                      icon={PERM_ICONS[row.key]}
                      label={row.label}
                      value={levelLabel(local.permissions[row.key])}
                      hint={locked ? "Só o criador do chat muda isso" : undefined}
                      onClick={locked ? undefined : () => setPicker((p) => (p === row.key ? null : row.key))}
                      right={!locked ? <ChevronRight className="h-4 w-4 shrink-0 text-white/30" /> : undefined}
                    />
                    <Popover open={picker === row.key} onClose={() => setPicker(null)} className="left-4 right-4 top-[calc(100%-6px)]">
                      <p className="px-4 pb-1.5 pt-2 text-xs text-white/45">{row.hint}</p>
                      {(ownerOnlyRow ? (["admins", "owner"] as const) : (["all", "admins"] as const)).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setLevel(row.key, level)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-white/85 transition hover:bg-white/[0.06]"
                        >
                          {levelLabel(level)}
                          {local.permissions[row.key] === level && <Check className="h-4 w-4 text-chat" />}
                        </button>
                      ))}
                    </Popover>
                  </div>
                );
              })}
            </div>

            <div className="mx-3 mt-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
              <SettingRow
                icon={ShieldBan}
                label="Proibição de encaminhamento"
                hint="Ninguém copia, salva, baixa ou encaminha as mensagens dos outros."
                right={<Switch on={local.noForward} onChange={setNoForward} label="Proibição de encaminhamento" />}
              />
              <SettingRow
                icon={MessageSquareText}
                label="Mensagens do sistema no chat"
                hint="Avisos como entrou, saiu, mudou o nome e fixou uma mensagem."
                right={<Switch on={local.systemMessages} onChange={setSystemMessages} label="Mensagens do sistema no chat" />}
              />
            </div>
            <p className="mx-6 mt-3 text-xs leading-relaxed text-white/40">
              O criador sempre pode tudo. Administradores seguem as regras marcadas como “Administradores”.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** "Link para o chat": quem tem a permissão vê, copia e compartilha; dono/admins geram um novo. */
export function ChatLinkDialog({ open, onClose, c }: { open: boolean; onClose: () => void; c: Conversation }) {
  const { supabase, toast } = useMessenger();
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const canReset = c.role === "owner" || c.role === "admin";
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setConfirmReset(false);
    let alive = true;
    supabase.rpc("group_invite_code", { p_conversation_id: c.id }).then(({ data, error }) => {
      if (!alive) return;
      if (error || !data) {
        toast("Você não tem acesso ao link deste chat.", "error");
        closeRef.current();
      } else setCode(data);
    });
    return () => {
      alive = false;
    };
  }, [open, c.id, supabase, toast]);

  const url = code ? `${typeof window === "undefined" ? "" : window.location.origin}/convite/${code}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Link copiado.");
    } catch {
      toast("Não foi possível copiar.", "error");
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: c.name ?? "Chat no ÓrbitaX", text: `Entre no chat “${c.name ?? "Grupo"}” no ÓrbitaX`, url });
      } catch {
        /* cancelado */
      }
    } else copy();
  }

  async function reset() {
    setConfirmReset(false);
    setBusy(true);
    const { data, error } = await supabase.rpc("group_invite_code", { p_conversation_id: c.id, p_reset: true });
    setBusy(false);
    if (error || !data) return toast("Não foi possível gerar um novo link.", "error");
    setCode(data);
    setCopied(false);
    toast("Novo link criado. O anterior não funciona mais.");
  }

  return (
    <Modal open={open} onClose={onClose} title="Link para o chat" size="sm">
      <p className="text-sm text-white/55">Quem abrir este link entra direto no chat “{c.name || "Grupo"}”.</p>
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
        <Link2 className="h-4 w-4 shrink-0 text-chat" />
        {code ? (
          <span className="min-w-0 flex-1 select-all truncate text-sm text-white">{url.replace(/^https?:\/\//, "")}</span>
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-white/40" />
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!code}
          onClick={copy}
          className="flex items-center justify-center gap-2 rounded-full bg-chat py-2.5 text-sm font-semibold text-snow transition hover:brightness-110 disabled:opacity-50"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copiado" : "Copiar"}
        </button>
        <button
          type="button"
          disabled={!code}
          onClick={share}
          className="flex items-center justify-center gap-2 rounded-full border border-white/15 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/[0.05] disabled:opacity-50"
        >
          <Share2 className="h-4 w-4" /> Compartilhar
        </button>
      </div>
      {canReset &&
        (confirmReset ? (
          <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/[0.06] p-3">
            <p className="text-xs text-white/65">O link atual deixa de funcionar para todo mundo. Continuar?</p>
            <div className="mt-2 flex justify-end gap-2">
              <GhostButton onClick={() => setConfirmReset(false)}>Cancelar</GhostButton>
              <button type="button" onClick={reset} className="rounded-full bg-red-500/90 px-4 py-2 text-sm font-semibold text-snow hover:bg-red-500">
                Gerar novo
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy || !code}
            onClick={() => setConfirmReset(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-medium text-white/55 transition hover:text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Gerar novo link
          </button>
        ))}
    </Modal>
  );
}
