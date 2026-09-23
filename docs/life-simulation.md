# Vida cotidiana e economia doméstica — Rota da Justiça

## Objetivo

A linha do tempo do jogo agora afeta diretamente o personagem. Energia, fome, higiene e rotina de estudos deixam de ser elementos narrativos e passam a participar das ações profissionais.

## Residência

Toda carreira nova informa rua, número, cidade e UF. Carreiras antigas recebem uma etapa única de atualização.

O número da residência não é enviado ao serviço de geocodificação. O jogo consulta somente rua, cidade e UF e cria um ponto estável e pseudoaleatório ao longo da rua cadastrada. Assim, o marcador da casa não representa a localização residencial exata. Rua e número não são publicados no catálogo do Rota Admin nem exibidos a outros jogadores.

A residência aparece no Mapa da Cidade em posição aproximada na rua cadastrada e oferece:

- dormir por 8 horas;
- tomar banho por 30 minutos;
- preparar café da manhã, almoço, jantar ou outra refeição por 45 minutos;
- estudar por 2 horas;
- pagar aluguel, água, energia, internet e gás;
- acompanhar despensa, móveis e veículos.

## Necessidades

O estado persistido em `player.household.needs` usa escala 0–100.

- `energy`: 100 = descansado;
- `hunger`: internamente representa saciedade; 100 = alimentado. A UI converte para percentual de fome;
- `hygiene`: 100 = higiene em dia;
- `study`: 100 = rotina de estudos em dia.

Toda ação que usa `gameClockFields` reduz necessidades conforme o tempo consumido.

Em níveis críticos, ações profissionais são bloqueadas até o personagem cuidar da necessidade.

## Faculdade

Enquanto a carreira for `ESTAGIARIO` ou `ESTAGIARIO_SENIOR`, uma faculdade de Direito é posicionada de forma determinística na cidade-base.

Estudar na faculdade consome 3 horas e recupera a rotina acadêmica.

## Economia doméstica

As contas são cobradas por competência mensal no módulo da casa. O pagamento gera lançamento em `personalFinances` com categoria `MORADIA`.

Compras no mundo comercial geram lançamentos nas categorias:

- `SUPERMERCADO`;
- `MOVEIS`;
- `VEICULO`;
- `ALIMENTACAO`;
- `HOTEL`;
- outras categorias quando aplicável.

## Produtos do Rota Admin

O jogo usa `establishment_offers.gameplay_effects`.

Campos reconhecidos:

- `kind`: `FOOD`, `BED`, `FURNITURE`, `STUDY_FURNITURE`, `VEHICLE`, `MEAL`, `SERVICE` ou `OTHER`;
- `foodUnits`: unidades adicionadas à despensa;
- `hungerRestore`: recuperação de saciedade para refeições prontas;
- `furnitureKind`: `BED`, `SOFA`, `DESK`, `CHAIR`, `APPLIANCE` ou `OTHER`;
- `energyBonus`: bônus de recuperação;
- `comfortBonus`: conforto adicional, usado principalmente por camas;
- `studyBonus`: bônus de recuperação de estudos.

## Exemplos

### Supermercado — cesta básica

- kind: `FOOD`
- preço: JR$ 120
- foodUnits: 8

Resultado: adiciona oito refeições à despensa.

### Cama simples

- kind: `BED`
- furnitureKind: `BED`
- energyBonus: 4
- comfortBonus: 2

### Cama premium

- kind: `BED`
- furnitureKind: `BED`
- energyBonus: 14
- comfortBonus: 10

O motor usa a melhor cama possuída para calcular a energia recuperada durante o sono.

### Escrivaninha ergonômica

- kind: `STUDY_FURNITURE`
- furnitureKind: `DESK`
- studyBonus: 12

### Restaurante

- kind: `MEAL`
- hungerRestore: 50

### Veículo

- kind: `VEHICLE`

O veículo entra no patrimônio doméstico. Mecânicas futuras podem consumir esse inventário para combustível, manutenção e escolha de transporte.

## Migration

Para bancos existentes, aplicar:

`supabase/migrations/20260923110000_establishments_life_products.sql`

Essa migration adiciona `LOJA_MOVEIS` à constraint de tipos comerciais. Os efeitos de produtos usam a coluna JSONB `gameplay_effects`, já existente.
