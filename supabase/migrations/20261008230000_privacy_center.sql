-- Privacidade detalhada (como no VK): cada item tem "quem vê" / "quem pode" com
-- Todos · Amigos e amigos de amigos · Amigos · Amigos, exceto… · Amigos selecionados… · Apenas eu/Ninguém.
-- As regras são aplicadas no banco (RLS, funções e gatilhos), não só na tela.
-- Sem configuração salva, cada item mantém o comportamento que o Órbita X já tinha.

create table if not exists public."PrivacySetting" (
  "userId" text not null,
  key text not null,
  scope text not null check (scope in ('all', 'fof', 'friends', 'friends_except', 'selected', 'only_me')),
  "allowIds" text[] not null default '{}',
  "denyIds" text[] not null default '{}',
  "updatedAt" timestamptz not null default now(),
  primary key ("userId", key)
);
alter table public."PrivacySetting" enable row level security;
create policy privacy_setting_select_own on public."PrivacySetting" for select to authenticated using ("userId" = auth.uid()::text);
grant select on public."PrivacySetting" to authenticated;

-- Modo Espaço Pessoal: uma semana sem atenção de quem não é amigo.
alter table public."User" add column if not exists "personalSpaceUntil" timestamptz;

-- Itens que existem no Órbita X e o valor de antes (padrão).
create or replace function public.privacy_default(p_owner text, p_key text)
returns text language sql stable security definer set search_path to 'public' as $$
  select case p_key
    when 'family' then (select case coalesce(p."familyVisibility", 'all') when 'me' then 'only_me' when 'friends' then 'friends' else 'all' end
                          from "Profile" p where p."userId" = p_owner)
    when 'messages' then 'friends'
    when 'calls' then 'friends'
    when 'group_add' then 'friends'
    when 'community_invites' then 'friends'
    else 'all'
  end
$$;

create or replace function public.privacy_keys()
returns text[] language sql immutable as $$
  select array['basic_info', 'friends', 'communities', 'family', 'stories', 'comments_view', 'comment',
               'messages', 'calls', 'group_add', 'community_invites', 'mention']
$$;

create or replace function public.friends_of_friends(a text, b text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from "Friendship" f
     where f.status = 'accepted' and (f."requesterId" = a or f."addresseeId" = a)
       and public.are_friends(case when f."requesterId" = a then f."addresseeId" else f."requesterId" end, b)
  )
$$;

