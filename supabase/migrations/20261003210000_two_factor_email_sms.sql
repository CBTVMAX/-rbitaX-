-- Verificação em duas etapas sem app: código por e-mail ou SMS (como no VK), códigos de reserva
-- e "confiar neste aparelho". O app autenticador (fator nativo do Supabase) continua valendo.
--
-- Como protege: a sessão de quem ativou só passa a acessar dados depois de confirmar o código
-- (api_guard recusa as requisições até lá), e ações de administrador aceitam essa confirmação.
-- Códigos e tokens ficam só como hash; as tabelas não têm acesso pela API (sem políticas).

create table if not exists public."TwoFactor" (
  "userId" text primary key,
  "emailOn" boolean not null default false,
  phone text,
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."TwoFactorCode" (
  id uuid primary key default gen_random_uuid(),
  "userId" text not null,
  "sessionId" uuid not null,
  purpose text not null check (purpose in ('login', 'setup')),
  channel text not null check (channel in ('email', 'sms')),
  target text not null,
  "codeHash" text not null,
  attempts integer not null default 0,
  "expiresAt" timestamptz not null,
  "usedAt" timestamptz,
  "createdAt" timestamptz not null default now()
);
create index if not exists "TwoFactorCode_user_idx" on public."TwoFactorCode" ("userId", "createdAt" desc);

create table if not exists public."TwoFactorSession" (
  "sessionId" uuid primary key,
  "userId" text not null,
  method text not null,
  "verifiedAt" timestamptz not null default now()
);

create table if not exists public."TwoFactorDevice" (
  id uuid primary key default gen_random_uuid(),
  "userId" text not null,
  "tokenHash" text not null unique,
  label text,
  "expiresAt" timestamptz not null,
  "revokedAt" timestamptz,
  "createdAt" timestamptz not null default now()
);
create index if not exists "TwoFactorDevice_user_idx" on public."TwoFactorDevice" ("userId");

create table if not exists public."TwoFactorBackup" (
  id uuid primary key default gen_random_uuid(),
  "userId" text not null,
  "codeHash" text not null,
  "usedAt" timestamptz,
  "createdAt" timestamptz not null default now()
);
create index if not exists "TwoFactorBackup_user_idx" on public."TwoFactorBackup" ("userId");

alter table public."TwoFactor" enable row level security;
alter table public."TwoFactorCode" enable row level security;
alter table public."TwoFactorSession" enable row level security;
alter table public."TwoFactorDevice" enable row level security;
alter table public."TwoFactorBackup" enable row level security;
revoke all on public."TwoFactor", public."TwoFactorCode", public."TwoFactorSession", public."TwoFactorDevice", public."TwoFactorBackup" from anon, authenticated;

-- ---------------------------------------------------------------- utilidades
create or replace function public.tf_hash(p text)
returns text language sql immutable set search_path to '' as $$
  select encode(extensions.digest(p, 'sha256'), 'hex')
$$;

create or replace function public.tf_enabled(p_user text)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public."TwoFactor" t where t."userId" = p_user and (t."emailOn" or t.phone is not null))
$$;

/** Sessão atual passou pela segunda etapa (app autenticador ou código por e-mail/SMS). */
create or replace function public.second_factor_ok()
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or exists (select 1 from public."TwoFactorSession" s
                  where s."sessionId"::text = auth.jwt() ->> 'session_id' and s."userId" = auth.uid()::text)
$$;

create or replace function public.is_admin_mfa()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.is_admin() and public.second_factor_ok()
$$;

