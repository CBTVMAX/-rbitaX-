-- Pacotes Pin-up (adultos, premium, animados), recortados das cartelas enviadas.
-- Arquivo completo (animado, 256 px) em private-stickers/<pack>/<slug>.webp — só quem tem o pack baixa;
-- prévia pública em public/stickers/<pack>/<slug>-s.webp.
with src(id, name, descr, price, ord, slugs, labels) as (values
('pinup-ela','Pin-up · Ela','Charme retrô com laço de bolinhas: beijinho, café, sextou, crush e muito mais. Animados, para conversas entre adultos.',150,204,array['beijinho','oi','lol','amor','bom-dia','boa-noite','acordando','miau','brava','foda-se','cafe','cafezinho','hmmm','de-boa','cheers','pra-voce','hmm','chorando','o-que','ai-meu-deus','apaixonada','selfie','na-estilo','to-quieta','segredo','pirulito','piscadinha','provocando','ops','deixa-pra-la','te-amo','abraco','pensativa','uau','uhu-por-favor','serio','preocupada','haha','gripada','nao','enfermeira','policial','trabalhando','estudando','spa','banho','cansada','foco','vamos','motoqueira','praia','viagem','on-line','parabens','sextou','diabinha','anjinha','frio','co-calor','to-com-fome','to-doente','musica','beijo','duvida','zzz'],array['Beijinho','Oi!','LOL','Amor','Bom dia!','Boa noite!','Acordando','Miau','Brava','Foda-se!','Café?','Cafezinho','Hmmm','De boa','Cheers!','Pra você','Hmm','Chorando','O quê?','Aí meu Deus','Apaixonada','Selfie','Na estilo','Tô quieta','Segredo','Pirulito','Piscadinha','Provocando','Ops!','Deixa pra lá','Te amo','Abraço','Pensativa','Uau','Uhu! Por favor','Sério?','Preocupada','Haha','Gripada','Não!','Enfermeira','Policial','Trabalhando','Estudando','Spa','Banho','Cansada','Foco','Vamos?','Motoqueira','Praia','Viagem','On-line','Parabéns!','Sextou!','Diabinha','Anjinha','Frio','Cô calor','Tô com fome','Tô doente','Música','Beijo','Dúvida','Zzz']),
('pinup-frases','Pin-up · Frases','A pin-up com as frases do dia a dia: oi, aff, que drama, partiu e cia. Animados, para conversas entre adultos.',120,205,array['oi','boa-noite','dormindo','cafe','de-boa','hmmm','lol','amo-isso','que-fofo','aff','serio','meu-deus','nao-aguento','eita','te-amo','beijos','amor','vem-ca','foda-se','to-cansada','shopping','to-com-fome','trabalhando','estudando','viagem','moto','hora-do-spa','netflix','saude','partiu','depois-eu-falo','visto','nao','sim','ok','to-de-olho','que-drama','calma','relaxa','chorando-de-rir','brava','anja','diabinha'],array['Oi!','Boa noite!','Dormindo','Café?','De boa','Hmmm','LOL','Amo isso!','Que fofo!','Aff...','Sério?','Meu Deus!','Não aguento!','Eita!','Te amo','Beijos','Amor','Vem cá','Foda-se!','Tô cansada','Shopping','Tô com fome','Trabalhando','Estudando','Viagem','Moto','Hora do spa','Netflix','Saúde!','Partiu!','Depois eu falo','Visto','Não!','Sim!','Ok!','Tô de olho','Que drama!','Calma!','Relaxa','Chorando de rir','Brava','Anja','Diabinha'])
), packs as (
  insert into public."StickerPack" (id, name, tier, "priceCoins", "isAdult", "sortOrder", cover, stickers, labels, active, section, category, animated, creator, description, categories, rating, published, featured, "isDefault", exclusive)
  select id, name, 'premium', price, true, ord, slugs[1], slugs, labels, true, 'adesivos', 'sensual', true, 'Órbita X', descr, array['sensual','flerte','sexy','adulto'], 'adulto', true, true, false, false from src
  on conflict (id) do update set name = excluded.name, "priceCoins" = excluded."priceCoins", cover = excluded.cover, stickers = excluded.stickers, labels = excluded.labels,
    animated = true, description = excluded.description, active = true, published = true, "updatedAt" = now()
  returning id
), prod as (
  insert into public."StoreProduct" (id, kind, "refId", name, description, image, "priceCoins", tier, "isAdult", badge, "sortOrder", active, meta)
  select 'pack-' || id, 'sticker_pack', id, name, cardinality(slugs) || ' adesivos animados', '/stickers/' || id || '/' || slugs[1] || '-s.webp', price, 'premium', true, 'Novo', ord, true,
    jsonb_build_object('about', descr, 'count', cardinality(slugs), 'rating', 'adulto', 'creator', 'Órbita X', 'section', 'adesivos', 'animated', true, 'category', 'sensual',
      'categories', to_jsonb(array['sensual','flerte','sexy','adulto']))
  from src
  on conflict (id) do update set name = excluded.name, description = excluded.description, image = excluded.image, "priceCoins" = excluded."priceCoins", meta = excluded.meta, active = true
  returning id
)
insert into public."Sticker" (id, "packId", slug, label, keywords, storage, file, preview, format, mime, width, height, bytes, size, "hasText", rating, "sortOrder", active)
select s.id || '/' || u.slug, s.id, u.slug, u.label,
  array(select w from regexp_split_to_table(lower(regexp_replace(u.label, '[!?.()]', '', 'g')), ' +') w where char_length(w) > 1) || array['pin-up', 'pinup'],
  'app-premium', s.id || '/' || u.slug || '.webp', s.id || '/' || u.slug || '-s.webp', 'animated', 'image/webp', 256, 256, 110000, 'normal', true, 'adulto', u.n, true
from src s cross join lateral unnest(s.slugs, s.labels) with ordinality as u(slug, label, n)
on conflict (id) do update set label = excluded.label, keywords = excluded.keywords, file = excluded.file, preview = excluded.preview, storage = 'app-premium',
  format = 'animated', width = 256, height = 256, rating = 'adulto', "sortOrder" = excluded."sortOrder", active = true;
