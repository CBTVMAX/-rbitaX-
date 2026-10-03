-- Catálogo de hits do Órbita X (importado em 03/10/2026, direto no banco).
--
-- Como foi montado:
--   1. Wikidata (SPARQL): músicas com "YouTube video ID" (P1651), ordenadas por fama
--      (número de Wikipédias com artigo): 2.000 internacionais, 307 brasileiras e 2.271
--      anteriores a 2000.
--   2. Cada vídeo conferido no oEmbed do YouTube (existe + permite incorporar), em lotes,
--      por uma tarefa do pg_cron (music_import.step), já desligada.
--   3. Seleção (music_import.selection): só canais oficiais (do artista, VEVO, "Topic" ou
--      gravadora); fora filmes, trailers, álbuns completos, remixes, karaokê, instrumentais,
--      ao vivo e hinos; uma versão por música (clipe oficial > Topic > áudio oficial);
--      categoria por década, rock e música brasileira.
--   4. 2.740 músicas novas somadas às 132 curadas à mão = 2.872 no catálogo.
-- O catálogo livre (artistas independentes, CC) ficou oculto (isHidden) por decisão do produto.
--
-- A área music_import fica fora do schema exposto pela API (sem permissão para anon/authenticated).
create schema if not exists music_import;
revoke all on schema music_import from public, anon, authenticated;

create table if not exists music_import.candidate (
  yt text primary key,
  title text,
  artist text,
  year int,
  links int,
  genres text,
  countries text,
  src text,
  req bigint,
  tries int not null default 0,
  status int,
  channel text,
  yt_title text,
  checked_at timestamptz
);

create or replace function music_import.norm(t text) returns text language sql immutable as $$
  select regexp_replace(lower(translate(coalesce(t, ''),
    'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ', 'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')), '[^a-z0-9]', '', 'g')
$$;
