-- Complemento do Motor de Relacionamentos: estado afetivo inicial e casos paralelos
begin;
alter table public.careers add column if not exists relationship_status text not null default 'SINGLE';
alter table public.careers add column if not exists partner_name text;
alter table public.careers drop constraint if exists careers_relationship_status_check;
alter table public.careers add constraint careers_relationship_status_check check (relationship_status in ('SINGLE','DATING','MARRIED'));
alter table public.careers drop constraint if exists careers_partner_name_consistency;
alter table public.careers add constraint careers_partner_name_consistency check (
 (relationship_status='SINGLE' and partner_name is null)
 or (relationship_status in ('DATING','MARRIED') and partner_name is not null and char_length(trim(partner_name)) between 1 and 100)
);
commit;
