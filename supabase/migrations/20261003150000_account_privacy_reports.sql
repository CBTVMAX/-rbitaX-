-- Conta e privacidade (LGPD) + denúncias globais.
--   * export_my_data():        tudo o que a conta produziu, em um único JSON para download.
--   * my_storage_files():      arquivos enviados pela conta (para apagar antes de excluir).
--   * account_deletion_check(text): regras da exclusão de conta (o login é removido pelo servidor).
--   * Report: denúncias de posts do feed, perfis e mensagens, com cópia da mensagem
--     denunciada (a prova continua com a moderação mesmo se o autor apagar).

-- ------------------------------------------------------------------ Denúncias
alter table public."Report" add column if not exists "targetSnapshot" jsonb;

create or replace function public.report_community_fill()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_msg record;
begin
  new."communityId" := case new."targetType"
    when 'community_post' then (select "communityId" from "Post" where id = new."targetId")
    when 'community_comment' then (select p."communityId" from "Comment" c join "Post" p on p.id = c."postId" where c.id = new."targetId")
    when 'community_discussion' then (select "communityId" from "CommunityDiscussion" where id = new."targetId")
    when 'community_reply' then (select d."communityId" from "CommunityDiscussionReply" r join "CommunityDiscussion" d on d.id = r."discussionId" where r.id = new."targetId")
    when 'community' then (select id from "Community" where id = new."targetId")
    else null end;
  if new."targetType" like 'community%' and new."communityId" is null then raise exception 'invalid_report' using errcode = 'check_violation'; end if;
  if new."communityId" is not null and not public.community_visible(new."reporterId", new."communityId") then raise exception 'invalid_report' using errcode = 'check_violation'; end if;

  -- Denúncias que vão para a equipe do Órbita X.
  if new."targetType" = 'user' then
    if new."targetId" = new."reporterId" or not exists (select 1 from "User" where id = new."targetId") then
      raise exception 'invalid_report' using errcode = 'check_violation';
    end if;
  elsif new."targetType" = 'post' then
    if not exists (select 1 from "Post" where id = new."targetId" and "authorId" <> new."reporterId") then
      raise exception 'invalid_report' using errcode = 'check_violation';
    end if;
  elsif new."targetType" = 'message' then
    select m.id, m."conversationId", m."senderId", m.content, m.type, m.attachments, m."createdAt"
      into v_msg from "Message" m where m.id = new."targetId" and m."deletedAt" is null;
    if v_msg.id is null or v_msg."senderId" = new."reporterId"
       or not public.is_conversation_member(v_msg."conversationId", new."reporterId") then
      raise exception 'invalid_report' using errcode = 'check_violation';
    end if;
    new."targetSnapshot" := jsonb_build_object(
      'conversationId', v_msg."conversationId", 'senderId', v_msg."senderId",
      'content', left(v_msg.content, 2000), 'type', v_msg.type,
      'attachments', v_msg.attachments, 'createdAt', v_msg."createdAt");
  end if;

  if new."targetType" in ('user', 'post', 'message') and exists (
    select 1 from "Report" r where r."reporterId" = new."reporterId" and r."targetType" = new."targetType"
      and r."targetId" = new."targetId" and r.status in ('open', 'pending')) then
    raise exception 'already_reported' using errcode = 'unique_violation';
  end if;

  new.status := 'open';
  return new;
end $function$;

-- O painel do admin trata "Pendentes" como abertas (status 'open', que é o que o gatilho grava).
create or replace function public.admin_reports(p_status text default 'pending', p_limit integer default 40, p_offset integer default 0)
returns table(id text, "targetType" text, "targetId" text, reason text, details text, status text, "createdAt" timestamp without time zone,
              "reporterName" text, "reporterUsername" text, "targetLabel" text, total bigint)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = 'insufficient_privilege'; end if;
  return query
  with base as (
    select r.* from "Report" r
     where p_status is null or p_status = 'all' or r.status = p_status
        or (p_status = 'pending' and r.status = 'open'))
  select b.id, b."targetType", b."targetId", b.reason, left(b.details, 300),
         case when b.status = 'open' then 'pending' else b.status end, b."createdAt",
         (select u.name from "User" u where u.id = b."reporterId"),
         (select u.username from "User" u where u.id = b."reporterId"),
         case b."targetType"
           when 'user' then (select coalesce('@' || u.username, u.name) from "User" u where u.id = b."targetId")
           when 'post' then (select coalesce(nullif(left(p.content, 120), ''), 'Post sem texto') from "Post" p where p.id = b."targetId")
           when 'community' then (select ct.name from "Community" ct where ct.id = b."targetId")
           when 'message' then coalesce(
             (select coalesce('@' || u.username, u.name) from "User" u where u.id = jsonb_extract_path_text(b."targetSnapshot", 'senderId')), '—')
             || ': ' || coalesce(nullif(left(jsonb_extract_path_text(b."targetSnapshot", 'content'), 120), ''),
                                 '[' || coalesce(jsonb_extract_path_text(b."targetSnapshot", 'type'), 'mídia') || ']')
           else b."targetId" end,
         (select count(*) from base)
    from base b
   order by (b.status in ('open', 'pending')) desc, b."createdAt" desc
   limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $function$;

