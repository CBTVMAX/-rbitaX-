-- Conta e aparência: preferências de conteúdo que acompanham a conta em qualquer aparelho.
create table if not exists public."UserPreference" (
  "userId" text primary key,
  prefs jsonb not null default '{}'::jsonb,
  "updatedAt" timestamptz not null default now()
);
alter table public."UserPreference" enable row level security;
create policy user_preference_select_own on public."UserPreference" for select to authenticated using ("userId" = auth.uid()::text);
grant select on public."UserPreference" to authenticated;

-- Valores aceitos (e o padrão de cada um).
create or replace function public.preferences_clean(p jsonb)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'feedOrder', case when p->>'feedOrder' in ('interesting', 'recent') then p->>'feedOrder' else 'interesting' end,
    'commentOrder', case when p->>'commentOrder' in ('top', 'new', 'old') then p->>'commentOrder' else 'top' end,
    'autoplayVideo', coalesce((p->>'autoplayVideo')::boolean, true),
    'autoplayGif', coalesce((p->>'autoplayGif')::boolean, true),
    'profanityFilter', coalesce((p->>'profanityFilter')::boolean, false)
  )
$$;

create or replace function public.my_preferences()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select public.preferences_clean(coalesce((select prefs from "UserPreference" where "userId" = auth.uid()::text), '{}'::jsonb))
$$;

create or replace function public.set_preference(p_key text, p_value jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_me text := auth.uid()::text; v_next jsonb;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_key not in ('feedOrder', 'commentOrder', 'autoplayVideo', 'autoplayGif', 'profanityFilter') then
    raise exception 'invalid_key' using errcode = '22023';
  end if;
  v_next := public.preferences_clean(public.my_preferences() || jsonb_build_object(p_key, p_value));
  insert into "UserPreference" ("userId", prefs, "updatedAt") values (v_me, v_next, now())
  on conflict ("userId") do update set prefs = excluded.prefs, "updatedAt" = now();
  return v_next;
end $$;

revoke all on function public.preferences_clean(jsonb), public.my_preferences(), public.set_preference(text, jsonb) from public, anon;
grant execute on function public.preferences_clean(jsonb), public.my_preferences(), public.set_preference(text, jsonb) to authenticated;
