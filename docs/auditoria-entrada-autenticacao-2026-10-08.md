# Auditoria de entrada — autenticação e salvamentos (2026-10-08)

## Implementação na main
- Cadastro por e-mail exige no cliente senha de **8+ caracteres**, com letra maiúscula, minúscula, número e caractere especial. Essa verificação **não se aplica ao OAuth Social Jurídico**.
- Recuperação: link enviado por `resetPasswordForEmail` para `/login?auth=recovery`; callback em `AuthGate`, nova senha via `updateUser`, seguida de logout local para entrar novamente.
- Confirmação: `signUp` solicita confirmação por e-mail e existe ação para reenviar `resend({type:'signup'})`.
- O `AccountSaveBoundary` lê somente `public.game_saves` do usuário autenticado. Não importa automaticamente saves legados do navegador, nem usa cache como fallback se o servidor não responder.
- `localStorage` ainda é utilizado por partes da engine como **espelho temporário de execução**. A migração integral dos diversos estados auxiliares para fluxo somente em banco exige auditoria específica: não considerar concluída nesta etapa.

## Configuração obrigatória no Supabase Dashboard
1. Authentication > Providers > Email: **Confirm email** ativado; provedor de e-mail habilitado.
2. Authentication > URL Configuration: Site URL = URL oficial do jogo; permitir `https://SEU-DOMINIO/login` e `https://SEU-DOMINIO/login?auth=recovery` nas Redirect URLs. Incluir URLs de testes somente se necessárias.
3. Authentication > Email Templates: configurar **Confirm signup** com identidade visual, conteúdo e `{{ .ConfirmationURL }}` e **Reset password** com `{{ .ConfirmationURL }}`. Conferir idioma, domínio, links e branding.
4. Configurar SMTP personalizado para envio confiável e autenticado (SPF/DKIM/DMARC) e testar entrega, spam, expiração e reenvio. O SMTP nativo tem limites e não deve ser presumido como pronto para teste aberto.
5. Auth > Security and Protection / Password: aplicar a **mesma regra de senha no servidor** para contas com e-mail, caso o plano/configuração permita. A validação no front-end por si só não impede chamadas diretas à API. Qualquer exigência global do Auth deve considerar usuários existentes e fluxos de recuperação, sem bloquear identidades OAuth.
6. Confirmar que `game_saves` e `careers` têm RLS do proprietário conforme migração base `20260901023500_create_game_core.sql`.

## Migração SQL
**Não há mudança de esquema necessária nesta entrega.** As tabelas `careers` e `game_saves` já existem e têm políticas RLS na migração base. As alterações de SMTP, templates, confirmação de e-mail e configurações do Auth são gerenciadas no painel / configuração do serviço: criar SQL fictício não as aplicaria.

## Casos de teste obrigatórios
- Novo cadastro: senha inválida (cada requisito), senha válida, confirmação enviada e conta ainda não confirmada.
- Reenviar confirmação; confirmar e-mail por link; entrar após confirmação.
- Recuperar senha com conta válida, concluir link sem ser redirecionado antes; nova senha inválida/válida; login com senha nova e falha com senha antiga.
- OAuth Social Jurídico não exige senha local.
- Contas A e B no mesmo navegador: nunca carregar save de A em B.
- Login em navegador limpo: carrega exclusivamente `game_saves` da conta.
- Falha de banco: apresentar erro, sem usar save local como fonte de verdade.
- Jogo sem save no banco: iniciar personagem novo, sem importar progresso antigo automaticamente.

## Pendências de homologação
- Testes end-to-end em produção e fluxo de confirmação/recuperação real.
- Verificação do envio SMTP / configurações Auth (não controladas por migração SQL).
- Revisão do debounce assíncrono de gravação e dos estados auxiliares ainda armazenados no navegador; o banco é fonte de verdade de inicialização, porém o jogo ainda depende de cache local durante a sessão.
