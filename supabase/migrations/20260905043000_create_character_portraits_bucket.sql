-- Rota da Justiça - bucket oficial para retratos de NPCs persistentes e personagens de casos.
-- Uploads são feitos pelo rota-admin com SUPABASE_SERVICE_ROLE_KEY.
-- O bucket é público apenas para leitura dos assets pelo jogo.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'character-portraits',
  'character-portraits',
  true,
  12582912,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
