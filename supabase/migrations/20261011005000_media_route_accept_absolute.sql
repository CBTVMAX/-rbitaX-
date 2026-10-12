-- Arquivos só para quem tem conta: os endereços de arquivo passam a ser completos
-- (https://orbitax.social.br/m/<bucket>/<caminho>), porque várias tabelas exigem links https.
do $$
declare f text; v_def text; v_new text;
begin
  foreach f in array array['admin_save_track', 'community_update', 'community_own_media', 'sheet_save'] loop
    select pg_get_functiondef(p.oid) into v_def from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = f limit 1;
    continue when v_def is null;
    v_new := replace(v_def, '|/m)/', '|(?:https://(?:www\.)?orbitax\.social\.br)?/m)/');
    if v_new <> v_def then execute v_new; end if;
  end loop;
end $$;
