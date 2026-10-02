-- Logo "ÓRBITA X" de cada cartela vira adesivo animado (no fim de cada pacote).
with add(pack) as (values ('astronauta-x'), ('space-wolf'), ('alien-x'), ('alien-x-vibes')),
upd as (
  update public."StickerPack" p
     set stickers = p.stickers || array['orbita-x'], labels = p.labels || array['Órbita X'], "updatedAt" = now()
   where p.id in (select pack from add) and not 'orbita-x' = any(p.stickers)
  returning p.id
)
insert into public."Sticker" (id, "packId", slug, label, keywords, storage, file, preview, format, mime, width, height, bytes, size, "hasText", rating, "sortOrder", active)
select pack || '/orbita-x', pack, 'orbita-x', 'Órbita X', array['órbita', 'orbita', 'x', 'logo'], 'app', pack || '/orbita-x.webp', pack || '/orbita-x-s.webp',
  'animated', 'image/webp', 256, 256, 120000, 'normal', true, 'livre', 200, true
from add
on conflict (id) do update set file = excluded.file, preview = excluded.preview, format = 'animated', active = true;

update public."StoreProduct" sp
   set description = cardinality(p.stickers) || ' adesivos animados', meta = sp.meta || jsonb_build_object('count', cardinality(p.stickers))
  from public."StickerPack" p
 where sp."refId" = p.id and p.id in ('astronauta-x', 'space-wolf', 'alien-x', 'alien-x-vibes');
