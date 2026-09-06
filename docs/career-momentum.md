# Career Momentum — antecipação da próxima conquista

## Objetivo

O Rota da Justiça deve fechar cada conquista abrindo uma nova curiosidade. O jogador não precisa procurar manualmente no menu de carreira para descobrir por que vale a pena continuar.

## Onde aparece

### Hub

O `CareerMomentumCard` fica sempre visível no hub, tanto durante o estágio quanto na fase profissional. Ele mostra:

- cargo atual;
- próxima grande conquista;
- progresso aproximado da trajetória;
- sinais objetivos de evolução;
- oportunidades que começam a aparecer no horizonte;
- oportunidades deliberadamente ocultas;
- comentário contextual de um NPC recorrente.

### Resultado do processo

O mesmo card aparece dentro do `VerdictModal` imediatamente após o resultado. A mensagem muda conforme o contexto:

- promoção conquistada;
- vitória em caso de grande repercussão ou repercussão nacional;
- vitória em segunda instância, STJ ou STF;
- derrota com possibilidade narrativa de continuidade por recurso;
- vitória comum, conectada ao próximo marco da carreira.

## Filosofia de design

O sistema não revela todos os recursos futuros. Alguns itens aparecem bloqueados para criar expectativa sem transformar a progressão em uma lista mecânica de funcionalidades.

A regra de design é:

> Cada conquista fecha uma história e abre uma curiosidade.

## Progressão usada

- Estagiário → Estagiário Sênior: usa a avaliação real do `internCareerEngine`.
- Estagiário Sênior → advocacia/OAB: usa a preparação real para o Exame da Ordem.
- Advogado Contratado → Advogado Sênior: acompanha a trajetória até o marco de casos usado pelo game.
- Advogado Sênior → Sócio do Escritório: acompanha o marco de resultados usado pelo game.
- Sócio → Escritório Próprio: passa a tratar a evolução como decisão estratégica e construção de capital/reputação.
- Escritório próprio: projeta expansão, equipe, clientes maiores e padrão de vida.
- Magistratura: acompanha o próximo degrau institucional.

XP e reputação aparecem como sinais de evolução e não substituem as regras de promoção já existentes no motor.

## Arquivos principais

- `src/lib/careerMomentum.ts`
- `src/components/CareerMomentum/CareerMomentumCard.tsx`
- `src/components/CareerMomentum/CareerMomentumCard.module.css`
- `src/components/OfficeHub.tsx`
- `src/components/VerdictModal.tsx`

Não há migration de banco nesta implementação.
