-- "Sugerir posts" passa a ser uma permissão do dono (desligada até ele liberar em Permissões).
-- Níveis: "members" ou "all" = quem participa pode sugerir; "admins"/"owner" (ou sem valor) = desligado.
-- (Sem os operadores de seta do jsonb: o SQL é colado no editor e eles se corrompem na colagem.)

alter function public.community_suggest_post(text, jsonb) rename to community_suggest_post_core;
revoke all on function public.community_suggest_post_core(text, jsonb) from public, anon, authenticated;

create or replace function public.community_suggest_post(p_community text, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_level text;
begin
  select coalesce(jsonb_extract_path_text(permissions, 'suggest'), 'admins') into v_level
    from public."Community" where id = p_community;
  if v_level is null then raise exception 'not_found' using errcode = 'no_data_found'; end if;
  if v_level not in ('all', 'members') then
    raise exception 'suggestions_off' using errcode = 'insufficient_privilege';
  end if;
  return public.community_suggest_post_core(p_community, p);
end;
$$;

-- Só o dono liga/desliga as sugestões.
create or replace function public.community_set_suggestions(p_community text, p_level text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.community_rank(public.community_role(auth.uid()::text, p_community)) < 4 then
    raise exception 'owner_only' using errcode = 'insufficient_privilege';
  end if;
  if p_level not in ('all', 'members', 'admins', 'owner') then
    raise exception 'invalid_permission' using errcode = 'check_violation';
  end if;
  update public."Community"
     set permissions = permissions || jsonb_build_object('suggest', p_level), "updatedAt" = now()
   where id = p_community;
end;
$$;

revoke all on function public.community_suggest_post(text, jsonb) from public, anon;
revoke all on function public.community_set_suggestions(text, text) from public, anon;
grant execute on function public.community_suggest_post(text, jsonb) to authenticated;
grant execute on function public.community_set_suggestions(text, text) to authenticated;
