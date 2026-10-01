-- Comunidades no perfil: o dono escolhe quais aparecem publicamente (Configurações → Comunidades no perfil).
alter table public."User" add column if not exists "hiddenProfileCommunities" text[] not null default '{}';
-- Escrita só pelo dono (RLS user_update_self). Sem grant de SELECT: visitantes não descobrem o que foi escondido.
grant update ("hiddenProfileCommunities") on public."User" to authenticated;

-- O dono recebe a própria lista; qualquer outra pessoa recebe vazio.
create or replace function public.profile_hidden_communities(p_user text)
returns text[]
language sql stable security definer set search_path = public
as $$
  select case when auth.uid() is not null and auth.uid()::text = p_user
    then coalesce((select "hiddenProfileCommunities" from "User" where id = p_user), '{}')
    else '{}'::text[] end
$$;

-- Para visitantes: comunidades desta pessoa que podem aparecer no perfil (respeita a visibilidade da comunidade).
create or replace function public.profile_visible_community_ids(p_user text)
returns setof text
language sql stable security definer set search_path = public
as $$
  select m."communityId" from "CommunityMember" m
  where m."userId" = p_user
    and (m."userId" = auth.uid()::text or public.community_visible(auth.uid()::text, m."communityId"))
    and not (m."communityId" = any (coalesce((select "hiddenProfileCommunities" from "User" where id = p_user), '{}')))
$$;

revoke all on function public.profile_hidden_communities(text) from public, anon;
revoke all on function public.profile_visible_community_ids(text) from public, anon;
grant execute on function public.profile_hidden_communities(text) to authenticated;
grant execute on function public.profile_visible_community_ids(text) to authenticated;
