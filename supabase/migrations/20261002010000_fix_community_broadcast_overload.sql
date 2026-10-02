-- Havia duas versões de community_broadcast (8 e 9 parâmetros, ambas com padrão no fim).
-- Uma chamada com 7 argumentos casava com as duas e o banco recusava ("is not unique"),
-- derrubando a criação de discussões (e de tudo que avisa os membros).
-- Fica só a versão nova, respeitando também quem desligou as notificações (notify = false).
drop function if exists public.community_broadcast(text, text, text, text, text, text, text, text);

create or replace function public.community_broadcast(
  p_community text, p_actor text, p_type text, p_title text, p_message text, p_href text, p_key text,
  p_post text default null, p_announcement boolean default false
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.community_notify(m."userId", p_actor, p_type, p_title, p_message, p_href, p_key, p_post)
     from public."CommunityMember" m
    where m."communityId" = p_community and m."userId" <> p_actor and m.notify
      and (m."notifyLevel" = 'all' or (m."notifyLevel" = 'announcements' and p_announcement))
    order by m."createdAt" limit 5000;
end $$;

revoke all on function public.community_broadcast(text, text, text, text, text, text, text, text, boolean) from public, anon, authenticated;
