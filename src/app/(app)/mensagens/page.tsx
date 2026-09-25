import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { DesktopMessenger } from "@/components/messenger/desktop-messenger";

export const dynamic = "force-dynamic";

export default async function MensagensPage({ searchParams }: { searchParams: { com?: string; c?: string } }) {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");

  const supabase = createClient();

  // "Mensagem" on a friend's profile: open (or create) the conversation with them.
  // get_or_create_dm only works between friends; otherwise the page explains why.
  let openConversationId: string | null = null;
  let blockedName: string | null = null;
  const target = searchParams.com?.trim().toLowerCase();
  if (target) {
    const { data: other } = await supabase.from("User").select("id, name").eq("username", target).maybeSingle();
    if (other && other.id !== current.authId) {
      const { data: conversationId, error } = await supabase.rpc("get_or_create_dm", { other_user_id: other.id });
      if (!error && conversationId) openConversationId = conversationId as string;
      else blockedName = other.name;
    }
  }

  // Every member has a private "Salvos" (created the first time the Messenger opens).
  await supabase.rpc("ensure_saved_chat");

  // Whole list in one round trip (last message, unread, settings, who can write).
  const { data: rows } = await supabase.rpc("my_conversations");
  const conversations = (rows ?? []) as unknown as Record<string, unknown>[];

  // Links from notifications (?c=<conversa>) open that chat when the person belongs to it.
  if (!openConversationId && searchParams.c && conversations.some((c) => c.id === searchParams.c)) {
    openConversationId = searchParams.c;
  }

  const { profile } = current;

  return (
    <DesktopMessenger
      me={{
        id: current.authId,
        name: profile.name,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        presence: profile.presence,
        avatarFrame: profile.avatarFrame,
      }}
      presence={profile.presence}
      initialConversations={conversations}
      initialActiveId={openConversationId}
      notice={
        blockedName
          ? `Você e ${blockedName} ainda não são amigos. O chat é liberado quando o pedido de amizade for aceito.`
          : null
      }
    />
  );
}
