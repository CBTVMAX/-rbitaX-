-- Admin → Músicas: a equipe sobe músicas (arquivo ou link do YouTube) para o catálogo oficial,
-- edita, oculta e exclui. Só administradores com verificação em duas etapas (como as demais
-- ações do painel). Arquivos ficam no armazenamento do Órbita X (bucket media, pasta do admin).

create or replace function public.admin_save_track(
  p_id text,
  p_title text,
  p_artist text,
  p_album text,
  p_genre text,
  p_audio_url text,
  p_cover_url text,
  p_youtube_id text,
  p_duration integer,
  p_license text
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id text := coalesce(nullif(p_id, ''), gen_random_uuid()::text);
  v_audio text;
  v_cover text := nullif(btrim(coalesce(p_cover_url, '')), '');
  v_source text;
begin
  if not public.is_admin_mfa() then
    raise log 'orbitax_security admin_denied fn=admin_save_track user=%', auth.uid();
    raise exception 'admin_mfa_required' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(btrim(p_title), '') = '' or coalesce(btrim(p_artist), '') = '' then
    raise exception 'titulo_artista_obrigatorios' using errcode = 'check_violation';
  end if;
  if coalesce(btrim(p_genre), '') = '' or length(p_genre) > 40 then
    raise exception 'categoria_invalida' using errcode = 'check_violation';
  end if;

  -- Edição: só dados e capa (o arquivo ou vídeo não muda).
  if nullif(p_id, '') is not null then
    null;
  elsif nullif(p_youtube_id, '') is not null then
    if p_youtube_id !~ '^[A-Za-z0-9_-]{11}$' then raise exception 'youtube_invalido' using errcode = 'check_violation'; end if;
    v_audio := 'https://www.youtube.com/watch?v=' || p_youtube_id;
    v_cover := coalesce(v_cover, 'https://i.ytimg.com/vi/' || p_youtube_id || '/mqdefault.jpg');
    v_source := 'yt:' || p_youtube_id;
  else
    v_audio := btrim(coalesce(p_audio_url, ''));
    if v_audio !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/media/\S+$' then
      raise exception 'arquivo_invalido' using errcode = 'check_violation';
    end if;
    v_source := 'upload:' || v_id;
  end if;
  if v_cover is not null and v_cover !~* '^https://\S+$' then raise exception 'capa_invalida' using errcode = 'check_violation'; end if;

  if nullif(p_id, '') is null then
    if exists (select 1 from "Track" where "sourceId" = v_source) then
      raise exception 'ja_existe' using errcode = 'unique_violation';
    end if;
    insert into "Track" (id, "userId", title, artist, album, genre, "audioUrl", "coverUrl", "youtubeId", duration,
                         "isOfficial", license, "sourceUrl", "sourceId")
    values (v_id, null, left(btrim(p_title), 120), left(btrim(p_artist), 120), nullif(left(btrim(coalesce(p_album, '')), 120), ''),
            p_genre, v_audio, v_cover, nullif(p_youtube_id, ''), p_duration, true,
            nullif(left(btrim(coalesce(p_license, '')), 160), ''),
            case when nullif(p_youtube_id, '') is not null then v_audio end, v_source);
  else
    update "Track"
       set title = left(btrim(p_title), 120), artist = left(btrim(p_artist), 120),
           album = nullif(left(btrim(coalesce(p_album, '')), 120), ''), genre = p_genre,
           "coverUrl" = coalesce(v_cover, "coverUrl"),
           duration = coalesce(p_duration, duration),
           license = coalesce(nullif(left(btrim(coalesce(p_license, '')), 160), ''), license),
           "updatedAt" = now()
     where id = p_id and "isOfficial";
    if not found then raise exception 'not_found' using errcode = 'no_data_found'; end if;
  end if;

  perform public.security_log(null, 'admin_music_saved', 'info', jsonb_build_object('track', v_id), null, null, 'track', v_id, 'success');
  return v_id;
end $function$;

-- Administrador (com verificação em duas etapas) pode remover música do catálogo oficial;
-- o painel apaga o arquivo do armazenamento em seguida.
create policy track_admin_remove_official on public."Track" for delete to authenticated
  using ("isOfficial" and public.is_admin_mfa());

revoke all on function public.admin_save_track(text, text, text, text, text, text, text, text, integer, text) from public, anon;
grant execute on function public.admin_save_track(text, text, text, text, text, text, text, text, integer, text) to authenticated;

-- O bucket media passa a aceitar FLAC (os demais formatos de áudio já eram aceitos).
update storage.buckets set allowed_mime_types = array_append(allowed_mime_types, 'audio/flac')
 where id = 'media' and not ('audio/flac' = any(allowed_mime_types));
