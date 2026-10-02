-- O resultado do dado é gravado na mesma transação da mensagem que pediu a rolagem; com now() os dois
-- tinham o mesmo horário e o resultado podia aparecer ANTES da mensagem. O relógio real resolve.
create or replace function public.message_dice_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type = 'dice' then
    if coalesce(current_setting('orbitax.dice_message', true), '') <> 'on' then
      raise exception 'invalid_message_type' using errcode = 'check_violation';
    end if;
    new."createdAt" := clock_timestamp();
  end if;
  return new;
end $$;
