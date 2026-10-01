-- "Remover" na lista de Seguidores: a pessoa deixa de seguir você (sem bloquear e sem aviso).
-- A tabela Follow só deixa cada um apagar o próprio "seguir"; esta função cobre o outro lado.
create or replace function public.remove_follower(p_follower text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_me text := auth.uid()::text;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = 'insufficient_privilege'; end if;
  delete from "Notification" where "userId" = v_me and "actorId" = p_follower and type in ('follow', 'follow_request');
  delete from "Follow" where "followerId" = p_follower and "followingId" = v_me;
  return found;
end $$;

revoke all on function public.remove_follower(text) from public, anon;
grant execute on function public.remove_follower(text) to authenticated;
