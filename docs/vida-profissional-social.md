# Vida profissional persistente + vida social

## Objetivo

Fazer o pós-OAB deixar de funcionar como uma sequência isolada de casos. O personagem passa a conviver com uma agenda integrada em que processos, prazos, recursos, mensagens, ligações e compromissos pessoais disputam atenção.

## Vida profissional persistente

O painel `ProfessionalDailyBrief` é calculado a partir do estado real do personagem e do catálogo de casos. Ele pode destacar:

- processo ativo e horas restantes;
- prazo processual crítico;
- novo caso distribuído no CRM;
- processo antigo que retornou em recurso;
- prazo recursal aberto;
- recurso interposto pela parte contrária;
- recurso aguardando nível profissional suficiente;
- convite social pendente.

`emitProfessionalLifeNotifications()` também envia avisos pelo celular, com deduplicação por personagem, para evitar repetir a mesma movimentação a cada sincronização.

## Vida social

A vida social usa um estado persistente separado por personagem (`rota_social_life_v1:<owner>`), seguindo o mesmo padrão local já usado pelo celular e por outros subsistemas profissionais.

O perfil pessoal permite:

- solteiro(a);
- namorando(a);
- casado(a);
- união estável;
- nome do parceiro ou parceira quando houver relacionamento.

O estado civil não altera resultado judicial. Ele muda apenas eventos pessoais, convites, gastos e equilíbrio social.

### Personagem comprometido

O parceiro ou parceira pode procurar o jogador por mensagem ou ligação. As ligações são transcritas enquanto não houver voz. O convite pode levar a jantar/bar e gerar gasto de dinheiro e avanço de um dia no calendário do personagem.

### Personagem solteiro

Mariana pode convidar o jogador para sair depois do expediente, especialmente em sexta/sábado, com ocorrências ocasionais em dias úteis. O convite chega como WhatsApp e fica pendente na vida social até ser aceito ou recusado.

## Cena de bar

Ao aceitar um programa, o jogador escolhe quanto pretende gastar. A cena possui luzes ambientes animadas e respeita `prefers-reduced-motion`.

O áudio é opcional e procurado em:

`/audio/social/bar-ambience.mp3`

Se o arquivo não existir, a cena continua funcional sem áudio.

## Consequências atuais

- gasto real do saldo do personagem;
- avanço de um dia no calendário ao encerrar a noite;
- aumento de `socialBalance` quando o jogador sai;
- pequena perda de equilíbrio ao recusar repetidamente compromissos com parceiro(a);
- histórico dos últimos eventos sociais.

## Persistência e nuvem

Nesta versão, a vida social é persistida localmente por personagem. Não há migration de banco nesta branch. Uma evolução futura pode sincronizar perfil pessoal e histórico social no Supabase para continuidade entre dispositivos.

## Arquivos principais

- `src/lib/socialLife.ts`
- `src/lib/professionalLife.ts`
- `src/lib/professionalPhoneBridge.ts`
- `src/components/ProfessionalLifeExperience/ProfessionalLifeExperience.tsx`
- `src/components/ProfessionalLifeExperience/PersonalIncomingCallExperience.tsx`
- `src/components/ProfessionalOfficeHub/ProfessionalDailyBrief.tsx`
