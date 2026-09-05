# Reparo da finalização do Exame da Ordem

## Sintoma

Ao finalizar o exame, o cliente recebe erro do PostgREST informando que não encontrou:

`public.submit_exam_attempt(p_answers, p_career_id, p_duration_seconds, p_exam_slug, p_mode)`

## Causa

O cliente atual envia `p_mode`, porém o banco/API pode ainda expor somente a assinatura legada com quatro parâmetros ou estar com o schema cache desatualizado.

## Correção

A migration `20260905084500_repair_submit_exam_attempt_rpc.sql`:

- remove a assinatura legada de quatro parâmetros;
- reafirma a RPC atual com `p_mode`;
- mantém as regras atuais do exame completo/rápido;
- reaplica a permissão para `authenticated`;
- solicita recarga do schema cache do PostgREST.

O frontend não faz fallback para a RPC antiga, pois isso poderia corrigir a prova usando regras antigas. Se a API ainda estiver atualizando, o jogador recebe uma mensagem amigável e o draft local do exame continua preservado.
