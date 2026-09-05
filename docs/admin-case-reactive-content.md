# Conteúdo reativo específico por caso

O jogo pode receber intercorrências e audiências específicas publicadas pelo `rota-admin` em `cases.metadata.reactiveWorld`.

## Prioridade no runtime

1. Se o caso publicado possuir `metadata.reactiveWorld.version === 1`, o jogo usa as intercorrências configuradas pelo Admin.
2. Gatilhos podem considerar quantidade de ações, porcentagem do prazo consumido e uma pista específica já descoberta.
3. Se o Admin definiu audiência válida e habilitada, o jogo usa exatamente as etapas e escolhas daquele caso.
4. Se o Admin definiu configuração reativa sem audiência, o runtime respeita a ausência da audiência.
5. Casos antigos, sem configuração específica, continuam usando os eventos e a audiência genéricos já existentes.

## Persistência

A configuração editorial vem do Supabase junto com o catálogo de casos. O resultado das escolhas do jogador continua no armazenamento reativo por conta e tentativa do caso.

O cache do catálogo foi atualizado para `rota_da_justica_cases_cache_v2` para evitar que um cache anterior impeça o carregamento do novo metadata.

## Compatibilidade

Não há migration do jogo para esta alteração. O Admin utiliza o campo JSONB `cases.metadata` já existente.
