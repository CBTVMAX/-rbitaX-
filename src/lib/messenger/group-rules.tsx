"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Configurações do chat no modelo do VK: quem pode convidar, editar os dados, fixar mensagens,
 * chamar @todos, ver o link do chat e nomear administradores; proibição de encaminhar; avisos do
 * sistema; mensagem fixada. Tudo vem resolvido do servidor (`group_config`) — a tela só desenha.
 */
export type GroupPermKey = "invite" | "edit" | "pin" | "mentions" | "link" | "add_admins";
export type GroupPermLevel = "all" | "admins" | "owner";

export type PinnedMessage = { id: string; type: string; senderId: string; senderName: string | null; preview: string; createdAt?: string };

export type GroupConfig = {
  permissions: Record<GroupPermKey, GroupPermLevel>;
  can: Record<GroupPermKey, boolean>;
  noForward: boolean;
  systemMessages: boolean;
  pinned: PinnedMessage | null;
};

export const PERMISSION_ROWS: { key: GroupPermKey; label: string; hint: string }[] = [
  { key: "invite", label: "Convite dos participantes", hint: "Quem pode adicionar pessoas ao chat" },
  { key: "edit", label: "Edição de dados", hint: "Quem muda o nome, a foto e a descrição" },
  { key: "pin", label: "Fixação de mensagens", hint: "Quem fixa mensagens no topo do chat" },
  { key: "mentions", label: "Menções em massa", hint: "Quem pode usar @todos" },
  { key: "link", label: "Recebimento do link para o chat", hint: "Quem vê e compartilha o link de convite" },
  { key: "add_admins", label: "Adição de administradores", hint: "Quem pode nomear novos administradores" },
];

export function levelLabel(level: GroupPermLevel) {
  return level === "all" ? "Todos os participantes" : level === "admins" ? "Administradores" : "Só o criador";
}

type Client = SupabaseClient<Database>;

/** Carrega a configuração e acompanha mudanças da conversa em tempo real (regras, fixada). */
export function useGroupConfig(supabase: Client, conversationId: string, enabled: boolean, role?: string | null) {
  const [config, setConfig] = useState<GroupConfig | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    const { data, error } = await supabase.rpc("group_config", { p_conversation_id: conversationId });
    if (!error && data) setConfig(data as unknown as GroupConfig);
    // O papel na conversa (virou admin, deixou de ser) muda o que a pessoa pode fazer: recarrega.
  }, [supabase, conversationId, enabled, role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setConfig(null);
  }, [conversationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // A conversa também muda a cada mensagem (lastMessageAt): só recarrega quando algo das regras mudou.
  const signature = useRef("");
  useEffect(() => {
    if (!enabled) return;
    signature.current = "";
    const channel = supabase
      .channel(`conv-config:${conversationId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Conversation", filter: `id=eq.${conversationId}` }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        const next = JSON.stringify([row.pinnedMessageId, row.noForward, row.systemMessages, row.groupPermissions, row.name, row.avatarUrl]);
        if (signature.current && signature.current === next) return;
        signature.current = next;
        reload();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, enabled, reload]);

  return { config, reload, setConfig };
}

/** O que os menus das mensagens e a lista precisam saber sem passar props por todas as camadas. */
export type ChatRules = {
  canPin: boolean;
  pinnedId: string | null;
  noForward: boolean;
  systemMessages: boolean;
};

const ChatRulesContext = createContext<ChatRules>({ canPin: false, pinnedId: null, noForward: false, systemMessages: true });

export const ChatRulesProvider = ChatRulesContext.Provider;

export function useChatRules() {
  return useContext(ChatRulesContext);
}
