-- Marcação em publicações e comentários do perfil/feed (como no VK): quem foi marcado com
-- @usuario ou @usuario (texto) recebe um aviso. Comunidades já avisam pelas próprias regras.
-- Não avisa a si mesmo, quem bloqueou/foi bloqueado, nem quem não pode ver a publicação.

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
    continue when coalesce(p_visibility, 'public') = 'private';
    continue when p_visibility = 'followers' and not exists (
      select 1 from "Follow" f where f."followerId" = v_u.id and f."followingId" = p_actor and coalesce(f.status, 'accepted') = 'accepted');
    perform public.app_notify(v_u.id, p_actor, 'mention', 'Você foi marcado',
      coalesce(v_name, 'Alguém') || case when p_kind = 'comment' then ' marcou você num comentário' else ' marcou você numa publicação' end,
      p_href);
  end loop;
end $$;

create or replace function public.notify_post_mentions()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_username text;
begin
  if new."communityId" is not null or coalesce(new."isArchived", false) then return new; end if;
  select username into v_username from "User" where id = new."authorId";
  perform public.notify_user_mentions(new."authorId", new.content, '/perfil/' || coalesce(v_username, ''), new.id, new.visibility, 'post');
  return new;
end $$;

create or replace trigger notify_post_mentions after insert on public."Post" for each row execute function public.notify_post_mentions();

create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_author text; v_comm text; v_slug text; v_href text := '/feed'; v_vis text; v_username text;
begin
  select "authorId", "communityId", visibility into v_author, v_comm, v_vis from public."Post" where id = new."postId";
  if new.status <> 'visible' then return new; end if;
  if v_comm is not null then
    select slug into v_slug from "Community" where id = v_comm;
    v_href := '/comunidades/' || v_slug || '?post=' || new."postId";
  else
    select username into v_username from "User" where id = v_author;
    if v_username is not null then v_href := '/perfil/' || v_username; end if;
  end if;
  if v_author is not null and v_author <> new."userId" then
    insert into public."Notification" (id, "userId", type, title, message, "actorId", "postId", "commentId", href)
    values (gen_random_uuid()::text, v_author, 'comment', 'Novo comentário', 'comentou na sua publicação', new."userId", new."postId", new.id, v_href);
  end if;
  if v_comm is not null then
    perform public.community_mentions(v_comm, new."userId", new.content, v_href, 'comment:' || new.id, new."postId");
  else
    perform public.notify_user_mentions(new."userId", new.content, v_href, new."postId", v_vis, 'comment');
  end if;
  return new;
end $function$;

revoke all on function public.notify_user_mentions(text, text, text, text, text, text), public.notify_post_mentions() from public, anon, authenticated;
