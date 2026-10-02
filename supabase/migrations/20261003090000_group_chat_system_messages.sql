-- Configurações do chat (VK): "Mensagens do sistema no chat" — o dono/admins escolhem se os avisos
-- (entrou, saiu, mudou o nome, fixou...) aparecem na conversa. As mensagens continuam sendo gravadas;
-- só deixam de ser desenhadas para os membros quando a opção está desligada.
-- (Sem os operadores de seta do jsonb: o SQL pode ser colado no editor sem se corromper.)

alter table public."Conversation" add column if not exists "systemMessages" boolean not null default true;

-- Dono e administradores ligam/desligam os avisos do sistema na conversa.
create or replace function public.set_group_system_messages(p_conversation_id text, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.group_role(p_conversation_id), '') not in ('owner', 'admin') then
    raise exception 'not_allowed' using errcode = 'insufficient_privilege';
  end if;
  update public."Conversation" set "systemMessages" = coalesce(p_on, true) where id = p_conversation_id;
end $$;

create or replace function public.group_config(p_conversation_id text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_c record;
  v_pin jsonb;
begin
  if not public.is_conversation_member(p_conversation_id, auth.uid()::text) then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  select * into v_c from public."Conversation" where id = p_conversation_id;
  if v_c."pinnedMessageId" is not null then
    select jsonb_build_object('id', m.id, 'type', m.type, 'senderId', m."senderId", 'senderName', u.name, 'createdAt', m."createdAt",
             'preview', left(public.message_preview(m.type, m.content, m.meta, m.attachments), 160))
      into v_pin
      from public."Message" m left join public."User" u on u.id = m."senderId"
     where m.id = v_c."pinnedMessageId" and m."deletedAt" is null;
  end if;
  return jsonb_build_object(
    'permissions', jsonb_build_object(
      'invite', public.group_perm_level(p_conversation_id, 'invite'),
      'edit', public.group_perm_level(p_conversation_id, 'edit'),
      'pin', public.group_perm_level(p_conversation_id, 'pin'),
      'mentions', public.group_perm_level(p_conversation_id, 'mentions'),
      'link', public.group_perm_level(p_conversation_id, 'link'),
      'add_admins', public.group_perm_level(p_conversation_id, 'add_admins')),
    'can', jsonb_build_object(
      'invite', public.group_can(p_conversation_id, 'invite'),
      'edit', public.group_can(p_conversation_id, 'edit'),
      'pin', public.group_can(p_conversation_id, 'pin'),
      'mentions', public.group_can(p_conversation_id, 'mentions'),
      'link', public.group_can(p_conversation_id, 'link'),
      'add_admins', public.group_can(p_conversation_id, 'add_admins')),
    'noForward', v_c."noForward",
    'systemMessages', v_c."systemMessages",
    'pinned', v_pin);
end $$;

revoke all on function public.set_group_system_messages(text, boolean) from public, anon;
grant execute on function public.set_group_system_messages(text, boolean) to authenticated;
