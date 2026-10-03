-- Música do Órbita X
--   * Catálogo oficial (isOfficial): faixas com licença que permite uso comercial
--     (CC BY, CC BY-SA, CC0, domínio público), com crédito e link da fonte. Ninguém
--     além da equipe edita ou apaga.
--   * Faixas do usuário: só quem enviou edita, troca ou exclui; o arquivo precisa estar
--     na pasta da própria pessoa no armazenamento do Órbita X.
--   * Álbuns (Playlist): qualquer pessoa monta com faixas oficiais e as próprias, na
--     ordem que quiser.
--
-- Catálogo inicial (importado em 03/10/2026, direto no banco): 237 faixas de 58 álbuns em
-- 18 gêneros, de netlabels do Internet Archive com CC BY / CC BY-SA / CC0 e gravações de
-- Chopin do Musopen (CC0 / domínio público). Ficaram de fora licenças "não comercial" (NC),
-- itens marcados como domínio público sem garantia e covers/remixes de obras protegidas.
-- Cada faixa guarda licença, link da licença e página de origem (sourceUrl/sourceId).

alter table public."Track" alter column "userId" drop not null;
alter table public."Track" add column if not exists "isOfficial" boolean not null default false;
alter table public."Track" add column if not exists "isHidden" boolean not null default false;
alter table public."Track" add column if not exists genre text;
alter table public."Track" add column if not exists album text;
alter table public."Track" add column if not exists license text;
alter table public."Track" add column if not exists "licenseUrl" text;
alter table public."Track" add column if not exists "sourceUrl" text;
alter table public."Track" add column if not exists "sourceId" text;
alter table public."Track" add column if not exists "updatedAt" timestamptz not null default now();

create unique index if not exists track_source_id_key on public."Track" ("sourceId") where "sourceId" is not null;
create index if not exists track_official_genre_idx on public."Track" (genre, "createdAt") where "isOfficial" and not "isHidden";
create index if not exists track_user_idx on public."Track" ("userId", "createdAt");

-- Faixa oficial não tem dono; faixa de usuário sempre tem.
alter table public."Track" add constraint track_owner_kind check ("isOfficial" or "userId" is not null) not valid;
alter table public."Track" validate constraint track_owner_kind;

-- Usuário não cria faixa oficial e só aponta para arquivo da própria pasta.
create policy track_insert_user_file on public."Track" as restrictive for insert to authenticated
  with check (
    not "isOfficial"
    and "audioUrl" like 'https://%.supabase.co/storage/v1/object/public/media/' || (auth.uid())::text || '/%'
  );

create policy track_update_self on public."Track" for update to authenticated
  using ("userId" = (auth.uid())::text and not "isOfficial")
  with check ("userId" = (auth.uid())::text and not "isOfficial"
    and "audioUrl" like 'https://%.supabase.co/storage/v1/object/public/media/' || (auth.uid())::text || '/%');

-- Faixa oficial escondida pela equipe some do catálogo (e dos álbuns).
create policy track_hide_hidden on public."Track" as restrictive for select
  using (not "isHidden" or public.is_admin());

-- ------------------------------------------------------------------ Álbuns
create table if not exists public."Playlist" (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null references public."User"(id) on update cascade on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  description text check (description is null or char_length(description) <= 300),
  "coverUrl" text check ("coverUrl" is null or "coverUrl" ~* '^https://\S+$'),
  "isPublic" boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists playlist_user_idx on public."Playlist" ("userId", "updatedAt" desc);

create table if not exists public."PlaylistTrack" (
  id text primary key default gen_random_uuid()::text,
  "playlistId" text not null references public."Playlist"(id) on delete cascade,
  "trackId" text not null references public."Track"(id) on delete cascade,
  position integer not null default 0,
  "addedAt" timestamptz not null default now(),
  unique ("playlistId", "trackId")
);
create index if not exists playlist_track_order_idx on public."PlaylistTrack" ("playlistId", position);

alter table public."Playlist" enable row level security;
alter table public."PlaylistTrack" enable row level security;

create or replace function public.playlist_visible(p_playlist text)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from "Playlist" p
     where p.id = p_playlist
       and (p."userId" = (auth.uid())::text or (p."isPublic" and public.user_is_active(p."userId"))))
