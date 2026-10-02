-- Papel de parede da conversa: aceita qualquer id de papel de parede do app (a lista fixa barrava
-- "orbita-clara" e os novos) e a foto da própria pessoa ("custom:<id>/wallpapers/<arquivo>").
alter table public."ConversationSetting" drop constraint if exists conversationsetting_wallpaper_check;
alter table public."ConversationSetting" add constraint conversationsetting_wallpaper_check check (
  wallpaper is null
  or wallpaper ~ '^[a-z0-9-]{1,40}$'
  or wallpaper ~ '^custom:[0-9a-f-]{36}/wallpapers/[0-9a-f-]{36}\.(webp|jpg)$'
);
