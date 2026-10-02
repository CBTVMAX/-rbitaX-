-- Fotos do perfil (estilo VK): fixar no topo, arquivar e remover várias de uma vez.
-- A tabela Media não dá UPDATE direto a ninguém, então tudo passa por estas funções,
-- que só mexem em fotos de publicações do próprio usuário.

alter table public."Media" add column if not exists "pinnedAt" timestamp;
alter table public."Media" add column if not exists "archivedAt" timestamp;
create index if not exists "Media_pinnedAt_idx" on public."Media" ("pinnedAt") where "pinnedAt" is not null;
create index if not exists "Media_archivedAt_idx" on public."Media" ("archivedAt") where "archivedAt" is not null;

-- Fixa (ou desafixa) fotos no topo do perfil.
create or replace function public.photo_set_pin(p_ids text[], p_pin boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  update public."Media" m
     set "pinnedAt" = case when p_pin then now() else null end
    from public."Post" p
   where p.id = m."postId"
     and p."authorId" = auth.uid()::text
     and p."communityId" is null
     and m.type = 'image'
     and m.id = any(p_ids)
     and (not p_pin or m."archivedAt" is null);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Arquiva (some dos álbuns e da vitrine para os outros) ou desarquiva fotos.
create or replace function public.photo_set_archived(p_ids text[], p_archive boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  update public."Media" m
     set "archivedAt" = case when p_archive then now() else null end,
         "pinnedAt" = case when p_archive then null else m."pinnedAt" end
    from public."Post" p
   where p.id = m."postId"
     and p."authorId" = auth.uid()::text
     and p."communityId" is null
     and m.type = 'image'
     and m.id = any(p_ids);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Remove fotos; a publicação que ficar sem mídia e sem texto também é apagada.
create or replace function public.photo_remove(p_ids text[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  v_posts text[];
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  select coalesce(array_agg(distinct m."postId"), '{}')
    into v_posts
    from public."Media" m
    join public."Post" p on p.id = m."postId"
   where p."authorId" = auth.uid()::text
     and p."communityId" is null
     and m.type = 'image'
     and m.id = any(p_ids);

  delete from public."Media" m
   where m.id = any(p_ids)
     and m.type = 'image'
     and m."postId" = any(v_posts);
  get diagnostics n = row_count;

  delete from public."Post" p
   where p.id = any(v_posts)
     and coalesce(btrim(p.content), '') = ''
     and not exists (select 1 from public."Media" x where x."postId" = p.id);
  return n;
end;
$$;

revoke all on function public.photo_set_pin(text[], boolean) from public, anon;
revoke all on function public.photo_set_archived(text[], boolean) from public, anon;
revoke all on function public.photo_remove(text[]) from public, anon;
grant execute on function public.photo_set_pin(text[], boolean) to authenticated;
grant execute on function public.photo_set_archived(text[], boolean) to authenticated;
grant execute on function public.photo_remove(text[]) to authenticated;
