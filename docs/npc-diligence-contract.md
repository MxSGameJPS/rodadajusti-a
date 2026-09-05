# NPCs persistentes nas diligências

Este documento define o contrato entre `rota-admin` e o frontend do jogo para NPCs persistentes associados a casos.

## Origem dos dados

O jogo não adiciona NPCs automaticamente a um caso.

Fluxo obrigatório:

```text
rota-admin
  -> cases.content.npcAssignments
  -> publicação do caso
  -> case_npcs
  -> npcs
  -> frontend do jogo
  -> diligência/local configurado
```

O vínculo precisa existir em `case_npcs` e o NPC precisa estar `published` e `is_active = true`.

## Local da diligência

O campo `case_npcs.configuration` deve informar explicitamente onde o NPC aparece.

Forma preferencial:

```json
{
  "locationId": "LOC_DELEGACIA"
}
```

Também é aceito mais de um local:

```json
{
  "locationIds": ["LOC_DELEGACIA", "LOC_FORUM"]
}
```

Ou uma categoria de local:

```json
{
  "locationCategory": "delegacia"
}
```

Categorias reconhecidas pelo runtime:

- `cartorio`
- `tribunal`
- `delegacia`
- `residencia`
- `empresa`
- `banco`
- `escritorio`

Se nenhum local ou categoria for informado, o NPC **não aparece** no jogo. Isso é proposital para impedir que um delegado, juiz, perito ou outro NPC surja em qualquer caso sem decisão editorial do Admin.

## Retrato

O runtime tenta, nesta ordem:

1. `configuration.portraitSrc`
2. `configuration.portraitPath`
3. `npcs.metadata.portraitSrc`
4. `npcs.metadata.portraitPath`
5. nome normalizado do NPC em `/public/personagens/`

Exemplo:

```text
Delegado Henrique Vasconcelos
-> /personagens/delegado-henrique-vasconcelos.png
```

## Diálogo inicial

Pode ser definido por caso:

```json
{
  "initialDialogue": "Pois não, doutor. O que precisa saber sobre este inquérito?"
}
```

Sem valor específico, o jogo usa uma saudação neutra.

## Perguntas específicas daquele caso

`configuration.dialogueOptions` tem prioridade sobre a biblioteca global do NPC.

Exemplo:

```json
{
  "locationId": "LOC_DELEGACIA",
  "initialDialogue": "Pois não, doutor. O que precisa saber sobre este inquérito?",
  "dialogueOptions": [
    {
      "id": "andamento-inquerito",
      "question": "Perguntar sobre o andamento do inquérito",
      "answer": "O inquérito está em fase de análise dos depoimentos e do laudo pericial.",
      "timeCostMinutes": 10
    },
    {
      "id": "laudo-pericial",
      "question": "Perguntar sobre a perícia",
      "answer": "A perícia identificou um elemento que merece sua atenção nos autos.",
      "revealsClueId": "CLUE_LAUDO_01",
      "timeCostMinutes": 15
    },
    {
      "id": "nova-diligencia",
      "question": "Perguntar se existe outra diligência pendente",
      "answer": "A equipe localizou uma testemunha que pode esclarecer a cronologia dos fatos.",
      "unlocksLocationId": "LOC_TESTEMUNHA",
      "timeCostMinutes": 10
    }
  ]
}
```

Se `configuration.dialogueOptions` não existir, o runtime usa `npcs.dialogue_library` como fallback. Como a biblioteca pertence ao próprio NPC, Henrique e Luana podem manter perfis de conversa diferentes mesmo quando participam do mesmo caso.

## Efeitos já suportados no MVP

Uma conversa pode atualmente:

- entregar informação pela própria resposta;
- revelar uma pista com `revealsClueId`;
- liberar uma nova diligência com `unlocksLocationId`;
- registrar a pergunta em `activeCase.askedDialogueIds`;
- registrar o encontro no log do caso por meio do fluxo de diálogo já existente;
- consumir tempo somente na primeira pergunta; revisões não têm novo custo.

## Memória persistente futura

A estrutura de banco já possui:

- `npc_player_state`
- `npc_memories`
- `npc_interactions`

O MVP de diligências não altera ainda a relação global do NPC com a carreira. Essa próxima etapa deve transformar a interação local do caso em memória server-authoritative, mantendo resultados científicos e jurídicos independentes de amizade, confiança ou afinidade.
