-- Arquivos só para quem tem conta (parte 1): as validações passam a aceitar o endereço novo
-- /m/<bucket>/<caminho> (que confere o login) além do antigo endereço público do armazenamento.
do $$
declare f text; v_def text; v_new text;
begin
  foreach f in array array['admin_save_track', 'community_update', 'community_own_media', 'sheet_save'] loop
    select pg_get_functiondef(p.oid) into v_def from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = f limit 1;
    continue when v_def is null;
    v_new := replace(v_def, 'https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/', '(?:https://[a-z0-9]+\.supabase\.co/storage/v1/object/public|/m)/');
    v_new := replace(v_new, 'https://[a-z0-9]+[.]supabase[.]co/storage/v1/object/public/', '(?:https://[a-z0-9]+[.]supabase[.]co/storage/v1/object/public|/m)/');
    if v_new <> v_def then execute v_new; end if;
  end loop;
end $$;