$function$;

create or replace function public.playlist_owned(p_playlist text)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (select 1 from "Playlist" p where p.id = p_playlist and p."userId" = (auth.uid())::text)
$function$;

create policy playlist_select on public."Playlist" for select
  using ("userId" = (auth.uid())::text or ("isPublic" and public.user_is_active("userId")));
create policy playlist_insert_self on public."Playlist" for insert to authenticated
  with check ("userId" = (auth.uid())::text);
create policy playlist_update_self on public."Playlist" for update to authenticated
  using ("userId" = (auth.uid())::text) with check ("userId" = (auth.uid())::text);
create policy playlist_delete_self on public."Playlist" for delete to authenticated
  using ("userId" = (auth.uid())::text);

create policy playlist_track_select on public."PlaylistTrack" for select
  using (public.playlist_visible("playlistId"));
create policy playlist_track_insert_owner on public."PlaylistTrack" for insert to authenticated
  with check (public.playlist_owned("playlistId"));
create policy playlist_track_update_owner on public."PlaylistTrack" for update to authenticated
  using (public.playlist_owned("playlistId")) with check (public.playlist_owned("playlistId"));
create policy playlist_track_delete_owner on public."PlaylistTrack" for delete to authenticated
  using (public.playlist_owned("playlistId"));

-- Limites e posição automática (fim da lista).
create or replace function public.playlist_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_table_name = 'Playlist' then
    if (select count(*) from "Playlist" where "userId" = new."userId") >= 200 then
      raise exception 'limite_albuns' using errcode = 'check_violation';
    end if;
  else
    if (select count(*) from "PlaylistTrack" where "playlistId" = new."playlistId") >= 500 then
      raise exception 'limite_faixas' using errcode = 'check_violation';
    end if;
    new.position := coalesce((select max(position) + 1 from "PlaylistTrack" where "playlistId" = new."playlistId"), 0);
    update "Playlist" set "updatedAt" = now() where id = new."playlistId";
  end if;
  return new;
end $function$;

create or replace trigger playlist_guard before insert on public."Playlist"
  for each row execute function public.playlist_guard();
create or replace trigger playlist_track_guard before insert on public."PlaylistTrack"
  for each row execute function public.playlist_guard();

-- Reordenar: a lista de faixas na nova ordem.
create or replace function public.reorder_playlist(p_playlist text, p_tracks text[])
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.playlist_owned(p_playlist) then raise exception 'forbidden' using errcode = 'insufficient_privilege'; end if;
  update "PlaylistTrack" pt set position = x.ord - 1
    from unnest(p_tracks) with ordinality as x(track_id, ord)
   where pt."playlistId" = p_playlist and pt."trackId" = x.track_id;
  update "Playlist" set "updatedAt" = now() where id = p_playlist;
end $function$;

-- Equipe: esconder/mostrar uma faixa do catálogo.
create or replace function public.admin_set_track_hidden(p_track text, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin_mfa() then raise exception 'admin_mfa_required' using errcode = 'insufficient_privilege'; end if;
  update "Track" set "isHidden" = p_hidden, "updatedAt" = now() where id = p_track and "isOfficial";
  if not found then raise exception 'not_found' using errcode = 'no_data_found'; end if;
end $function$;

revoke all on function public.reorder_playlist(text, text[]) from public, anon;
revoke all on function public.admin_set_track_hidden(text, boolean) from public, anon;
grant execute on function public.reorder_playlist(text, text[]) to authenticated;
grant execute on function public.admin_set_track_hidden(text, boolean) to authenticated;
