-- Comunidades no modelo do VK:
--  • Quem não pode publicar (o padrão para membros) pode SUGERIR um post: ele entra na fila da
--    moderação marcado como sugestão, a equipe é avisada e decide publicar ou recusar.
--  • Discussões passam a ser só da administração por padrão; o dono libera em Gerenciar → Permissões.
-- (Sem os operadores de seta do jsonb: o SQL é colado no editor e eles se corrompem na colagem.)

create or replace function public.community_suggest_post(p_community text, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me text := auth.uid()::text;
  v_c record;
  v_kind text := coalesce(jsonb_extract_path_text(p, 'kind'), 'text');
  v_content text := btrim(coalesce(jsonb_extract_path_text(p, 'content'), ''));
  v_media jsonb := coalesce(jsonb_extract_path(p, 'media'), '[]'::jsonb);
  v_link text := nullif(btrim(coalesce(jsonb_extract_path_text(p, 'linkUrl'), '')), '');
  v_id text := gen_random_uuid()::text;
  v_name text;
  v_staff text;
  m jsonb;
  i int := 0;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  select * into v_c from public."Community" where id = p_community;
  if not found then raise exception 'not_found' using errcode = 'no_data_found'; end if;
  if v_c.status = 'disabled' then raise exception 'community_disabled' using errcode = 'insufficient_privilege'; end if;
  if public.community_rank(public.community_role(v_me, p_community)) < 1 then
    raise exception 'not_member' using errcode = 'insufficient_privilege';
  end if;
  if public.community_is_banned(v_me, p_community) or public.community_is_muted(v_me, p_community) then
    raise exception 'muted' using errcode = 'insufficient_privilege';
  end if;
  if v_kind not in ('text', 'image', 'gif', 'video', 'clip', 'link') then raise exception 'invalid_kind' using errcode = 'check_violation'; end if;
  if char_length(v_content) > 5000 then raise exception 'too_long' using errcode = 'check_violation'; end if;
  if jsonb_typeof(v_media) <> 'array' or jsonb_array_length(v_media) > 10 then raise exception 'invalid_media' using errcode = 'check_violation'; end if;
  if v_kind = 'text' and v_content = '' and jsonb_array_length(v_media) = 0 then raise exception 'empty_post' using errcode = 'check_violation'; end if;
  if v_kind in ('image', 'gif', 'video', 'clip') and jsonb_array_length(v_media) = 0 then raise exception 'missing_media' using errcode = 'check_violation'; end if;
  if v_link is not null and v_link !~ '^https?://[^\s]{3,2000}$' then raise exception 'invalid_link' using errcode = 'check_violation'; end if;
  if (select count(*) from public."Post" where "authorId" = v_me and "communityId" is not null and "createdAt" > now() - interval '1 hour') >= 30 then
    raise exception 'rate_limited' using errcode = 'check_violation';
  end if;
  if (select count(*) from public."Post" where "authorId" = v_me and "communityId" = p_community and "moderationStatus" = 'pending') >= 10 then
    raise exception 'too_many_suggestions' using errcode = 'check_violation';
  end if;

  perform set_config('orbitax.community_rpc', 'on', true);
  insert into public."Post" (id, "authorId", content, visibility, "updatedAt", kind, "linkUrl", "commentsEnabled", "communityId", meta, "moderationStatus", "isPinned", "authorType")
  values (v_id, v_me, v_content, 'community', now(), v_kind, v_link, true, p_community, jsonb_build_object('suggested', true), 'pending', false, 'user');
  for m in select * from jsonb_array_elements(v_media) loop
    if not public.community_own_media(v_me, jsonb_extract_path_text(m, 'url'))
       or (jsonb_extract_path_text(m, 'thumbnailUrl') is not null and not public.community_own_media(v_me, jsonb_extract_path_text(m, 'thumbnailUrl')))
       or coalesce(jsonb_extract_path_text(m, 'type'), '') not in ('image', 'video')
       or coalesce(jsonb_extract_path_text(m, 'sizeBytes')::bigint, 0) > 52428800 then
      raise exception 'invalid_media' using errcode = 'check_violation';
    end if;
    insert into public."Media" (id, "postId", type, url, "thumbnailUrl", width, height, "sizeBytes", "mimeType", position, name)
    values (gen_random_uuid()::text, v_id, jsonb_extract_path_text(m, 'type'), jsonb_extract_path_text(m, 'url'), jsonb_extract_path_text(m, 'thumbnailUrl'),
      jsonb_extract_path_text(m, 'width')::int, jsonb_extract_path_text(m, 'height')::int, jsonb_extract_path_text(m, 'sizeBytes')::int,
      left(jsonb_extract_path_text(m, 'mimeType'), 100), i, left(nullif(btrim(jsonb_extract_path_text(m, 'name')), ''), 200));
    i := i + 1;
  end loop;
  perform set_config('orbitax.community_rpc', '', true);

  -- Avisa o dono e a equipe (administradores e moderadores).
  select name into v_name from public."User" where id = v_me;
  for v_staff in
    select v_c."ownerId"
    union
    select cm."userId" from public."CommunityMember" cm
     where cm."communityId" = p_community and cm.role in ('owner', 'admin', 'moderator')
  loop
    perform public.community_notify(v_staff, v_me, 'community_suggestion', 'Nova sugestão em ' || v_c.name,
      coalesce(v_name, 'Alguém') || ' sugeriu um post: ' || left(coalesce(nullif(v_content, ''), 'mídia'), 100),
      '/comunidades/' || v_c.slug || '/gerenciar?secao=moderacao', 'csug:' || v_id, v_id);
  end loop;

  return jsonb_build_object('id', v_id, 'status', 'pending', 'suggested', true);
end;
$$;

-- Publicar (vai para o topo, como no VK) ou recusar uma sugestão; o autor é avisado.
create or replace function public.community_review_suggestion(p_post text, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me text := auth.uid()::text;
  v_p record;
  v_c record;
  v_name text;
begin
  select * into v_p from public."Post" where id = p_post and "communityId" is not null;
  if not found then raise exception 'not_found' using errcode = 'no_data_found'; end if;
  if not public.community_staff(v_me, v_p."communityId", 2) then raise exception 'forbidden' using errcode = 'insufficient_privilege'; end if;
  if v_p."moderationStatus" <> 'pending' then raise exception 'not_pending' using errcode = 'check_violation'; end if;
  select * into v_c from public."Community" where id = v_p."communityId";

  perform set_config('orbitax.community_rpc', 'on', true);
  update public."Post"
     set "moderationStatus" = case when p_approve then 'visible' else 'removed' end,
         "createdAt" = case when p_approve then now() else "createdAt" end
   where id = p_post;
  perform set_config('orbitax.community_rpc', '', true);

  if p_approve then
    perform public.community_notify(v_p."authorId", v_me, 'community_suggestion_ok', 'Sua sugestão foi publicada',
      'A administração de ' || v_c.name || ' publicou o seu post.', '/comunidades/' || v_c.slug || '?post=' || p_post, 'csugok:' || p_post, p_post);
    if coalesce(jsonb_extract_path_text(v_c."notifyPrefs", 'newPost')::boolean, true) then
      select name into v_name from public."User" where id = v_p."authorId";
      perform public.community_broadcast(v_p."communityId", v_p."authorId", 'community_post', 'Nova publicação em ' || v_c.name,
        coalesce(v_name, 'Alguém') || ': ' || left(coalesce(nullif(v_p.content, ''), 'publicou algo novo'), 120),
        '/comunidades/' || v_c.slug || '?post=' || p_post, 'cpost:' || p_post, p_post);
    end if;
  else
    perform public.community_notify(v_p."authorId", v_me, 'community_suggestion_no', 'Sugestão não publicada',
      'A administração de ' || v_c.name || ' não publicou o seu post desta vez.', '/comunidades/' || v_c.slug, 'csugno:' || p_post, null);
  end if;
end;
$$;

revoke all on function public.community_suggest_post(text, jsonb) from public, anon;
revoke all on function public.community_review_suggestion(text, boolean) from public, anon;
grant execute on function public.community_suggest_post(text, jsonb) to authenticated;
grant execute on function public.community_review_suggestion(text, boolean) to authenticated;

-- Discussões: só a administração por padrão (o dono libera para membros em Gerenciar → Permissões).
update public."Community"
   set permissions = permissions || '{"discussion": "admins"}'::jsonb
 where coalesce(jsonb_extract_path_text(permissions, 'discussion'), 'members') = 'members';

alter table public."Community" alter column permissions set default
  '{"link": "members", "poll": "admins", "post": "admins", "event": "admins", "photo": "admins", "story": "admins", "video": "admins", "invite": "members", "comment": "members", "mention": "members", "discussion": "admins"}'::jsonb;
