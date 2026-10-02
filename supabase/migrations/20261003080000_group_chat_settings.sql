-- Grupos do Messenger no modelo do VK: quem pode convidar, editar dados, fixar mensagens, chamar
-- @todos, ver o link do chat e nomear administradores; proibição de encaminhar; mensagem fixada
-- (grupos e conversas a dois); link de convite para entrar no grupo.
-- (Sem os operadores de seta do jsonb: o SQL pode ser colado no editor sem se corromper.)

alter table public."Conversation" add column if not exists "groupPermissions" jsonb not null default '{}'::jsonb;
alter table public."Conversation" add column if not exists "pinnedMessageId" text;
alter table public."Conversation" add column if not exists "noForward" boolean not null default false;
-- O código do convite fica numa tabela à parte, sem acesso direto: só as funções abaixo leem e gravam
-- (assim quem não tem a permissão do link não descobre o código pelo select da conversa).
create table if not exists public."ConversationInvite" (
  "conversationId" text primary key references public."Conversation"(id) on delete cascade,
  code text not null unique,
  "createdAt" timestamptz not null default now()
);
alter table public."ConversationInvite" enable row level security;
revoke all on public."ConversationInvite" from anon, authenticated;

-- Nível de cada regra (padrões iguais ao comportamento de antes: convidar e editar = administradores).
create or replace function public.group_perm_level(p_conversation_id text, p_key text)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    jsonb_extract_path_text(c."groupPermissions", p_key),
    case p_key when 'invite' then 'admins' when 'edit' then 'admins' when 'add_admins' then 'owner' else 'all' end)
  from public."Conversation" c where c.id = p_conversation_id
$$;

-- A pessoa pode fazer isso neste grupo? (dono sempre pode; "all" = todos; "admins" = admins e dono; "owner" = só o dono)
create or replace function public.group_can(p_conversation_id text, p_key text, p_user text default null)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_user text := coalesce(p_user, auth.uid()::text);
  v_role text;
  v_level text;
begin
  select cm.role into v_role from public."ConversationMember" cm where cm."conversationId" = p_conversation_id and cm."userId" = v_user;
  if v_role is null then return false; end if;
  if not exists (select 1 from public."Conversation" where id = p_conversation_id and "isGroup") then return true; end if;
  if v_role = 'owner' then return true; end if;
  v_level := public.group_perm_level(p_conversation_id, p_key);
  return v_level = 'all' or (v_level = 'admins' and v_role = 'admin');
end $$;

-- Configuração do grupo para a tela (regras resolvidas, proibição de encaminhar e mensagem fixada).
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
    select jsonb_build_object('id', m.id, 'type', m.type, 'senderId', m."senderId", 'senderName', u.name,
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
    'pinned', v_pin);
end $$;

