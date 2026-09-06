# Mapa real de diligências

O Rota da Justiça passa a usar uma camada geográfica real para aumentar a imersão sem adicionar custo obrigatório ao MVP.

## Stack do MVP

- **MapLibre GL JS 6.7.0** carregado em runtime pelo CDN do UNPKG, sem API key e sem dependência de SDK proprietário.
- **OpenStreetMap** como base cartográfica raster padrão.
- **Nominatim público** para uma consulta pontual da cidade/UF escolhida pelo jogador.
- **OSRM público** para cálculo de rota viária quando disponível.

Todos os provedores possuem variáveis opcionais de ambiente para troca futura sem reescrever o sistema.

## Privacidade e ficção

O jogo não associa NPCs fictícios a endereços residenciais reais. Depois de localizar a cidade, o motor cria pontos determinísticos próximos ao centro e em diferentes regiões urbanas. O roteador pode encaixar esses pontos na malha viária, produzindo um percurso real pelas ruas sem afirmar que uma pessoa fictícia mora em um endereço real.

O Ramos & Associados recebe um ponto virtual estável na região central da cidade.

## Fluxo

1. O jogador informa a cidade e o estado na primeira utilização do mapa real, salvo se esses dados já existirem no perfil.
2. A cidade é geocodificada uma única vez e fica em cache local.
3. Cada local desbloqueado do caso recebe uma posição virtual estável dentro da mesma cidade.
4. Ao selecionar um destino, o jogo tenta calcular o percurso viário real.
5. Durante a viagem, um marcador de carro percorre a geometria da rota em uma animação acelerada.
6. Se MapLibre, Nominatim ou OSRM não estiverem disponíveis, o jogo mantém o fluxo original por meio de um modo visual de fallback.

## Balanceamento

A distância e a duração retornadas pelo roteador aparecem como informação de imersão. O custo em dinheiro e o tempo processual efetivamente aplicados continuam vindo do caso (`travelCost` e `travelTimeHours`). Isso evita que uma mudança de cidade altere o balanceamento jurídico de um caso já publicado.

## Custo e limites

O MVP não exige conta paga nem chave de API. Entretanto, os servidores públicos do OpenStreetMap/Nominatim/OSRM são serviços comunitários ou de demonstração, sem SLA. O código foi preparado para:

- fazer geocodificação apenas sob ação do usuário e com cache;
- respeitar intervalo superior a 1 segundo entre consultas Nominatim;
- armazenar rotas já calculadas localmente;
- nunca fazer download em massa ou pré-carregamento de mapas;
- manter atribuição visível ao OpenStreetMap;
- permitir troca por infraestrutura própria ou outro provedor no futuro.

## Variáveis opcionais

```env
VITE_OSM_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
VITE_NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
VITE_OSRM_BASE_URL=https://router.project-osrm.org
```

Nenhuma delas é obrigatória no MVP.
