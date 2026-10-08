# E-mails premium — Rota da Justiça

Modelos versionados na branch `main`. O conector Supabase utilizado permite banco e migrações, **mas não expõe configuração de Auth Email Templates**. Por isso, a publicação deve ser feita no Dashboard.

## 1. Confirmação de cadastro
No [Supabase Authentication → Email Templates](https://supabase.com/dashboard/project/ibbfwxqpowcwpuasxxdl/auth/templates), escolha **Confirm signup**.

- **Subject:** `Rota da Justiça | Confirme seu e-mail e comece sua jornada`
- **Body (HTML):** conteúdo integral do arquivo [confirmation.html](./confirmation.html)

## 2. Recuperação de senha
Na mesma tela, escolha **Reset Password**.

- **Subject:** `Rota da Justiça | Recupere o acesso à sua carreira`
- **Body (HTML):** conteúdo integral do arquivo [recovery.html](./recovery.html)

Os arquivos utilizam `{{ .Data.full_name }}` (enviado no cadastro via `options.data.full_name`) para personalizar a saudação, com fallback para usuário que não possua nome. O link `{{ .ConfirmationURL }}` é criado e validado pelo Supabase — **não** substitua por uma URL fixa.

## Conferência antes da homologação
- Salvar cada template no Dashboard e conferir que o corpo foi realmente atualizado.
- Criar nova conta de teste e receber e-mail com remetente/assunto corretos; verificar nome exibido, acentuação, responsividade, links e pasta de spam.
- Confirmar conta e testar login.
- Solicitar recuperação, usar link, registrar nova senha e entrar de novo.
- Conferir **Site URL** e **Redirect URLs** para `/login` e `/login?auth=recovery`.
- Configurar SMTP personalizado/remetente no Dashboard para substituir o remetente genérico `Supabase Auth` (SPF, DKIM, DMARC); isto é uma configuração de infraestrutura, não uma migração SQL.
- Alterações visuais não modificam a política de confirmação ou o envio do SMTP.

Referência: https://supabase.com/docs/guides/auth/auth-email-templates
