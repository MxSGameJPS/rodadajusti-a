-- Rota da Justiça — claims de recompensa server-authoritative

begin;

create table if not exists public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references public.careers(id) on delete cascade,
  reward_id text not null references public.reward_definitions(id) on delete restrict,
  claim_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  claimed_at timestamptz not null default now(),
  constraint reward_claims_key_not_blank check (char_length(trim(claim_key)) > 0),
  constraint reward_claims_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint reward_claims_unique unique (career_id, reward_id, claim_key)
);

create index if not exists idx_reward_claims_career on public.reward_claims(career_id, claimed_at desc);

alter table public.reward_claims enable row level security;
drop policy if exists "own reward claims are readable" on public.reward_claims;
create policy "own reward claims are readable" on public.reward_claims
for select to authenticated
using (exists (select 1 from public.careers c where c.id = career_id and c.user_id = auth.uid()));

create or replace function public.apply_reward_definition(
  p_career_id uuid,
  p_reward_id text,
  p_claim_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward jsonb;
  v_user_id uuid;
  v_currency record;
  v_item jsonb;
  v_amount bigint;
  v_quantity integer;
  v_money numeric;
  v_xp integer;
  v_reputation integer;
begin
  select user_id into v_user_id from public.careers where id = p_career_id;
  if v_user_id is null then raise exception 'career_not_found'; end if;

  select reward into v_reward
  from public.reward_definitions
  where id = p_reward_id and status = 'published' and is_active = true;
  if v_reward is null then raise exception 'reward_unavailable'; end if;

  insert into public.reward_claims(career_id, reward_id, claim_key, metadata)
  values (p_career_id, p_reward_id, p_claim_key, coalesce(p_metadata, '{}'::jsonb));

  v_money := coalesce((v_reward->>'money')::numeric, 0);
  v_xp := coalesce((v_reward->>'xp')::integer, 0);
  v_reputation := coalesce((v_reward->>'reputation')::integer, 0);

  update public.careers
  set money = money + v_money,
      xp = greatest(0, xp + v_xp),
      reputation = greatest(0, least(100, reputation + v_reputation))
  where id = p_career_id;

  if jsonb_typeof(v_reward->'currencies') = 'object' then
    for v_currency in select key, value from jsonb_each_text(v_reward->'currencies') loop
      v_amount := v_currency.value::bigint;
      if v_amount <> 0 then
        insert into public.player_wallets(career_id, currency_id, balance)
        values (p_career_id, v_currency.key, greatest(0, v_amount))
        on conflict (career_id, currency_id)
        do update set balance = greatest(0, public.player_wallets.balance + v_amount), updated_at = now();

        insert into public.wallet_transactions(career_id, currency_id, amount, transaction_type, reference_type, reference_id, metadata)
        values (p_career_id, v_currency.key, v_amount, 'reward', 'reward_definition', p_reward_id, jsonb_build_object('claim_key', p_claim_key));
      end if;
    end loop;
  end if;

  if jsonb_typeof(v_reward->'items') = 'array' then
    for v_item in select value from jsonb_array_elements(v_reward->'items') loop
      v_quantity := greatest(1, coalesce((v_item->>'quantity')::integer, 1));
      insert into public.player_inventory(career_id, catalog_item_id, quantity)
      values (p_career_id, v_item->>'id', v_quantity)
      on conflict (career_id, catalog_item_id)
      do update set quantity = public.player_inventory.quantity + v_quantity, updated_at = now();
    end loop;
  end if;

  insert into public.career_events(career_id, user_id, event_type, title, description, metadata)
  values (
    p_career_id,
    v_user_id,
    'REWARD_CLAIMED',
    'Recompensa recebida',
    'Uma recompensa configurada pelo sistema foi aplicada à carreira.',
    jsonb_build_object('reward_id', p_reward_id, 'claim_key', p_claim_key)
  );

  return jsonb_build_object(
    'ok', true,
    'reward_id', p_reward_id,
    'claim_key', p_claim_key,
    'reward', v_reward
  );
exception
  when unique_violation then
    raise exception 'reward_already_claimed';
end;
$$;

revoke all on function public.apply_reward_definition(uuid, text, text, jsonb) from public;
grant execute on function public.apply_reward_definition(uuid, text, text, jsonb) to service_role;

commit;
