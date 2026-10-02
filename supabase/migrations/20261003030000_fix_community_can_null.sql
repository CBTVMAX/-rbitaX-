-- Correção de segurança: community_can devolvia NULL (em vez de false) para quem não é membro quando
-- a regra era "admins" (v_role nulo em "v_role = 'editor'"). Como as funções fazem
-- "if not community_can(...) then raise", NULL deixava passar: quem não participava conseguia criar
-- discussões/posts. Agora a resposta é sempre true/false.
-- Também corrige comunidades sem "ownerId" (o dono continua no CommunityMember com cargo owner).
-- (Sem os operadores de seta do jsonb: o SQL é colado no editor e eles se corrompem na colagem.)

create or replace function public.community_can(p_user text, p_community text, p_action text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_c record;
  v_need text;
  v_role text;
  v_rank int;
begin
  if p_user is null then return false; end if;
  select * into v_c from public."Community" where id = p_community;
  if not found or coalesce(public.community_is_banned(p_user, p_community), false) then return false; end if;
  if p_action <> 'invite' and coalesce(public.community_is_muted(p_user, p_community), false) then return false; end if;
  -- Proprietário e concessões explícitas (cargo personalizado/override) liberam.
  if v_c."ownerId" is not null and v_c."ownerId" = p_user then return true; end if;
  if coalesce(public.community_grants(p_user, p_community, p_action), false) then return true; end if;
  v_role := public.community_role(p_user, p_community);
  v_rank := coalesce(public.community_rank(v_role), 0);
  v_need := coalesce(jsonb_extract_path_text(v_c.permissions, p_action), case when p_action in ('story', 'event', 'suggest') then 'admins' else 'members' end);
  return coalesce(case v_need
    when 'all' then (not v_c."isPrivate" or v_rank >= 1)
    when 'members' then v_rank >= 1
    when 'admins' then v_rank >= 3 or coalesce(v_role, '') = 'editor'
    when 'owner' then v_rank >= 4
    else v_rank >= 1 end, false);
end;
$$;

update public."Community" c
   set "ownerId" = (select m."userId" from public."CommunityMember" m where m."communityId" = c.id and m.role = 'owner' order by m."createdAt" limit 1)
 where c."ownerId" is null
   and exists (select 1 from public."CommunityMember" m where m."communityId" = c.id and m.role = 'owner');
