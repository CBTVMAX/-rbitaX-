-- Exclusão de conta com prazo para voltar atrás (como no VK, Facebook e Instagram).
-- Ao pedir a exclusão, a página fica desativada por 30 dias: some da busca, do feed,
-- dos comentários e dos stories, e o perfil mostra "Página excluída". Se a pessoa entrar
-- nesse período, pode restaurar tudo com um toque. Depois da data, uma tarefa agendada
-- do site apaga a conta de vez.

alter table public."User" add column if not exists "deleteAfter" timestamptz;

-- Conta desativada (aguardando exclusão)?
create or replace function public.user_is_active(p_user text)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select not exists (select 1 from "User" u where u.id = p_user and u."accountStatus" = 'deactivated')
$function$;

create or replace function public.is_user_deactivated(p_user text)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (select 1 from "User" u where u.id = p_user and u."accountStatus" = 'deactivated')
$function$;

-- Conteúdo de quem está desativado fica invisível para os outros (a própria pessoa ainda vê).
create policy post_hide_deactivated on public."Post" as restrictive for select
  using ("authorId" = (auth.uid())::text or public.user_is_active("authorId"));

create policy comment_hide_deactivated on public."Comment" as restrictive for select
  using ("userId" = (auth.uid())::text or public.user_is_active("userId"));

create policy moment_hide_deactivated on public."Moment" as restrictive for select
  using ("userId" = (auth.uid())::text or public.user_is_active("userId"));

-- Conversa individual com quem está desativado não recebe novas mensagens.
create policy message_no_deactivated_dm on public."Message" as restrictive for insert
  with check (not exists (
    select 1 from "Conversation" c
      join "ConversationMember" cm on cm."conversationId" = c.id and cm."userId" <> (auth.uid())::text
      join "User" u on u.id = cm."userId"
     where c.id = "Message"."conversationId" and not c."isGroup" and u."accountStatus" = 'deactivated'));

create or replace function public.can_view_user_content(p_owner text)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select case
    when auth.uid() is null or p_owner is null then false
    when p_owner = auth.uid()::text then true
    when not public.user_is_active(p_owner) then false
    when public.is_blocked_between(auth.uid()::text, p_owner) then false
    else coalesce((select not u."isPrivate" from "User" u where u.id = p_owner), false)
         or exists (select 1 from "Follow" f where f."followerId" = auth.uid()::text and f."followingId" = p_owner and f.status = 'accepted')
         or public.are_friends(auth.uid()::text, p_owner)
  end
$function$;

-- Pedir a exclusão: desativa agora e marca a data final.
create or replace function public.deactivate_my_account(p_confirm text)
returns timestamptz
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid text := auth.uid()::text;
  v_owned int;
  v_until timestamptz := now() + interval '30 days';
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = 'insufficient_privilege'; end if;
  if coalesce(upper(trim(p_confirm)), '') <> 'EXCLUIR' then raise exception 'confirmacao_invalida' using errcode = 'check_violation'; end if;
  if exists (select 1 from "User" where id = v_uid and role in ('admin', 'owner')) then
    raise exception 'conta_administrativa' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from "User" where id = v_uid and "accountStatus" <> 'active') then
    raise exception 'conta_indisponivel' using errcode = 'check_violation';
  end if;
  select count(*) into v_owned from "Community" where "ownerId" = v_uid and coalesce(status, '') <> 'deleted';
  if v_owned > 0 then raise exception 'possui_comunidades:%', v_owned using errcode = 'check_violation'; end if;

  update "User" set "accountStatus" = 'deactivated', "deleteAfter" = v_until, "updatedAt" = now() where id = v_uid;
  perform public.security_log(v_uid, 'account_deactivated', 'warning', jsonb_build_object('deleteAfter', v_until), null, null, 'user', v_uid, 'success');
  return v_until;
end $function$;