create or replace function public.personal_space_on(p_user text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce((select "personalSpaceUntil" > now() from "User" where id = p_user), false)
$$;

-- O coração: o dono (p_owner) permite que p_viewer veja/faça p_key?
create or replace function public.privacy_allows(p_owner text, p_viewer text, p_key text)
returns boolean language plpgsql stable security definer set search_path to 'public' as $$
declare s record; v_scope text; v_friends boolean;
begin
  if p_owner is null or p_viewer is null then return false; end if;
  if p_owner = p_viewer then return true; end if;
  if public.is_blocked_between(p_owner, p_viewer) then return false; end if;
  select scope, "allowIds", "denyIds" into s from "PrivacySetting" where "userId" = p_owner and key = p_key;
  v_scope := coalesce(s.scope, public.privacy_default(p_owner, p_key), 'all');
  if v_scope = 'all' and p_key not in ('comment', 'mention', 'calls', 'group_add', 'community_invites', 'messages') then return true; end if;
  v_friends := public.are_friends(p_owner, p_viewer);
  -- Espaço Pessoal: quem não é amigo não comenta, não marca, não liga, não convida.
  if not v_friends and p_key in ('comment', 'mention', 'calls', 'group_add', 'community_invites', 'messages')
     and public.personal_space_on(p_owner) then
    return false;
  end if;
  return case v_scope
    when 'all' then true
    when 'only_me' then false
    when 'friends' then v_friends
    when 'fof' then v_friends or public.friends_of_friends(p_owner, p_viewer)
    when 'friends_except' then v_friends and not (p_viewer = any (coalesce(s."denyIds", '{}')))
    when 'selected' then v_friends and p_viewer = any (coalesce(s."allowIds", '{}'))
    else true
  end;
end $$;

-- Tela de Privacidade: tudo o que a pessoa configurou, com nomes e fotos das listas.
create or replace function public.my_privacy()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v_me text := auth.uid()::text; v_out jsonb := '{}'::jsonb; k text; s record; v_u record;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  foreach k in array public.privacy_keys() loop
    select * into s from "PrivacySetting" where "userId" = v_me and key = k;
    v_out := v_out || jsonb_build_object(k, jsonb_build_object(
      'scope', case when k = 'family' then public.privacy_default(v_me, k) else coalesce(s.scope, public.privacy_default(v_me, k)) end,
      'allow', coalesce((select jsonb_agg(jsonb_build_object('id', u.id, 'name', u.name, 'username', u.username, 'avatarUrl', u."avatarUrl") order by u.name)
                           from "User" u where u.id = any (coalesce(s."allowIds", '{}'))), '[]'::jsonb),
      'deny', coalesce((select jsonb_agg(jsonb_build_object('id', u.id, 'name', u.name, 'username', u.username, 'avatarUrl', u."avatarUrl") order by u.name)
                          from "User" u where u.id = any (coalesce(s."denyIds", '{}'))), '[]'::jsonb)));
  end loop;
  select "isPrivate", discoverable, "presenceMode", "personalSpaceUntil" into v_u from "User" where id = v_me;
  return jsonb_build_object(
    'settings', v_out,
    'isPrivate', coalesce(v_u."isPrivate", false),
    'discoverable', coalesce(v_u.discoverable, true),
    'invisible', coalesce(v_u."presenceMode", 'auto') = 'invisible',
    'personalSpaceUntil', case when v_u."personalSpaceUntil" > now() then v_u."personalSpaceUntil" end);
end $$;

create or replace function public.set_privacy(p_key text, p_scope text, p_allow text[] default '{}', p_deny text[] default '{}')
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_me text := auth.uid()::text; v_allow text[]; v_deny text[];
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not (p_key = any (public.privacy_keys())) then raise exception 'invalid_key' using errcode = '22023'; end if;
  if p_scope not in ('all', 'fof', 'friends', 'friends_except', 'selected', 'only_me') then raise exception 'invalid_scope' using errcode = '22023'; end if;
  if p_key = 'family' then
    if p_scope not in ('all', 'friends', 'only_me') then raise exception 'invalid_scope' using errcode = '22023'; end if;
    update "Profile" set "familyVisibility" = case p_scope when 'only_me' then 'me' else p_scope end where "userId" = v_me;
    return public.my_privacy();
  end if;
  -- Listas só com amigos de verdade (no máximo 300).
  select coalesce(array_agg(distinct x), '{}') into v_allow from unnest(coalesce(p_allow, '{}')) x where public.are_friends(v_me, x);
  select coalesce(array_agg(distinct x), '{}') into v_deny from unnest(coalesce(p_deny, '{}')) x where public.are_friends(v_me, x);
  if cardinality(v_allow) > 300 or cardinality(v_deny) > 300 then raise exception 'too_many' using errcode = 'check_violation'; end if;
  insert into "PrivacySetting" ("userId", key, scope, "allowIds", "denyIds", "updatedAt")
  values (v_me, p_key, p_scope, case when p_scope = 'selected' then v_allow else '{}' end, case when p_scope = 'friends_except' then v_deny else '{}' end, now())
  on conflict ("userId", key) do update set scope = excluded.scope, "allowIds" = excluded."allowIds", "denyIds" = excluded."denyIds", "updatedAt" = now();
  return public.my_privacy();
end $$;

create or replace function public.set_personal_space(p_on boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_me text := auth.uid()::text;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  update "User" set "personalSpaceUntil" = case when p_on then now() + interval '7 days' end where id = v_me;
  return public.my_privacy();
end $$;

-- Para a tela de quem visita: o que eu posso ver/fazer no perfil de p_owner.
create or replace function public.privacy_can(p_owner text, p_keys text[])
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_object_agg(k, public.privacy_allows(p_owner, auth.uid()::text, k)), '{}'::jsonb)
    from unnest(p_keys) k where k = any (public.privacy_keys())
$$;

-- ─── Onde cada item vale ─────────────────────────────────────────────

-- Informações básicas (idade, signo, cidade, interesses, relacionamento, formação, carreira…).
create or replace function public.public_profile_details(target_user_id text)
returns table(age integer, "zodiacSign" text, location text, website text, interests text, "relationshipStatus" text,
              "showAge" boolean, "showSign" boolean, "showLocation" boolean, "showInterests" boolean, "showRelationship" boolean)
language sql stable security definer set search_path to 'public' as $function$
  select
    case when (p."showAge" or me.is_owner) and p."birthDate" is not null
      then extract(year from age(p."birthDate"::date))::int end,
    case when p."showSign" or me.is_owner then p."zodiacSign" end,
    case when p."showLocation" or me.is_owner then p.location end,
    p.website,
    case when coalesce(p."showInterests", true) or me.is_owner then p.interests end,
    case when coalesce(p."showRelationship", true) or me.is_owner then coalesce(p.relationship, p."relationshipStatus") end,
    p."showAge", p."showSign", p."showLocation", coalesce(p."showInterests", true), coalesce(p."showRelationship", true)
  from "Profile" p
  cross join (select auth.uid()::text = target_user_id as is_owner) me
  where p."userId" = target_user_id
    and not public.is_blocked_between(coalesce(auth.uid()::text, ''), target_user_id)
    and public.privacy_allows(target_user_id, auth.uid()::text, 'basic_info')
$function$;

create or replace function public.profile_about(p_user text)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare v_about jsonb;
begin
  if public.is_blocked_between(coalesce(auth.uid()::text, ''), p_user) then return '{}'::jsonb; end if;
  if not public.privacy_allows(p_user, auth.uid()::text, 'basic_info') then return '{}'::jsonb; end if;
  select coalesce(p.about, '{}'::jsonb) into v_about from public."Profile" p where p."userId" = p_user;
  v_about := coalesce(v_about, '{}'::jsonb);
  if v_about ? 'career' then
    v_about := jsonb_set(v_about, '{career}', (
      select coalesce(jsonb_agg(case
               when cm.id is not null then c || jsonb_strip_nulls(jsonb_build_object(
                 'communityName', cm.name, 'communitySlug', cm.slug, 'communityAvatar', cm."avatarUrl"))
               else c - 'community' end order by ord), '[]'::jsonb)
        from jsonb_array_elements(v_about->'career') with ordinality as x(c, ord)
        left join public."Community" cm on cm.id = c->>'community'));
  end if;
  return v_about;
end $function$;

-- Lista de comunidades no perfil.
create or replace function public.profile_visible_community_ids(p_user text)
returns setof text language sql stable security definer set search_path to 'public' as $function$
  select m."communityId" from "CommunityMember" m
  where m."userId" = p_user
    and (m."userId" = auth.uid()::text or public.community_visible(auth.uid()::text, m."communityId"))
    and not (m."communityId" = any (coalesce((select "hiddenProfileCommunities" from "User" where id = p_user), '{}')))
    and public.privacy_allows(p_user, auth.uid()::text, 'communities')
$function$;

-- Parentes.
create or replace function public.family_of(p_user_id text)
returns table("relativeId" text, relation text, username text, name text, "avatarUrl" text, "isVerified" boolean)
language plpgsql stable security definer set search_path to 'public' as $function$
begin
  if not public.privacy_allows(p_user_id, coalesce(auth.uid()::text, ''), 'family') then return; end if;
  return query
    select f."relativeId", f.relation, u.username, u.name, u."avatarUrl", u."isVerified"
    from "FamilyLink" f join "User" u on u.id = f."relativeId"
    where f."userId" = p_user_id and f.status = 'accepted'
    order by f."createdAt";
end $function$;

-- Lista de amigos: a amizade só aparece para quem os dois lados permitem.
create policy friendship_privacy on public."Friendship" as restrictive for select to authenticated
  using (status <> 'accepted' or auth.uid()::text in ("requesterId", "addresseeId")
         or (public.privacy_allows("requesterId", auth.uid()::text, 'friends') and public.privacy_allows("addresseeId", auth.uid()::text, 'friends')));

-- Histórias do perfil.
create policy moment_privacy on public."Moment" as restrictive for select to authenticated
  using ("userId" = auth.uid()::text or "communityId" is not null or public.privacy_allows("userId", auth.uid()::text, 'stories'));

-- Comentários das minhas publicações (fora das comunidades): quem vê e quem pode comentar.
create policy comment_privacy on public."Comment" as restrictive for select to authenticated
  using ("userId" = auth.uid()::text or exists (
    select 1 from public."Post" p where p.id = "Comment"."postId"
       and (p."communityId" is not null or p."authorId" = auth.uid()::text or public.privacy_allows(p."authorId", auth.uid()::text, 'comments_view'))));

create or replace function public.comment_privacy_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_author text; v_comm text;
begin
  select "authorId", "communityId" into v_author, v_comm from "Post" where id = new."postId";
  if v_comm is null and v_author is not null and v_author <> new."userId"
     and not public.privacy_allows(v_author, new."userId", 'comment') then
    raise exception 'comments_restricted' using errcode = 'insufficient_privilege', hint = 'O autor limitou quem pode comentar.';
  end if;
  return new;
end $$;
create or replace trigger comment_privacy_guard before insert on public."Comment" for each row execute function public.comment_privacy_guard();

-- Mensagens privadas (o chat já é só entre amigos; agora cada um escolhe quais amigos).
create or replace function public.conversation_send_status(conversation_id text)
returns text language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_me text := auth.uid()::text;
  v_group boolean;
  v_saved boolean;
  v_other text;
begin
  if v_me is null or not exists (
    select 1 from "ConversationMember" where "conversationId" = conversation_id and "userId" = v_me
  ) then
    return 'not_member';
  end if;
  select "isGroup", "isSaved" into v_group, v_saved from "Conversation" where id = conversation_id;
  if v_group or v_saved then return 'ok'; end if;
  select "userId" into v_other from "ConversationMember"
   where "conversationId" = conversation_id and "userId" <> v_me limit 1;
  if v_other is null then return 'not_member'; end if;
  if not public.user_is_active(v_other) then return 'removed'; end if;
  if public.is_blocked_between(v_me, v_other) then return 'blocked'; end if;
  if not public.are_friends(v_me, v_other) then return 'not_friends'; end if;
  if not public.privacy_allows(v_other, v_me, 'messages') then return 'restricted'; end if;
  return 'ok';
end $function$;

create or replace function public.conversation_all_friends(conversation_id text, user_id text)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select user_id = auth.uid()::text and (
    exists (select 1 from "Conversation" c where c.id = conversation_id and (c."isGroup" or c."isSaved"))
    or not exists (
      select 1 from "ConversationMember" cm
      where cm."conversationId" = conversation_id
        and cm."userId" <> user_id
        and (not public.are_friends(user_id, cm."userId") or public.is_blocked_between(user_id, cm."userId")
             or not public.privacy_allows(cm."userId", user_id, 'messages'))
    )
  )
$function$;

-- Chamadas.
create or replace function public.call_privacy_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.privacy_allows(new."calleeId", new."callerId", 'calls') then
    raise exception 'calls_restricted' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;
create or replace trigger call_privacy_guard before insert on public."Call" for each row execute function public.call_privacy_guard();

-- Grupos: quem não permite simplesmente não é adicionado (os demais entram normalmente).
create or replace function public.group_add_privacy_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_actor text := auth.uid()::text;
begin
  if v_actor is null or new."userId" = v_actor then return new; end if;
  if not exists (select 1 from "Conversation" c where c.id = new."conversationId" and c."isGroup" and c."communityId" is null) then return new; end if;
  if not public.privacy_allows(new."userId", v_actor, 'group_add') then return null; end if;
  return new;
end $$;
create or replace trigger group_add_privacy_guard before insert on public."ConversationMember" for each row execute function public.group_add_privacy_guard();

-- Pedidos de amizade durante o Espaço Pessoal: só amigos de amigos.
create or replace function public.friend_request_privacy_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.status = 'pending' and public.personal_space_on(new."addresseeId")
     and not public.friends_of_friends(new."addresseeId", new."requesterId") then
    raise exception 'personal_space' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;
create or replace trigger friend_request_privacy_guard before insert on public."Friendship" for each row execute function public.friend_request_privacy_guard();

-- Convites para comunidades.
create or replace function public.community_invite(p_community text, p_users text[])
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare v_me text := auth.uid()::text; v_c record; v_name text; v_n int := 0; v_u text;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  select * into v_c from public."Community" where id = p_community;
  if not found then raise exception 'not_found' using errcode = 'no_data_found'; end if;
  if not public.community_can(v_me, p_community, 'invite') then raise exception 'community_forbidden' using errcode = 'insufficient_privilege'; end if;
  if cardinality(coalesce(p_users, '{}')) = 0 or cardinality(p_users) > 50 then raise exception 'invalid_members' using errcode = 'check_violation'; end if;
  if (select count(*) from public."Notification" where "actorId" = v_me and type = 'community_invite' and "createdAt" > now() - interval '1 day') >= 200 then
    raise exception 'rate_limited' using errcode = 'check_violation';
  end if;
  select name into v_name from public."User" where id = v_me;
  for v_u in select distinct x from unnest(p_users) x where x is not null and x <> v_me loop
    if public.are_friends(v_me, v_u) and not public.is_blocked_between(v_me, v_u)
       and public.privacy_allows(v_u, v_me, 'community_invites')
       and not exists (select 1 from public."CommunityMember" where "communityId" = p_community and "userId" = v_u)
       and not public.community_is_banned(v_u, p_community)
       and not exists (select 1 from public."Notification" where "userId" = v_u and "dedupeKey" = 'cinvite:' || p_community || ':' || v_me) then
      perform public.community_notify(v_u, v_me, 'community_invite', 'Convite para comunidade',
        coalesce(v_name, 'Alguém') || ' convidou você para participar de ' || v_c.name, '/comunidades/' || v_c.slug, 'cinvite:' || p_community || ':' || v_me);
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end $function$;

-- Marcações com @: o texto continua com link, mas só avisa quem permitiu.
create or replace function public.notify_user_mentions(p_actor text, p_text text, p_href text, p_post text, p_visibility text, p_kind text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_u record; v_name text;
begin
  if p_text is null or position('@' in p_text) = 0 then return; end if;
  select name into v_name from "User" where id = p_actor;
  for v_u in
    select distinct u.id from "User" u
     where lower(u.username) in (select lower(m[1]) from regexp_matches(p_text, '@([A-Za-z0-9_.]{2,30})', 'g') m)
       and u.id <> p_actor
     limit 10
  loop
    continue when public.is_blocked_between(p_actor, v_u.id);
    continue when not public.privacy_allows(v_u.id, p_actor, 'mention');
    continue when coalesce(p_visibility, 'public') = 'private';
    continue when p_visibility = 'followers' and not exists (
      select 1 from "Follow" f where f."followerId" = v_u.id and f."followingId" = p_actor and coalesce(f.status, 'accepted') = 'accepted');
    perform public.app_notify(v_u.id, p_actor, 'mention', 'Você foi marcado',
      coalesce(v_name, 'Alguém') || case when p_kind = 'comment' then ' marcou você num comentário' else ' marcou você numa publicação' end,
      p_href);
  end loop;
end $$;

create or replace function public.community_mentions(p_community text, p_actor text, p_text text, p_href text, p_key text, p_post text default null)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_u record; v_name text;
begin
  if p_text is null or position('@' in p_text) = 0 then return; end if;
  if not public.community_can(p_actor, p_community, 'mention') then return; end if;
  select name into v_name from "User" where id = p_actor;
  for v_u in
    select distinct u.id from "User" u
     where lower(u.username) in (select lower(m[1]) from regexp_matches(p_text, '@([A-Za-z0-9_.]{3,30})', 'g') m)
     limit 10
  loop
    if public.community_visible(v_u.id, p_community) and public.privacy_allows(v_u.id, p_actor, 'mention') then
      perform public.community_notify(v_u.id, p_actor, 'community_mention', 'Você foi mencionado',
        coalesce(v_name, 'Alguém') || ' mencionou você em uma comunidade', p_href, 'mention:' || p_key, p_post);
    end if;
  end loop;
end $function$;

revoke all on function public.privacy_default(text, text), public.comment_privacy_guard(), public.call_privacy_guard(),
  public.group_add_privacy_guard(), public.friend_request_privacy_guard() from public, anon, authenticated;
revoke all on function public.my_privacy(), public.set_privacy(text, text, text[], text[]), public.set_personal_space(boolean),
  public.privacy_can(text, text[]), public.privacy_allows(text, text, text), public.friends_of_friends(text, text),
  public.personal_space_on(text), public.privacy_keys() from public, anon;
grant execute on function public.my_privacy(), public.set_privacy(text, text, text[], text[]), public.set_personal_space(boolean),
  public.privacy_can(text, text[]), public.privacy_allows(text, text, text), public.friends_of_friends(text, text),
  public.personal_space_on(text), public.privacy_keys() to authenticated;
