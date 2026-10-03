-- Música completa pelo tocador oficial do YouTube (o YouTube licencia e paga os direitos).
-- Faixa com youtubeId toca no player incorporado; audioUrl guarda o link do vídeo.
--
-- Catálogo de hits (importado em 03/10/2026, direto no banco): 132 vídeos oficiais (canais
-- dos artistas, gravadoras, VEVO ou "Topic" do YouTube), conferidos um a um pelo oEmbed do
-- YouTube (existe + permite incorporar). Vídeos de canais de terceiros ficaram de fora.
-- Gêneros: hits, rock-classico, rock-anos-90, rock-anos-2000, hits-anos-80, pop-rock.
alter table public."Track" add column if not exists "youtubeId" text;
alter table public."Track" add constraint track_youtube_id_format
  check ("youtubeId" is null or "youtubeId" ~ '^[A-Za-z0-9_-]{11}$') not valid;
alter table public."Track" validate constraint track_youtube_id_format;
create unique index if not exists track_official_youtube_key on public."Track" ("youtubeId") where "isOfficial" and "youtubeId" is not null;

-- Usuário pode adicionar música por link do YouTube (além de arquivo na própria pasta).
alter policy track_insert_user_file on public."Track"
  with check (
    not "isOfficial"
    and (
      ("youtubeId" is null and "audioUrl" like 'https://%.supabase.co/storage/v1/object/public/media/' || (auth.uid())::text || '/%')
      or ("youtubeId" is not null and "audioUrl" = 'https://www.youtube.com/watch?v=' || "youtubeId")
    )
  );

alter policy track_update_self on public."Track"
  using ("userId" = (auth.uid())::text and not "isOfficial")
  with check (
    "userId" = (auth.uid())::text and not "isOfficial"
    and (
      ("youtubeId" is null and "audioUrl" like 'https://%.supabase.co/storage/v1/object/public/media/' || (auth.uid())::text || '/%')
      or ("youtubeId" is not null and "audioUrl" = 'https://www.youtube.com/watch?v=' || "youtubeId")
    )
  );
