import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { MessengerApp, type ConversationSummary } from "@/components/messenger-app";

export const dynamic = "force-dynamic";

export default async function MensagensPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");

  const supabase = createClient();

  const { data: memberships } = await supabase
    .from("ConversationMember")
    .select("conversationId")
    .eq("userId", current.authId);

  const conversationIds = (memberships ?? []).map((m) => m.conversationId);

  let conversations: ConversationSummary[] = [];

  if (conversationIds.length) {
    const { data: members } = await supabase
      .from("ConversationMember")
      .select("conversationId, user:User(id, name, username, avatarUrl)")
      .in("conversationId", conversationIds);

    const { data: lastMessages } = await supabase
      .from("Message")
      .select("id, conversationId, content, createdAt, senderId")
      .in("conversationId", conversationIds)
      .order("createdAt", { ascending: false });

    const lastByConversation = new Map<string, NonNullable<typeof lastMessages>[number]>();
    (lastMessages ?? []).forEach((m) => {
      if (!lastByConversation.has(m.conversationId)) lastByConversation.set(m.conversationId, m);
    });

    conversations = conversationIds
      .map((id) => {
        const other = (members ?? []).find(
          (m) => m.conversationId === id && (m.user as unknown as { id: string })?.id !== current.authId
        );
        const last = lastByConversation.get(id);
        return {
          id,
          otherUser: (other?.user as unknown as ConversationSummary["otherUser"]) ?? null,
          lastMessage: last ? { content: last.content, createdAt: last.createdAt } : null,
        };
      })
      .filter((c) => c.otherUser)
      .sort((a, b) => {
        const at = a.lastMessage?.createdAt ?? "";
        const bt = b.lastMessage?.createdAt ?? "";
        return bt.localeCompare(at);
      });
  }

  return (
    <MessengerApp
      currentUserId={current.authId}
      currentUserName={current.profile.name}
      initialConversations={conversations}
    />
  );
}
