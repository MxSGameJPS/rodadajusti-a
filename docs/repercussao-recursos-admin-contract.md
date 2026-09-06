# Rota Admin → Game: repercussão, recursos e instâncias

Este documento define o contrato que o Rota Admin deve publicar na tabela `public.cases` para o game interpretar repercussão e continuidade processual.

## 1. Repercussão

Campo: `repercussion_level`

Valores aceitos:

- `COMUM`
- `RELEVANTE`
- `GRANDE_REPERCUSSAO`
- `NACIONAL`

O game aplica o bônus automaticamente sobre o XP-base publicado em `xp_reward`:

| Repercussão | XP | Reputação adicional |
| --- | ---: | ---: |
| COMUM | 1,00× | +0 |
| RELEVANTE | 1,25× | +2 |
| GRANDE_REPERCUSSAO | 1,75× | +6 |
| NACIONAL | 2,50× | +10 |

`honorarios_reward` continua sob controle do Rota Admin.

## 2. Instância / tribunal

Campo: `procedural_stage`

Valores:

- `PRIMEIRA_INSTANCIA`
- `SEGUNDA_INSTANCIA`
- `STJ`
- `STF`

Campo opcional: `court_name`

Exemplos:

- `3ª Câmara Cível do Tribunal de Justiça`
- `2ª Turma do Superior Tribunal de Justiça`
- `1ª Turma do Supremo Tribunal Federal`

O game aplica travas mínimas adicionais:

- 2ª instância: no mínimo `ADVOGADO_CONTRATADO`;
- STJ/STF: no mínimo `ADVOGADO_SENIOR`.

O `min_career_tier` publicado pelo Admin continua valendo. O game usa sempre o requisito mais alto entre o estágio processual e o nível definido pelo Admin.

## 3. Continuação do mesmo processo

Um recurso NÃO é tratado como um novo processo independente.

Para criar uma continuação, publique um novo caso com:

- `process_key`: o mesmo identificador lógico em todas as fases;
- `appeal_of_case_id`: id da fase imediatamente anterior;
- `appeal_type`: tipo de recurso;
- `appeal_trigger`: condição que torna a continuação elegível;
- `appeal_deadline_days`: prazo simulado para o jogador recorrer.

Exemplo:

```text
Caso originário
id: CONSUMIDOR_BIGTECH_01
process_key: PROC_CONSUMIDOR_BIGTECH
procedural_stage: PRIMEIRA_INSTANCIA

Apelação
id: CONSUMIDOR_BIGTECH_01_APELACAO
process_key: PROC_CONSUMIDOR_BIGTECH
procedural_stage: SEGUNDA_INSTANCIA
appeal_of_case_id: CONSUMIDOR_BIGTECH_01
appeal_type: APELACAO
appeal_trigger: PLAYER_LOSS
appeal_deadline_days: 15
min_career_tier: ADVOGADO_CONTRATADO
```

## 4. Gatilhos de recurso

### `PLAYER_LOSS`

A continuação aparece quando o jogador teve decisão desfavorável na fase anterior. O prazo recursal é aplicado.

### `PLAYER_WIN_OPPONENT_APPEALS`

A continuação aparece quando o jogador venceu a fase anterior, mas a parte contrária recorreu. O sistema considera o recurso da parte contrária já interposto; por isso ele pode retornar muito tempo depois, inclusive um processo conduzido quando o personagem ainda era estagiário.

### `ANY_RESULT`

Continuação administrativa/especial que pode ser liberada independentemente do resultado anterior. Deve ser usada com cautela.

## 5. Tipos de recurso aceitos

- `APELACAO`
- `AGRAVO_INSTRUMENTO`
- `AGRAVO_INTERNO`
- `RECURSO_ESPECIAL`
- `RECURSO_EXTRAORDINARIO`
- `AGRAVO_RECURSO_ESPECIAL`
- `AGRAVO_RECURSO_EXTRAORDINARIO`
- `OUTRO`

## 6. Regra de encerramento

O game diferencia decisão de encerramento do processo.

- decisão desfavorável com recurso cabível → `PRAZO RECURSAL EM ABERTO`;
- decisão favorável com recurso da parte contrária → `RECURSO DA PARTE CONTRÁRIA`;
- recurso já iniciado → `RECURSO EM TRAMITAÇÃO`;
- sem continuação cabível ou prazo recursal esgotado → `TRÂNSITO EM JULGADO`.

Uma fase já julgada nunca deve ser oferecida novamente como um novo caso. O jogador deve seguir para a continuação recursal quando ela existir.

Reabertura por prova nova/ação rescisória não faz parte desta versão.

## 7. Sugestão para o gerador por IA no Rota Admin

Ao receber algo como:

> Crie um caso intermediário para advogado contratado, Direito do Consumidor, de grande repercussão.

O Admin deve produzir, entre os demais dados:

```json
{
  "difficulty": "Intermediário",
  "min_career_tier": "ADVOGADO_CONTRATADO",
  "repercussion_level": "GRANDE_REPERCUSSAO",
  "procedural_stage": "PRIMEIRA_INSTANCIA"
}
```

Ao pedir uma continuação:

> Crie a apelação de segunda instância do caso CONSUMIDOR_BIGTECH_01 caso o jogador tenha perdido.

O Admin deve preencher o vínculo com a fase anterior e manter o mesmo `process_key`.
