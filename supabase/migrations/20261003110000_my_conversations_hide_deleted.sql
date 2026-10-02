-- Mensagem apagada para todos some da conversa: a prévia da lista passa a mostrar a última
-- mensagem que ainda existe (em vez de "Mensagem apagada").
create or replace function public.my_conversations()
 returns table(id text, "isGroup" boolean, "isSaved" boolean, name text, "avatarUrl" text, description text, "memberCount" integer, role text, "archivedAt" timestamp without time zone, "mutedUntil" timestamp without time zone, theme text, wallpaper text, "messageTtlSeconds" integer, "othersReadAt" timestamp without time zone, "otherUser" jsonb, "lastMessage" jsonb, unread integer, "sortAt" timestamp without time zone, "sendStatus" text)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select
    c.id, c."isGroup", c."isSaved", c.name, c."avatarUrl", c.description,
    (select count(*)::int from "ConversationMember" x where x."conversationId" = c.id),
    me.role, s."archivedAt", s."mutedUntil", s.theme, s.wallpaper, c."messageTtlSeconds",
    (select min(coalesce(o."lastReadAt", o."createdAt")) from "ConversationMember" o
      where o."conversationId" = c.id and o."userId" <> me."userId"),
    case when not c."isGroup" and not c."isSaved" then (
      select jsonb_build_object('id', u.id, 'name', u.name, 'username', u.username, 'avatarUrl', u."avatarUrl",
                                'presence', u.presence, 'lastSeenAt', u."lastSeenAt", 'avatarFrame', u."avatarFrame",
                                'isVerified', u."isVerified")
        from "ConversationMember" o join "User" u on u.id = o."userId"
       where o."conversationId" = c.id and o."userId" <> me."userId" limit 1)
    end,
    (select jsonb_build_object('id', m.id, 'senderId', m."senderId", 'senderName', su.name, 'type', m.type,
                               'preview', public.message_preview(m.type, m.content, m.meta, m.attachments),
                               'createdAt', m."createdAt", 'deliveredAt', m."deliveredAt", 'deleted', false)
       from "Message" m left join "User" su on su.id = m."senderId"
      where m."conversationId" = c.id
        and m."deletedAt" is null
        and (m."expiresAt" is null or m."expiresAt" > now())
        and (s."clearedAt" is null or m."createdAt" > s."clearedAt")
        and not exists (select 1 from "MessageHidden" h where h."messageId" = m.id and h."userId" = me."userId")
      order by m."createdAt" desc limit 1),
    (select count(*)::int from "Message" m
      where m."conversationId" = c.id and m."senderId" <> me."userId" and m.type <> 'system'
        and m."createdAt" > greatest(coalesce(me."lastReadAt", me."createdAt"), coalesce(s."clearedAt", '-infinity'))
        and m."deletedAt" is null and (m."expiresAt" is null or m."expiresAt" > now())),
    coalesce(c."lastMessageAt", c."createdAt"),
    public.conversation_send_status(c.id)
  from "ConversationMember" me
  join "Conversation" c on c.id = me."conversationId"
  left join "ConversationSetting" s on s."conversationId" = c.id and s."userId" = me."userId"
  where me."userId" = auth.uid()::text
    and (c."isSaved" or s."clearedAt" is null or coalesce(c."lastMessageAt", c."createdAt") > s."clearedAt")
  order by c."isSaved" desc, coalesce(c."lastMessageAt", c."createdAt") desc
$function$;