-- Dono e administradores mudam as regras; só o dono decide quem nomeia administradores.
create or replace function public.set_group_permissions(p_conversation_id text, p_patch jsonb, p_no_forward boolean default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.group_role(p_conversation_id);
  k text;
  v text;
  v_perm jsonb;
begin
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'not_allowed' using errcode = 'insufficient_privilege';
  end if;
  select "groupPermissions" into v_perm from public."Conversation" where id = p_conversation_id for update;
  for k in select jsonb_object_keys(coalesce(p_patch, '{}'::jsonb)) loop
    v := jsonb_extract_path_text(p_patch, k);
    if k not in ('invite', 'edit', 'pin', 'mentions', 'link', 'add_admins') or v not in ('all', 'admins', 'owner') then
      raise exception 'invalid_permission' using errcode = 'check_violation';
    end if;
    if k = 'add_admins' and v_role <> 'owner' then
      raise exception 'owner_only' using errcode = 'insufficient_privilege';
    end if;
    v_perm := v_perm || jsonb_build_object(k, v);
  end loop;
  update public."Conversation"
     set "groupPermissions" = v_perm, "noForward" = coalesce(p_no_forward, "noForward")
   where id = p_conversation_id;
end $$;

-- Convidar: segue a regra "invite".
create or replace function public.add_group_members(p_conversation_id text, p_member_ids text[])
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_me text := auth.uid()::text;
  v_new text[];
  v_names text;
  v_me_name text;
begin
  if not public.group_can(p_conversation_id, 'invite') then
    raise exception 'not_allowed' using errcode = 'insufficient_privilege';
  end if;
  v_new := array(
    select distinct x from unnest(coalesce(p_member_ids, '{}')) x
     where x <> v_me
       and not exists (select 1 from "ConversationMember" where "conversationId" = p_conversation_id and "userId" = x)
  );
  if exists (select 1 from unnest(v_new) x where not public.are_friends(v_me, x) or public.is_blocked_between(v_me, x)) then
    raise exception 'friends_only' using errcode = 'insufficient_privilege';
  end if;
  if cardinality(v_new) = 0 then return 0; end if;
  insert into "ConversationMember" (id, "conversationId", "userId", role)
  select gen_random_uuid()::text, p_conversation_id, x, 'member' from unnest(v_new) x;
  select string_agg(name, ', ' order by name) into v_names from "User" where id = any(v_new);
  select name into v_me_name from "User" where id = v_me;
  perform public.post_system_message(p_conversation_id, v_me, coalesce(v_me_name, 'Alguém') || ' adicionou ' || v_names,
                                     jsonb_build_object('event', 'added', 'userIds', to_jsonb(v_new)));
  return cardinality(v_new);
end $$;

-- Editar nome/foto/descrição: segue a regra "edit".
create or replace function public.update_group(p_conversation_id text, p_name text, p_description text, p_avatar_url text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me text := auth.uid()::text;
  v_old record;
  v_name text := btrim(coalesce(p_name, ''));
  v_me_name text;
begin
  if not public.group_can(p_conversation_id, 'edit') then
    raise exception 'not_allowed' using errcode = 'insufficient_privilege';
  end if;
  if char_length(v_name) not between 1 and 60 then
    raise exception 'invalid_name' using errcode = 'check_violation';
  end if;
  if p_avatar_url is not null and p_avatar_url !~ '^https://' then p_avatar_url := null; end if;
  select name into v_old from "Conversation" where id = p_conversation_id;
  update "Conversation" set name = v_name, description = nullif(btrim(coalesce(p_description, '')), ''), "avatarUrl" = p_avatar_url
   where id = p_conversation_id;
  if v_old.name is distinct from v_name then
    select name into v_me_name from "User" where id = v_me;
    perform public.post_system_message(p_conversation_id, v_me,
      coalesce(v_me_name, 'Alguém') || ' mudou o nome do grupo para “' || v_name || '”', jsonb_build_object('event', 'renamed'));
  end if;
end $$;

-- Nomear administradores: dono sempre; admins só promovem quando a regra "add_admins" deixa.
create or replace function public.set_group_admin(p_conversation_id text, p_user_id text, p_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.group_role(p_conversation_id);
begin
  if p_user_id = auth.uid()::text or v_role is null
     or not (v_role = 'owner' or (v_role = 'admin' and p_admin and public.group_can(p_conversation_id, 'add_admins'))) then
    raise exception 'not_allowed' using errcode = 'insufficient_privilege';
  end if;
  update "ConversationMember" set role = case when p_admin then 'admin' else 'member' end
   where "conversationId" = p_conversation_id and "userId" = p_user_id and role <> 'owner';
end $$;

-- Fixar (ou desafixar com null) uma mensagem no topo da conversa.
create or replace function public.pin_conversation_message(p_conversation_id text, p_message_id text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me text := auth.uid()::text;
  v_name text;
begin
  if not public.group_can(p_conversation_id, 'pin') then
    raise exception 'not_allowed' using errcode = 'insufficient_privilege';
  end if;
  if p_message_id is not null and not exists (
    select 1 from public."Message" where id = p_message_id and "conversationId" = p_conversation_id and "deletedAt" is null and type <> 'system') then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  update public."Conversation" set "pinnedMessageId" = p_message_id where id = p_conversation_id;
  if exists (select 1 from public."Conversation" where id = p_conversation_id and "isGroup") then
    select name into v_name from public."User" where id = v_me;
    perform public.post_system_message(p_conversation_id, v_me,
      coalesce(v_name, 'Alguém') || case when p_message_id is null then ' desafixou a mensagem' else ' fixou uma mensagem' end,
      jsonb_build_object('event', case when p_message_id is null then 'unpinned' else 'pinned' end));
  end if;
end $$;

-- Link de convite do grupo (cria na primeira vez; "reset" gera outro e invalida o antigo — só dono/admins).
create or replace function public.group_invite_code(p_conversation_id text, p_reset boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  if not exists (select 1 from public."Conversation" where id = p_conversation_id and "isGroup") or not public.group_can(p_conversation_id, 'link') then
    raise exception 'not_allowed' using errcode = 'insufficient_privilege';
  end if;
  if p_reset and coalesce(public.group_role(p_conversation_id), '') not in ('owner', 'admin') then
    raise exception 'not_allowed' using errcode = 'insufficient_privilege';
  end if;
  select code into v_code from public."ConversationInvite" where "conversationId" = p_conversation_id;
  if v_code is null or p_reset then
    v_code := substr(md5(gen_random_uuid()::text || clock_timestamp()::text || p_conversation_id), 1, 12);
    insert into public."ConversationInvite" ("conversationId", code) values (p_conversation_id, v_code)
    on conflict ("conversationId") do update set code = excluded.code, "createdAt" = now();
  end if;
  return v_code;
end $$;

-- Prévia do convite (nome, foto e número de membros) para a página do link.
create or replace function public.group_invite_preview(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', c.id, 'name', c.name, 'avatarUrl', c."avatarUrl", 'description', c.description,
    'memberCount', (select count(*) from public."ConversationMember" m where m."conversationId" = c.id),
    'isMember', exists (select 1 from public."ConversationMember" m where m."conversationId" = c.id and m."userId" = auth.uid()::text))
  from public."ConversationInvite" i join public."Conversation" c on c.id = i."conversationId"
  where i.code = p_code and c."isGroup" and auth.uid() is not null
$$;

-- Entrar no grupo pelo link.
create or replace function public.join_group_by_code(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_me text := auth.uid()::text;
  v_conv text;
  v_name text;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  select c.id into v_conv from public."ConversationInvite" i join public."Conversation" c on c.id = i."conversationId"
   where i.code = p_code and c."isGroup";
  if v_conv is null then raise exception 'invalid_invite' using errcode = 'no_data_found'; end if;
  if exists (select 1 from public."ConversationMember" where "conversationId" = v_conv and "userId" = v_me) then return v_conv; end if;
  if (select count(*) from public."ConversationMember" where "conversationId" = v_conv) >= 500 then
    raise exception 'group_full' using errcode = 'check_violation';
  end if;
  insert into public."ConversationMember" (id, "conversationId", "userId", role) values (gen_random_uuid()::text, v_conv, v_me, 'member');
  select name into v_name from public."User" where id = v_me;
  perform public.post_system_message(v_conv, v_me, coalesce(v_name, 'Alguém') || ' entrou pelo link do chat',
                                     jsonb_build_object('event', 'joined', 'userIds', jsonb_build_array(v_me)));
  return v_conv;
end $$;

-- @todos só notifica todo mundo quando a regra "mentions" deixa quem enviou.
create or replace function public.notify_message_mentions()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_is_group boolean;
  v_conv_name text;
  v_sender_name text;
  v_preview text;
  v_href text;
  v_all boolean;
  v_rec record;
begin
  if new.type = 'system' or coalesce(new.content, '') = '' then
    return new;
  end if;
  select "isGroup", name into v_is_group, v_conv_name from "Conversation" where id = new."conversationId";
  if not coalesce(v_is_group, false) then
    return new;
  end if;
  select name into v_sender_name from "User" where id = new."senderId";
  v_preview := left(public.message_preview(new.type, new.content, new.meta, new.attachments), 120);
  v_href := '/mensagens?c=' || new."conversationId";
  v_all := lower(new.content) ~ '(^|[^a-z0-9_])@(todos|todas|all|everyone|geral)([^a-z0-9_]|$)'
           and public.group_can(new."conversationId", 'mentions', new."senderId");
  if v_all then
    for v_rec in
      select cm."userId" as uid from "ConversationMember" cm
       where cm."conversationId" = new."conversationId" and cm."userId" <> new."senderId"
    loop
      insert into "Notification" (id, "userId", type, title, message, href, "actorId", "dedupeKey")
      values (gen_random_uuid()::text, v_rec.uid, 'mention_all',
              coalesce(v_sender_name, 'Alguém') || ' chamou todos em ' || coalesce(v_conv_name, 'um grupo'),
              v_preview, v_href, new."senderId", 'mnt:' || new.id || ':' || v_rec.uid)
      on conflict ("userId", "dedupeKey") where "dedupeKey" is not null do nothing;
    end loop;
  else
    for v_rec in
      select distinct lower(mm[1]) as handle from regexp_matches(new.content, '@([a-zA-Z0-9_.]{2,30})', 'g') as mm
    loop
      insert into "Notification" (id, "userId", type, title, message, href, "actorId", "dedupeKey")
      select gen_random_uuid()::text, u.id, 'mention',
             coalesce(v_sender_name, 'Alguém') || ' mencionou você em ' || coalesce(v_conv_name, 'um grupo'),
             v_preview, v_href, new."senderId", 'mnt:' || new.id || ':' || u.id
        from "User" u join "ConversationMember" cm on cm."userId" = u.id and cm."conversationId" = new."conversationId"
       where lower(u.username) = v_rec.handle and u.id <> new."senderId"
      on conflict ("userId", "dedupeKey") where "dedupeKey" is not null do nothing;
    end loop;
  end if;
  return new;
exception when others then
  return new;
end $$;

revoke all on function public.group_perm_level(text, text) from public, anon;
revoke all on function public.group_can(text, text, text) from public, anon;
revoke all on function public.group_config(text) from public, anon;
revoke all on function public.set_group_permissions(text, jsonb, boolean) from public, anon;
revoke all on function public.pin_conversation_message(text, text) from public, anon;
revoke all on function public.group_invite_code(text, boolean) from public, anon;
revoke all on function public.group_invite_preview(text) from public, anon;
revoke all on function public.join_group_by_code(text) from public, anon;
grant execute on function public.group_perm_level(text, text) to authenticated;
grant execute on function public.group_can(text, text, text) to authenticated;
grant execute on function public.group_config(text) to authenticated;
grant execute on function public.set_group_permissions(text, jsonb, boolean) to authenticated;
grant execute on function public.pin_conversation_message(text, text) to authenticated;
grant execute on function public.group_invite_code(text, boolean) to authenticated;
grant execute on function public.group_invite_preview(text) to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;
