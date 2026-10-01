-- Reações e visualizações em histórias do perfil.
--
-- `story_view` e `story_react` nasceram para histórias de comunidade e, para as do perfil
-- (`communityId` nulo), não conferiam se quem chama pode ver o autor. Agora seguem a mesma regra
-- da leitura (`can_view_user_content`), o autor não reage à própria história e a notificação
-- leva ao perfil de quem publicou.

create or replace function public.story_view(p_moment text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_me text := auth.uid()::text; v_m record;
begin
  if v_me is null then return; end if;
  select * into v_m from public."Moment" where id = p_moment and "expiresAt" > now();
  if not found or v_m."userId" = v_me then return; end if;
  if v_m."communityId" is not null and not public.community_visible(v_me, v_m."communityId") then return; end if;
  if v_m."communityId" is null and not public.can_view_user_content(v_m."userId") then return; end if;
  insert into public."MomentView" ("momentId", "userId") values (p_moment, v_me) on conflict do nothing;
  if found then update public."Moment" set "viewCount" = "viewCount" + 1 where id = p_moment; end if;
end $function$;

create or replace function public.story_react(p_moment text, p_emoji text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_me text := auth.uid()::text; v_m record; v_slug text; v_username text; v_new integer;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  select * into v_m from public."Moment" where id = p_moment and "expiresAt" > now();
  if not found
     or (v_m."communityId" is not null and not public.community_visible(v_me, v_m."communityId"))
     or (v_m."communityId" is null and not public.can_view_user_content(v_m."userId")) then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  if v_m."userId" = v_me then raise exception 'own_story' using errcode = 'check_violation'; end if;
  if v_m."communityId" is not null and public.community_is_muted(v_me, v_m."communityId") then raise exception 'muted' using errcode = 'insufficient_privilege'; end if;
  if p_emoji is null then
    delete from public."MomentReaction" where "momentId" = p_moment and "userId" = v_me;
    return;
  end if;
  if char_length(p_emoji) > 16 then raise exception 'invalid_emoji' using errcode = 'check_violation'; end if;
  insert into public."MomentReaction" ("momentId", "userId", emoji) values (p_moment, v_me, p_emoji)
  on conflict ("momentId", "userId") do update set emoji = excluded.emoji, "createdAt" = now();
  insert into public."MomentView" ("momentId", "userId") values (p_moment, v_me) on conflict do nothing;
  get diagnostics v_new = row_count;
  if v_new > 0 then update public."Moment" set "viewCount" = "viewCount" + 1 where id = p_moment; end if;
  select slug into v_slug from public."Community" where id = v_m."communityId";
  select username into v_username from public."User" where id = v_m."userId";
  perform public.community_notify(v_m."userId", v_me, 'story_reaction', 'Reação na sua história',
    'reagiu ' || p_emoji || ' à sua história',
    case when v_slug is not null then '/comunidades/' || v_slug || '/historias?story=' || p_moment
         else '/perfil/' || coalesce(v_username, '') end,
    'sreact:' || p_moment || ':' || v_me);
end $function$;

revoke all on function public.story_view(text) from public, anon;
revoke all on function public.story_react(text, text) from public, anon;
grant execute on function public.story_view(text) to authenticated;
grant execute on function public.story_react(text, text) to authenticated;