-- As funções de figurinhas checavam o aal direto; passam a aceitar também o código por e-mail/SMS.
do $$
declare r record; v_def text;
begin
  for r in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f' and p.proname like 'admin\_%'
  loop
    v_def := pg_get_functiondef(r.oid);
    if position($q$coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'$q$ in v_def) > 0 then
      execute replace(v_def, $q$coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'$q$, 'not public.second_factor_ok()');
    end if;
  end loop;
end $$;

-- Antes de cada requisição da API: sessão encerrada, conta suspensa e segunda etapa pendente.
create or replace function public.api_guard()
returns void language plpgsql stable security definer set search_path to '' as $function$
declare v_claims jsonb; v_uid text; v_sid text; v_status text;
begin
  begin
    v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then return;
  end;
  if v_claims is null or coalesce(v_claims ->> 'role', '') <> 'authenticated' then return; end if;
  v_uid := v_claims ->> 'sub';
  if v_uid is null or v_uid !~ '^[0-9a-f-]{36}$' then return; end if;
  v_sid := v_claims ->> 'session_id';

  if v_sid is not null and (v_sid !~ '^[0-9a-f-]{36}$'
      or not exists (select 1 from auth.sessions s where s.id = v_sid::uuid and s.user_id = v_uid::uuid)) then
    raise sqlstate 'PT401' using message = 'session_revoked', hint = 'Sua sessão foi encerrada. Entre novamente.';
  end if;

  select u."accountStatus" into v_status from public."User" u where u.id = v_uid;
  if v_status in ('suspended', 'banned', 'disabled') then
    raise sqlstate 'PT403' using message = 'account_suspended', hint = 'Esta conta está suspensa.';
  end if;

  if coalesce(v_claims ->> 'aal', 'aal1') <> 'aal2' then
    if exists (select 1 from auth.mfa_factors f where f.user_id = v_uid::uuid and f.status::text = 'verified') then
      raise sqlstate 'PT401' using message = 'mfa_required', hint = 'Confirme o código de verificação em duas etapas.';
    end if;
    -- Código por e-mail/SMS: só a checagem da própria tela de verificação passa antes da confirmação.
    if public.tf_enabled(v_uid)
       and not exists (select 1 from public."TwoFactorSession" s where s."sessionId"::text = v_sid and s."userId" = v_uid)
       and coalesce(current_setting('request.path', true), '') <> '/rpc/two_factor_gate' then
      raise sqlstate 'PT401' using message = 'mfa_required', hint = 'Confirme o código de verificação em duas etapas.';
    end if;
  end if;
end $function$;

-- Aparelhos conectados: conta como verificado também quem confirmou por e-mail/SMS.
create or replace function public.my_sessions()
returns table(id uuid, device text, ip text, "createdAt" timestamptz, "lastActiveAt" timestamptz, current boolean, "mfaVerified" boolean)
language sql stable security definer set search_path to '' as $$
  select s.id, public.device_label(s.user_agent), host(s.ip), s.created_at,
         greatest(s.created_at, s.updated_at, s.refreshed_at at time zone 'UTC'),
         s.id::text = (auth.jwt() ->> 'session_id'),
         s.aal::text = 'aal2' or exists (select 1 from public."TwoFactorSession" t where t."sessionId" = s.id)
    from auth.sessions s
   where s.user_id = auth.uid() and (s.not_after is null or s.not_after > now())
   order by (s.id::text = (auth.jwt() ->> 'session_id')) desc, 5 desc
   limit 50
$$;

-- ---------------------------------------------------------------- checagem da navegação (usuário)
/** 'ok' quando a sessão pode seguir; 'required' quando falta o código. Aceita aparelho confiável. */
create or replace function public.two_factor_gate(p_device text default null)
returns text language plpgsql security definer set search_path to '' as $$
declare v_uid text := auth.uid()::text; v_sid text := auth.jwt() ->> 'session_id';
begin
  if v_uid is null or v_sid is null or v_sid !~ '^[0-9a-f-]{36}$' then return 'required'; end if;
  if coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' or not public.tf_enabled(v_uid) then return 'ok'; end if;
  if exists (select 1 from public."TwoFactorSession" s where s."sessionId" = v_sid::uuid and s."userId" = v_uid) then return 'ok'; end if;
  if p_device is not null and length(p_device) between 32 and 128 and exists (
       select 1 from public."TwoFactorDevice" d
        where d."tokenHash" = public.tf_hash(p_device) and d."userId" = v_uid and d."revokedAt" is null and d."expiresAt" > now()) then
    insert into public."TwoFactorSession" ("sessionId", "userId", method) values (v_sid::uuid, v_uid, 'device')
    on conflict ("sessionId") do nothing;
    return 'ok';
  end if;
  return 'required';
end $$;

-- ---------------------------------------------------------------- operações do servidor (service role)
create or replace function public.tf_status(p_user text, p_session uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare t public."TwoFactor"; v_email text; v_aal text;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden' using errcode = 'insufficient_privilege'; end if;
  select * into t from public."TwoFactor" where "userId" = p_user;
  select u.email into v_email from auth.users u where u.id = p_user::uuid;
  select s.aal::text into v_aal from auth.sessions s where s.id = p_session and s.user_id = p_user::uuid;
  return jsonb_build_object(
    'enabled', coalesce(t."emailOn", false) or t.phone is not null,
    'emailOn', coalesce(t."emailOn", false),
    'email', v_email,
    'phone', t.phone,
    'totp', exists (select 1 from auth.mfa_factors f where f.user_id = p_user::uuid and f.status::text = 'verified' and f.factor_type::text = 'totp'),
    'backupLeft', (select count(*) from public."TwoFactorBackup" b where b."userId" = p_user and b."usedAt" is null),
    'devices', (select count(*) from public."TwoFactorDevice" d where d."userId" = p_user and d."revokedAt" is null and d."expiresAt" > now()),
    'sessionOk', v_aal = 'aal2' or exists (select 1 from public."TwoFactorSession" s where s."sessionId" = p_session and s."userId" = p_user)
  );
end $$;

create or replace function public.tf_issue(p_user text, p_session uuid, p_purpose text, p_channel text, p_target text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare t public."TwoFactor"; v_target text; v_code text; v_id uuid := gen_random_uuid();
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden' using errcode = 'insufficient_privilege'; end if;
  if p_purpose not in ('login', 'setup') or p_channel not in ('email', 'sms') then raise exception 'invalid' using errcode = 'check_violation'; end if;
  if not exists (select 1 from auth.sessions s where s.id = p_session and s.user_id = p_user::uuid) then
    raise exception 'session' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public."TwoFactorCode" c where c."userId" = p_user and c."createdAt" > now() - interval '45 seconds') then
    raise exception 'tf_wait' using errcode = 'check_violation';
  end if;
  if (select count(*) from public."TwoFactorCode" c where c."userId" = p_user and c."createdAt" > now() - interval '1 hour') >= 8 then
    raise exception 'tf_limit' using errcode = 'check_violation';
  end if;

  select * into t from public."TwoFactor" where "userId" = p_user;
  if p_channel = 'email' then
    select u.email into v_target from auth.users u where u.id = p_user::uuid;
    if v_target is null then raise exception 'tf_no_email' using errcode = 'check_violation'; end if;
    if p_purpose = 'login' and not coalesce(t."emailOn", false) then raise exception 'tf_channel_off' using errcode = 'check_violation'; end if;
  else
    v_target := case when p_purpose = 'login' then t.phone else p_target end;
    if v_target is null or v_target !~ '^\+[1-9][0-9]{9,14}$' then raise exception 'tf_phone' using errcode = 'check_violation'; end if;
  end if;

  update public."TwoFactorCode" set "usedAt" = now()
   where "userId" = p_user and "sessionId" = p_session and purpose = p_purpose and "usedAt" is null;
  v_code := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
  insert into public."TwoFactorCode" (id, "userId", "sessionId", purpose, channel, target, "codeHash", "expiresAt")
  values (v_id, p_user, p_session, p_purpose, p_channel, v_target, public.tf_hash(v_id::text || ':' || v_code), now() + interval '10 minutes');
  return jsonb_build_object('code', v_code, 'target', v_target, 'channel', p_channel);
end $$;

create or replace function public.tf_verify(p_user text, p_session uuid, p_purpose text, p_code text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g')); c public."TwoFactorCode"; v_backup uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden' using errcode = 'insufficient_privilege'; end if;

  -- Código de reserva (8 caracteres), só para entrar.
  if p_purpose = 'login' and v_code ~ '^[A-Z0-9]{8}$' then
    select b.id into v_backup from public."TwoFactorBackup" b
     where b."userId" = p_user and b."usedAt" is null and b."codeHash" = public.tf_hash(p_user || ':' || v_code) limit 1;
    if v_backup is null then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
    update public."TwoFactorBackup" set "usedAt" = now() where id = v_backup;
    insert into public."TwoFactorSession" ("sessionId", "userId", method) values (p_session, p_user, 'backup')
    on conflict ("sessionId") do update set method = 'backup', "verifiedAt" = now();
    return jsonb_build_object('ok', true, 'method', 'backup',
      'backupLeft', (select count(*) from public."TwoFactorBackup" b where b."userId" = p_user and b."usedAt" is null));
  end if;

  select * into c from public."TwoFactorCode" x
   where x."userId" = p_user and x."sessionId" = p_session and x.purpose = p_purpose and x."usedAt" is null
   order by x."createdAt" desc limit 1;
  if c.id is null or c."expiresAt" < now() then return jsonb_build_object('ok', false, 'reason', 'expired'); end if;
  if c.attempts >= 5 then
    update public."TwoFactorCode" set "usedAt" = now() where id = c.id;
    return jsonb_build_object('ok', false, 'reason', 'too_many');
  end if;
  if v_code !~ '^[0-9]{6}$' or public.tf_hash(c.id::text || ':' || v_code) <> c."codeHash" then
    update public."TwoFactorCode" set attempts = attempts + 1 where id = c.id;
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'left', greatest(0, 4 - c.attempts));
  end if;

  update public."TwoFactorCode" set "usedAt" = now() where id = c.id;
  if p_purpose = 'setup' then
    insert into public."TwoFactor" ("userId", "emailOn", phone)
    values (p_user, c.channel = 'email', case when c.channel = 'sms' then c.target end)
    on conflict ("userId") do update set
      "emailOn" = case when c.channel = 'email' then true else public."TwoFactor"."emailOn" end,
      phone = case when c.channel = 'sms' then c.target else public."TwoFactor".phone end,
      "updatedAt" = now();
  end if;
  insert into public."TwoFactorSession" ("sessionId", "userId", method) values (p_session, p_user, c.channel)
  on conflict ("sessionId") do update set method = excluded.method, "verifiedAt" = now();
  return jsonb_build_object('ok', true, 'method', c.channel, 'target', c.target);
end $$;

create or replace function public.tf_trust_device(p_user text, p_label text)
returns text language plpgsql security definer set search_path to '' as $$
declare v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden' using errcode = 'insufficient_privilege'; end if;
  insert into public."TwoFactorDevice" ("userId", "tokenHash", label, "expiresAt")
  values (p_user, public.tf_hash(v_token), left(p_label, 120), now() + interval '30 days');
  -- No máximo 10 aparelhos confiáveis: os mais antigos deixam de valer.
  update public."TwoFactorDevice" set "revokedAt" = now()
   where id in (select d.id from public."TwoFactorDevice" d where d."userId" = p_user and d."revokedAt" is null
                 order by d."createdAt" desc offset 10);
  return v_token;
end $$;

create or replace function public.tf_backup_new(p_user text)
returns text[] language plpgsql security definer set search_path to '' as $$
declare v_alpha text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; v_codes text[] := '{}'; v_code text; v_bytes bytea; i int; j int;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden' using errcode = 'insufficient_privilege'; end if;
  update public."TwoFactorBackup" set "usedAt" = now() where "userId" = p_user and "usedAt" is null;
  for i in 1..10 loop
    v_bytes := extensions.gen_random_bytes(8);
    v_code := '';
    for j in 0..7 loop v_code := v_code || substr(v_alpha, (get_byte(v_bytes, j) % 32) + 1, 1); end loop;
    insert into public."TwoFactorBackup" ("userId", "codeHash") values (p_user, public.tf_hash(p_user || ':' || v_code));
    v_codes := v_codes || (substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4));
  end loop;
  return v_codes;
end $$;

create or replace function public.tf_disable(p_user text, p_channel text)
returns boolean language plpgsql security definer set search_path to '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden' using errcode = 'insufficient_privilege'; end if;
  if p_channel = 'email' then update public."TwoFactor" set "emailOn" = false, "updatedAt" = now() where "userId" = p_user;
  elsif p_channel = 'sms' then update public."TwoFactor" set phone = null, "updatedAt" = now() where "userId" = p_user;
  else raise exception 'invalid' using errcode = 'check_violation';
  end if;
  if not public.tf_enabled(p_user) then
    update public."TwoFactorDevice" set "revokedAt" = now() where "userId" = p_user and "revokedAt" is null;
    update public."TwoFactorBackup" set "usedAt" = now() where "userId" = p_user and "usedAt" is null;
  end if;
  return public.tf_enabled(p_user);
end $$;

revoke all on function public.tf_hash(text), public.tf_enabled(text), public.second_factor_ok(), public.two_factor_gate(text),
  public.tf_status(text, uuid), public.tf_issue(text, uuid, text, text, text), public.tf_verify(text, uuid, text, text),
  public.tf_trust_device(text, text), public.tf_backup_new(text), public.tf_disable(text, text) from public, anon, authenticated;
grant execute on function public.second_factor_ok(), public.two_factor_gate(text) to authenticated;
grant execute on function public.tf_status(text, uuid), public.tf_issue(text, uuid, text, text, text), public.tf_verify(text, uuid, text, text),
  public.tf_trust_device(text, text), public.tf_backup_new(text), public.tf_disable(text, text) to service_role;