-- Situação da própria conta (para a tela "Restaurar página").
create or replace function public.my_deactivation()
returns timestamptz
language sql
stable security definer
set search_path to 'public'
as $function$
  select u."deleteAfter" from "User" u where u.id = auth.uid()::text and u."accountStatus" = 'deactivated'
$function$;

create or replace function public.restore_my_account()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_uid text := auth.uid()::text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = 'insufficient_privilege'; end if;
  update "User" set "accountStatus" = 'active', "deleteAfter" = null, "updatedAt" = now()
   where id = v_uid and "accountStatus" = 'deactivated' and "deleteAfter" > now();
  if not found then raise exception 'nao_restauravel' using errcode = 'check_violation'; end if;
  perform public.security_log(v_uid, 'account_restored', 'info', '{}'::jsonb, null, null, 'user', v_uid, 'success');
end $function$;

-- Tarefa agendada (chave de serviço): contas cujo prazo acabou.
create or replace function public.accounts_due_for_deletion()
returns setof text
language plpgsql
stable security definer
set search_path to 'public'
as $function$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'forbidden' using errcode = 'insufficient_privilege'; end if;
  return query select u.id from "User" u
    where u."accountStatus" = 'deactivated' and u."deleteAfter" <= now()
    order by u."deleteAfter" limit 50;
end $function$;

-- Preparação final: passa a posse dos grupos adiante e devolve os arquivos a apagar.
create or replace function public.finalize_account_deletion(p_user text)
returns table(bucket text, name text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_conv record;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'forbidden' using errcode = 'insufficient_privilege'; end if;
  if not exists (select 1 from "User" u where u.id = p_user and u."accountStatus" = 'deactivated' and u."deleteAfter" <= now()) then
    raise exception 'nao_vencida' using errcode = 'check_violation';
  end if;

  for v_conv in
    select cm."conversationId" from "ConversationMember" cm where cm."userId" = p_user and cm.role = 'owner'
  loop
    update "ConversationMember" set role = 'owner'
     where id = (select m.id from "ConversationMember" m
                  where m."conversationId" = v_conv."conversationId" and m."userId" <> p_user
                  order by (m.role = 'admin') desc, m."createdAt" asc limit 1);
  end loop;

  perform public.security_log(null, 'account_deleted', 'warning', jsonb_build_object('userId', p_user), null, null, 'user', p_user, 'success', 'system');

  return query
  select o.bucket_id::text, o.name from storage.objects o
   where (o.bucket_id = 'media' and (storage.foldername(o.name))[1] = p_user)
      or (o.bucket_id = 'chat' and ((storage.foldername(o.name))[2] = p_user
                                 or ((storage.foldername(o.name))[1] = p_user and (storage.foldername(o.name))[2] = 'avatar')))
   limit 5000;
end $function$;

revoke all on function public.deactivate_my_account(text) from public, anon;
revoke all on function public.my_deactivation() from public, anon;
revoke all on function public.restore_my_account() from public, anon;
revoke all on function public.accounts_due_for_deletion() from public, anon, authenticated;
revoke all on function public.finalize_account_deletion(text) from public, anon, authenticated;
revoke all on function public.is_user_deactivated(text) from public, anon;
grant execute on function public.deactivate_my_account(text) to authenticated;
grant execute on function public.my_deactivation() to authenticated;
grant execute on function public.restore_my_account() to authenticated;
grant execute on function public.is_user_deactivated(text) to authenticated;
grant execute on function public.accounts_due_for_deletion() to service_role;
grant execute on function public.finalize_account_deletion(text) to service_role;

-- A exclusão imediata deixa de existir: agora sempre passa pelo prazo de 30 dias.
revoke all on function public.account_deletion_check(text) from authenticated;

-- Chat: conversa individual com quem está desativado fica travada ("O perfil foi removido").
create or replace function public.conversation_send_status(conversation_id text)
returns text
language plpgsql
stable security definer
set search_path to 'public'
as $function$
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
  return 'ok';
end $function$;
