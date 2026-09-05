# Mundo reativo, audiências jogáveis e relações persistentes

Esta etapa transforma o caso jurídico de uma sequência estática de diligências em uma experiência que reage às decisões do jogador.

## 1. Intercorrências durante a investigação

O motor acompanha a quantidade de ações relevantes executadas no caso (diálogos, inspeções e usos do Social Jurídico) e pode apresentar intercorrências ao longo da preparação.

Primeira versão disponível:

- cliente acrescenta informação nova ao relato;
- fonte/testemunha demonstra receio de colaborar;
- parte contrária apresenta documento inesperado.

Cada intercorrência oferece decisões diferentes, sem destacar antecipadamente qual é a correta. As escolhas podem:

- consumir tempo processual;
- melhorar ou piorar a preparação da causa;
- criar risco profissional.

O tempo gasto é incorporado ao prazo exibido no mapa e também é usado pelo motor judicial para verificar eventual perda de prazo.

## 2. Audiência jogável

Casos com componente oral relevante podem seguir para audiência depois da escolha da tese e das provas que serão efetivamente levadas aos autos.

A audiência possui quatro momentos:

1. indicação do melhor suporte probatório para a tese;
2. reação a uma contradição de depoimento;
3. resposta a uma impugnação de autenticidade;
4. manifestação final sobre aquilo que efetivamente ficou demonstrado.

A audiência usa as provas que o jogador realmente selecionou. Se uma prova inautêntica tiver sido juntada, a impugnação pode tratar especificamente daquele material.

A atuação oral gera um modificador limitado. Ela pode fortalecer ou enfraquecer um processo, mas não transforma uma ação sem prova em vitória automática. Os limites existentes para ausência de investigação, ausência de prova, prova falsa e perda de prazo continuam prevalecendo.

## 3. Relação persistente com NPCs

NPCs persistentes agora mantêm uma relação profissional com o jogador entre diferentes casos.

O estado inclui:

- confiança;
- respeito;
- familiaridade;
- memórias recentes das interações.

O NPC utiliza uma chave estável (`persistent-npc:<npcId>`), portanto Roberto Ramos, Helena Valente, Henrique Vasconcelos e outros personagens persistentes não recomeçam do zero quando aparecem em outro processo.

A primeira implementação registra a forma geral da interação a partir da atitude configurada no diálogo. Reabrir uma resposta já realizada não concede novos pontos de relacionamento.

## 4. Persistência e isolamento

Nesta fase, o mundo reativo utiliza armazenamento local separado por conta autenticada, seguindo a mesma identificação de conta já usada pelo sistema de saves.

Intercorrências e audiência são isoladas por **tentativa de caso**, usando o primeiro log criado quando o jogador aceita a causa. Isso evita que uma nova tentativa do mesmo caso herde decisões da tentativa anterior.

Relacionamentos com NPCs, por outro lado, são propositalmente permanentes para aquela conta.

## 5. Integração com o juiz

O `judicialDecisionEngine` agora soma, dentro de limites controlados:

- resultado das intercorrências;
- desempenho em audiência.

Continuam existindo os tetos de segurança do motor:

- perdeu prazo: resultado fortemente limitado;
- nenhuma investigação/nenhuma prova: audiência não salva a causa;
- nenhuma prova crucial necessária: mantém limite de pontuação;
- prova falsa: continua impondo penalidade e teto;
- incompatibilidade probatória: continua reduzindo a possibilidade de êxito.

O feedback do magistrado também pode mencionar a forma como o jogador administrou intercorrências e se comportou em audiência.

## 6. Próximas extensões naturais

A arquitetura permite posteriormente:

- eventos específicos criados pelo `rota-admin` para cada caso;
- audiência personalizada por área jurídica;
- relação de NPC sincronizada com Supabase;
- reação textual do NPC baseada em confiança/respeito;
- cliente, juiz e parte contrária como relações independentes;
- histórico profissional visível no currículo do jogador.

Nenhuma migration Supabase é necessária para esta primeira versão, pois o novo estado é persistido localmente e isolado por conta.