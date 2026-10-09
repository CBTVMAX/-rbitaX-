-- Notificações: cada tipo com Todos · Apenas amigos · Desativado (como no VK).
-- Aplicado num gatilho antes de gravar a notificação, então também não sai push.
-- Avisos de segurança da conta não podem ser desligados.

create table if not exists public."NotificationPref" (
  "userId" text not null,
  key text not null,
  level text not null check (level in ('all', 'friends', 'off')),
  "updatedAt" timestamptz not null default now(),
  primary key ("userId", key)
);
alter table public."NotificationPref" enable row level security;
create policy notification_pref_select_own on public."NotificationPref" for select to authenticated using ("userId" = auth.uid()::text);
grant select on public."NotificationPref" to authenticated;

-- Tipo da notificação → item das configurações (null = sempre chega).
create or replace function public.notification_key(p_type text)
returns text language sql immutable as $$
  select case
    when p_type in ('like', 'story_reaction', 'community_discussion_like') then 'reactions'
    when p_type in ('comment', 'comment_reply', 'community_reply') then 'comments'
    when p_type in ('mention', 'community_mention', 'mention_all') then 'mentions'
    when p_type in ('community_repost') then 'reposts'
    when p_type in ('testimonial') then 'testimonials'
    when p_type in ('friend_request') then 'friend_requests'
    when p_type in ('friend_accept') then 'friend_accept'
    when p_type in ('follow') then 'follows'
    when p_type in ('family') then 'family'
    when p_type in ('community_invite') then 'community_invites'
    when p_type in ('community_event') then 'community_events'
    when p_type like 'community\_%' then 'community_activity'
    else null
  end
$$;

create or replace function public.notification_keys()
returns text[] language sql immutable as $$
  select array['reactions', 'comments', 'mentions', 'reposts', 'testimonials', 'friend_requests', 'friend_accept',
               'follows', 'family', 'community_invites', 'community_events', 'community_activity']
$$;

create or replace function public.notification_pref_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_key text := public.notification_key(new.type); v_level text;
begin
  if v_key is null then return new; end if;
  select level into v_level from "NotificationPref" where "userId" = new."userId" and key = v_key;
  if v_level is null or v_level = 'all' then return new; end if;
  if v_level = 'off' then return null; end if;
  -- Apenas amigos: avisos sem autor (do sistema) continuam chegando.
  if new."actorId" is null or public.are_friends(new."userId", new."actorId") then return new; end if;
  return null;
end $$;
create or replace trigger notification_pref_guard before insert on public."Notification" for each row execute function public.notification_pref_guard();

create or replace function public.my_notification_prefs()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v_me text := auth.uid()::text;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  return jsonb_build_object(
    'prefs', coalesce((select jsonb_object_agg(k, coalesce(p.level, 'all'))
                         from unnest(public.notification_keys()) k
                         left join "NotificationPref" p on p."userId" = v_me and p.key = k), '{}'::jsonb),
    'communities', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'avatarUrl', c."avatarUrl",
                                                                 'level', coalesce(m."notifyLevel", 'all')) order by c.name)
                               from "CommunityMember" m join "Community" c on c.id = m."communityId"
                              where m."userId" = v_me), '[]'::jsonb));
end $$;

create or replace function public.set_notification_pref(p_key text, p_level text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_me text := auth.uid()::text;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not (p_key = any (public.notification_keys())) then raise exception 'invalid_key' using errcode = '22023'; end if;
  if p_level not in ('all', 'friends', 'off') then raise exception 'invalid_level' using errcode = '22023'; end if;
  insert into "NotificationPref" ("userId", key, level, "updatedAt") values (v_me, p_key, p_level, now())
  on conflict ("userId", key) do update set level = excluded.level, "updatedAt" = now();
  return public.my_notification_prefs();
end $$;

revoke all on function public.notification_pref_guard() from public, anon, authenticated;
revoke all on function public.my_notification_prefs(), public.set_notification_pref(text, text), public.notification_key(text), public.notification_keys() from public, anon;
grant execute on function public.my_notification_prefs(), public.set_notification_pref(text, text), public.notification_key(text), public.notification_keys() to authenticated;
