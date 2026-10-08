-- Perfil no padrão VK: contadores, amigos (todos / online / em comum), seguidores e a ficha
-- "Mais informações" com privacidade por campo (Público · Amigos · Só eu), filtrada no servidor.

-- Publicação que quem está vendo pode ver (mesma regra da policy post_select_visible).
create or replace function public.post_visible_to(p_author text, p_visibility text, p_viewer text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select p_viewer is not null and (
    p_author = p_viewer or coalesce(p_visibility, 'public') = 'public'
    or (p_visibility = 'followers' and exists (
      select 1 from "Follow" f where f."followerId" = p_viewer and f."followingId" = p_author and f.status = 'accepted')))
$$;

-- Contadores do perfil numa chamada só.
create or replace function public.get_profile_stats(p_user text)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  with me as (select auth.uid()::text as id),
  friends as (
    select case when f."requesterId" = p_user then f."addresseeId" else f."requesterId" end as id
      from "Friendship" f
     where f.status = 'accepted' and (f."requesterId" = p_user or f."addresseeId" = p_user)
  ),
  posts as (
    select p.id from "Post" p, me
     where p."authorId" = p_user and p."communityId" is null and not coalesce(p."isArchived", false)
       and public.post_visible_to(p."authorId", p.visibility, me.id)
  )
  select case when public.is_blocked_between(coalesce((select id from me), ''), p_user) then '{}'::jsonb else jsonb_build_object(
    'friends', (select count(*) from friends),
    'followers', (select count(*) from "Follow" f where f."followingId" = p_user and coalesce(f.status, 'accepted') = 'accepted'
                    and f."followerId" not in (select id from friends)),
    'photos', (select count(*) from "Media" m join posts on posts.id = m."postId" where m.type = 'image' and m."archivedAt" is null),
    'videos', (select count(*) from "Media" m join posts on posts.id = m."postId" where m.type = 'video' and m."archivedAt" is null),
    'posts', (select count(*) from posts),
    'canSeeFriends', public.privacy_allows(p_user, (select id from me), 'friends')
  ) end
$$;

-- Amigos de um perfil: filtro (all | online | mutual), busca e paginação. Respeita "Quem vê minha
-- lista de amigos" dos dois lados, igual à policy friendship_privacy.
create or replace function public.get_profile_friends(p_user text, p_filter text default 'all', p_query text default '', p_offset int default 0, p_limit int default 30)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v_me text := auth.uid()::text; v_q text := lower(btrim(coalesce(p_query, ''))); v_rows jsonb; v_total int;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.privacy_allows(p_user, v_me, 'friends') then
    return jsonb_build_object('items', '[]'::jsonb, 'total', 0, 'hidden', true);
  end if;
  with base as (
    select u.id, u.name, u.username, u."avatarUrl", u."isVerified",
           coalesce(up.status, 'offline') as presence,
           (v_me <> p_user and public.are_friends(v_me, u.id)) as mutual,
           f."respondedAt"
      from "Friendship" f
      join "User" u on u.id = case when f."requesterId" = p_user then f."addresseeId" else f."requesterId" end
      left join "UserPresence" up on up."userId" = u.id
     where f.status = 'accepted' and (f."requesterId" = p_user or f."addresseeId" = p_user)
       and u."accountStatus" = 'active'
       and (u.id = v_me or public.privacy_allows(u.id, v_me, 'friends'))
  ), filtered as (
    select * from base
     where (p_filter <> 'online' or presence = 'online')
       and (p_filter <> 'mutual' or mutual)
       and (v_q = '' or lower(name) like '%' || v_q || '%' or lower(username) like '%' || v_q || '%')
  )
  select (select count(*) from filtered),
         coalesce((select jsonb_agg(to_jsonb(x) - 'respondedAt') from (
           select * from filtered order by mutual desc, "respondedAt" desc nulls last, name
            offset greatest(p_offset, 0) limit least(greatest(p_limit, 1), 60)) x), '[]'::jsonb)
    into v_total, v_rows;
  return jsonb_build_object('items', v_rows, 'total', v_total, 'hidden', false);
end $$;

-- Seguidores (quem virou amigo conta só em Amigos, como no VK).
create or replace function public.get_profile_followers(p_user text, p_query text default '', p_offset int default 0, p_limit int default 30)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v_me text := auth.uid()::text; v_q text := lower(btrim(coalesce(p_query, ''))); v_rows jsonb; v_total int;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.privacy_allows(p_user, v_me, 'friends') then
    return jsonb_build_object('items', '[]'::jsonb, 'total', 0, 'hidden', true);
  end if;
  with filtered as (
    select u.id, u.name, u.username, u."avatarUrl", u."isVerified", coalesce(up.status, 'offline') as presence, f."createdAt"
      from "Follow" f
      join "User" u on u.id = f."followerId"
      left join "UserPresence" up on up."userId" = u.id
     where f."followingId" = p_user and coalesce(f.status, 'accepted') = 'accepted'
       and u."accountStatus" = 'active'
       and not public.are_friends(p_user, u.id)
       and not public.is_blocked_between(v_me, u.id)
       and (v_q = '' or lower(u.name) like '%' || v_q || '%' or lower(u.username) like '%' || v_q || '%')
  )
  select (select count(*) from filtered),
         coalesce((select jsonb_agg(to_jsonb(x) - 'createdAt') from (
           select * from filtered order by "createdAt" desc offset greatest(p_offset, 0) limit least(greatest(p_limit, 1), 60)) x), '[]'::jsonb)
    into v_total, v_rows;
  return jsonb_build_object('items', v_rows, 'total', v_total, 'hidden', false);
end $$;

-- ─── Ficha "Mais informações": campos novos e privacidade por campo ───

create or replace function public.profile_about_fields()
returns text[] language sql immutable as $$
  select array['aboutMe', 'hometown', 'languages', 'education', 'career', 'life',
               'music', 'movies', 'books', 'games', 'universe', 'faceclaim', 'charAge', 'affiliation']
$$;

create or replace function public.profile_about_extra_clean(p jsonb)
returns jsonb language plpgsql immutable set search_path to '' as $$
declare v_out jsonb := '{}'::jsonb; v_obj jsonb; k text; t text;
begin
  p := coalesce(p, '{}'::jsonb);
  t := left(btrim(coalesce(p->>'aboutMe', '')), 2000); if t <> '' then v_out := v_out || jsonb_build_object('aboutMe', t); end if;

  v_obj := '{}'::jsonb;
  foreach k in array array['music', 'movies', 'books', 'games'] loop
    t := left(btrim(coalesce(p->'favorites'->>k, '')), 300);
    if t <> '' then v_obj := v_obj || jsonb_build_object(k, t); end if;
  end loop;
  if v_obj <> '{}'::jsonb then v_out := v_out || jsonb_build_object('favorites', v_obj); end if;

  v_obj := '{}'::jsonb;
  foreach k in array array['universe', 'faceclaim', 'charAge', 'affiliation'] loop
    t := left(btrim(coalesce(p->'character'->>k, '')), case when k = 'charAge' then 40 else 80 end);
    if t <> '' then v_obj := v_obj || jsonb_build_object(k, t); end if;
  end loop;
  if v_obj <> '{}'::jsonb then v_out := v_out || jsonb_build_object('character', v_obj); end if;

  v_obj := '{}'::jsonb;
  if jsonb_typeof(p->'visibility') = 'object' then
    foreach k in array public.profile_about_fields() loop
      if p->'visibility'->>k in ('friends', 'only_me') then v_obj := v_obj || jsonb_build_object(k, p->'visibility'->>k); end if;
    end loop;
  end if;
  if v_obj <> '{}'::jsonb then v_out := v_out || jsonb_build_object('visibility', v_obj); end if;
  return v_out;
end $$;

create or replace function public.save_profile_about(p jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_me text := auth.uid()::text; v_clean jsonb;
begin
  if v_me is null then raise exception 'not authenticated' using errcode = 'insufficient_privilege'; end if;
  if pg_column_size(p) > 32768 then raise exception 'too_large' using errcode = 'check_violation'; end if;
  v_clean := public.profile_about_clean(p) || public.profile_about_extra_clean(p);
  if v_clean ? 'career' then
    v_clean := jsonb_set(v_clean, '{career}', (
      select coalesce(jsonb_agg(case
               when c ? 'community' and not exists (
                 select 1 from public."CommunityMember" m where m."communityId" = c->>'community' and m."userId" = v_me)
               then c - 'community' else c end), '[]'::jsonb)
        from jsonb_array_elements(v_clean->'career') c));
  end if;
  update public."Profile" set about = v_clean, "updatedAt" = now() where "userId" = v_me;
  if not found then
    insert into public."Profile" (id, "userId", about, "createdAt", "updatedAt") values (gen_random_uuid()::text, v_me, v_clean, now(), now());
  end if;
  return v_clean;
end $function$;

-- Leitura da ficha: quem visita recebe só o que pode ver (privacidade de "Informações básicas"
-- e, por cima, a de cada campo). O dono recebe tudo, com as escolhas de visibilidade.
create or replace function public.profile_about(p_user text)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare v_about jsonb; v_me text := auth.uid()::text; v_vis jsonb; k text; v_friend boolean;
begin
  if public.is_blocked_between(coalesce(v_me, ''), p_user) then return '{}'::jsonb; end if;
  if not public.privacy_allows(p_user, v_me, 'basic_info') then return '{}'::jsonb; end if;
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
  if v_me = p_user then return v_about; end if;

  v_vis := coalesce(v_about->'visibility', '{}'::jsonb);
  v_about := v_about - 'visibility';
  v_friend := public.are_friends(coalesce(v_me, ''), p_user);
  foreach k in array public.profile_about_fields() loop
    continue when not v_vis ? k;
    continue when v_vis->>k = 'friends' and v_friend;
    if k in ('aboutMe', 'hometown', 'languages', 'education', 'career') then
      v_about := v_about - k;
    elsif k = 'life' then
      v_about := v_about - 'motto' - 'inspiredBy' - 'priority' - 'peopleValue' - 'smoking' - 'alcohol';
    elsif k in ('music', 'movies', 'books', 'games') then
      v_about := jsonb_set(v_about, '{favorites}', coalesce(v_about->'favorites', '{}'::jsonb) - k);
    else
      v_about := jsonb_set(v_about, '{character}', coalesce(v_about->'character', '{}'::jsonb) - k);
    end if;
  end loop;
  if v_about->'favorites' = '{}'::jsonb then v_about := v_about - 'favorites'; end if;
  if v_about->'character' = '{}'::jsonb then v_about := v_about - 'character'; end if;
  return v_about;
end $function$;

-- "Mover para Sobre mim": o texto de uma publicação minha vira o Sobre mim (a publicação continua).
create or replace function public.profile_about_me_from_post(p_post text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_me text := auth.uid()::text; v_text text; v_about jsonb;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select left(btrim(content), 2000) into v_text from "Post" where id = p_post and "authorId" = v_me and "communityId" is null;
  if v_text is null or v_text = '' then raise exception 'post_not_found' using errcode = 'no_data_found'; end if;
  select coalesce(about, '{}'::jsonb) into v_about from "Profile" where "userId" = v_me;
  return public.save_profile_about(coalesce(v_about, '{}'::jsonb) || jsonb_build_object('aboutMe', v_text));
end $$;

revoke all on function public.post_visible_to(text, text, text), public.get_profile_stats(text),
  public.get_profile_friends(text, text, text, int, int), public.get_profile_followers(text, text, int, int),
  public.profile_about_fields(), public.profile_about_extra_clean(jsonb), public.profile_about_me_from_post(text) from public, anon;
grant execute on function public.get_profile_stats(text), public.get_profile_friends(text, text, text, int, int),
  public.get_profile_followers(text, text, int, int), public.profile_about_me_from_post(text),
  public.profile_about_fields(), public.profile_about_extra_clean(jsonb) to authenticated;