-- ------------------------------------------------------------------ Exportar meus dados
create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid text := auth.uid()::text;
  v_out jsonb;
  v_rows jsonb;
  v_item text;
  v_tbl text;
  v_col text;
  -- Segredos técnicos que não fazem parte dos dados pessoais da conta.
  v_strip text[] := array['passwordHash', 'tokenHash', 'p256dh', 'auth', 'endpoint', 'ipHash', 'uaHash', 'googleId'];
  v_sources text[] := array[
    'Profile:userId', 'Post:authorId', 'Comment:userId', 'Like:userId', 'Share:userId', 'Bookmark:userId',
    'PollVote:userId', 'PostPollVote:userId', 'Moment:userId', 'MomentReaction:userId', 'MomentPollVote:userId',
    'Message:senderId', 'MessageReaction:userId', 'MessageFavorite:userId', 'ConversationMember:userId', 'ConversationSetting:userId',
    'Friendship:requesterId', 'Friendship:addresseeId', 'Follow:followerId', 'Follow:followingId',
    'Block:blockerId', 'FamilyLink:userId', 'FamilyLink:relativeId', 'Testimonial:authorId', 'Testimonial:profileId',
    'CommunityMember:userId', 'CommunityFavorite:userId', 'CommunityDiscussion:authorId', 'CommunityDiscussionReply:userId',
    'CommunityDiscussionLike:userId', 'CommunityEventRsvp:userId', 'CommunityJoinRequest:userId', 'CommunitySheet:userId',
    'StickerFavorite:userId', 'StickerPackFavorite:userId', 'UserStickerPack:userId', 'UserInventory:userId',
    'VirtualGift:senderId', 'VirtualGift:recipientId', 'CoinWallet:userId', 'CoinTransaction:userId',
    'DiamondOrder:userId', 'Payment:userId', 'Track:userId', 'Call:callerId', 'Call:calleeId', 'DiceRoll:userId',
    'Report:reporterId', 'VerificationRequest:userId', 'SecurityEvent:userId', 'UserSession:userId'];
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = 'insufficient_privilege'; end if;

  select jsonb_build_object(
           'formato', 'orbitax-export-v1',
           'geradoEm', now(),
           'conta', to_jsonb(u) - v_strip)
    into v_out
    from "User" u where u.id = v_uid;
  if v_out is null then raise exception 'not_found' using errcode = 'no_data_found'; end if;

  foreach v_item in array v_sources loop
    v_tbl := split_part(v_item, ':', 1);
    v_col := split_part(v_item, ':', 2);
    if to_regclass(format('public.%I', v_tbl)) is null then continue; end if;
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(t) - $2), ''[]''::jsonb) from (select * from public.%I where %I = $1 limit 10000) t',
      v_tbl, v_col)
      into v_rows using v_uid, v_strip;
    if jsonb_array_length(v_rows) > 0 then
      v_out := jsonb_set(v_out, array[v_tbl || '.' || v_col], v_rows);
    end if;
  end loop;

  perform public.security_log(v_uid, 'data_export', 'info', '{}'::jsonb, null, null, 'user', v_uid, 'success');
  return v_out;
end $function$;

-- ------------------------------------------------------------------ Arquivos da conta
create or replace function public.my_storage_files()
returns table(bucket text, name text)
language sql
stable security definer
set search_path to 'public'
as $function$
  select o.bucket_id::text, o.name
    from storage.objects o
   where auth.uid() is not null
     and ((o.bucket_id = 'media' and (storage.foldername(o.name))[1] = auth.uid()::text)
       or (o.bucket_id = 'chat' and ((storage.foldername(o.name))[2] = auth.uid()::text
                                  or ((storage.foldername(o.name))[1] = auth.uid()::text and (storage.foldername(o.name))[2] = 'avatar'))))
   limit 5000
$function$;

-- ------------------------------------------------------------------ Excluir conta
-- Regras e preparação da exclusão. A remoção do login (auth.users) é feita pelo servidor
-- do site (/api/conta/excluir) com a chave de serviço; o gatilho on_auth_user_deleted
-- apaga o perfil e o cascade leva o restante.
create or replace function public.account_deletion_check(p_confirm text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid text := auth.uid()::text;
  v_owned int;
  v_conv record;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = 'insufficient_privilege'; end if;
  if coalesce(upper(trim(p_confirm)), '') <> 'EXCLUIR' then raise exception 'confirmacao_invalida' using errcode = 'check_violation'; end if;
  if exists (select 1 from "User" where id = v_uid and role in ('admin', 'owner')) then
    raise exception 'conta_administrativa' using errcode = 'insufficient_privilege';
  end if;
  select count(*) into v_owned from "Community" where "ownerId" = v_uid and coalesce(status, '') <> 'deleted';
  if v_owned > 0 then raise exception 'possui_comunidades:%', v_owned using errcode = 'check_violation'; end if;

  -- Grupos de conversa: a posse passa para o membro mais antigo (admins primeiro).
  for v_conv in
    select cm."conversationId" from "ConversationMember" cm where cm."userId" = v_uid and cm.role = 'owner'
  loop
    update "ConversationMember" set role = 'owner'
     where id = (select m.id from "ConversationMember" m
                  where m."conversationId" = v_conv."conversationId" and m."userId" <> v_uid
                  order by (m.role = 'admin') desc, m."createdAt" asc limit 1);
  end loop;

  perform public.security_log(null, 'account_deleted', 'warning', jsonb_build_object('userId', v_uid), null, null, 'user', v_uid, 'success');
  return jsonb_build_object('userId', v_uid);
end $function$;

alter function public.export_my_data() volatile;

revoke all on function public.export_my_data() from public, anon;
revoke all on function public.my_storage_files() from public, anon;
revoke all on function public.account_deletion_check(text) from public, anon;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.my_storage_files() to authenticated;
grant execute on function public.account_deletion_check(text) to authenticated;
