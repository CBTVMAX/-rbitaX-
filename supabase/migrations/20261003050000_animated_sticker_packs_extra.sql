-- 9 figurinhas que faltavam (recorte manual): Alienígenas · Vibes (Sério?, Bora comer?, Férias!, Valeu!,
-- Top!, Explorando...), Space Wolf (Modo noturno) e Astronauta X (Bora jogar?, Explorando...).
with add(pack, slug, label) as (values
  ('alien-x-vibes','serio','Sério?'),('alien-x-vibes','bora-comer','Bora comer?'),('alien-x-vibes','ferias','Férias!'),
  ('alien-x-vibes','valeu','Valeu!'),('alien-x-vibes','top','Top!'),('alien-x-vibes','explorando','Explorando...'),
  ('space-wolf','modo-noturno','Modo noturno'),('astronauta-x','bora-jogar','Bora jogar?'),('astronauta-x','explorando','Explorando...')
), upd as (
  update public."StickerPack" p
     set stickers = p.stickers || (select array_agg(a.slug) from add a where a.pack = p.id and not a.slug = any(p.stickers)),
         labels = p.labels || (select array_agg(a.label) from add a where a.pack = p.id and not a.slug = any(p.stickers)),
         "updatedAt" = now()
   where p.id in (select distinct pack from add)
     and exists (select 1 from add a where a.pack = p.id and not a.slug = any(p.stickers))
  returning p.id
)
insert into public."Sticker" (id, "packId", slug, label, keywords, storage, file, preview, format, mime, width, height, bytes, size, "hasText", rating, "sortOrder", active)
select a.pack || '/' || a.slug, a.pack, a.slug, a.label,
  array(select w from regexp_split_to_table(lower(regexp_replace(a.label, '[!?.()]', '', 'g')), ' +') w where char_length(w) > 1),
  'app', a.pack || '/' || a.slug || '.webp', a.pack || '/' || a.slug || '-s.webp', 'animated', 'image/webp', 256, 256, 115000, 'normal', true, 'livre',
  100 + row_number() over (partition by a.pack), true
from add a
on conflict (id) do update set label = excluded.label, file = excluded.file, preview = excluded.preview, format = 'animated', active = true;

update public."StoreProduct" sp
   set description = cardinality(p.stickers) || ' adesivos animados',
       meta = sp.meta || jsonb_build_object('count', cardinality(p.stickers))
  from public."StickerPack" p
 where sp."refId" = p.id and p.id in ('astronauta-x', 'space-wolf', 'alien-x', 'alien-x-vibes');
