# Configuração do primeiro operador do Loyola's (Supabase Auth)

Situação verificada em 20/10/2026: `auth.users = 0` e `tenant_memberships = 0`.
O Gestor pode ser visitado sem login como demonstração, mas **não pode alterar dados reais nem carregar imagens**. Este bloqueio é correto e não deve ser contornado com políticas públicas de escrita.

## Passo de autorização necessário pelo proprietário
1. Acesse o painel do projeto: https://supabase.com/dashboard/project/awgqpfdfsyslpqpfzoul/auth/users
2. Clique em **Add user** → **Create new user** ou use um convite por email. Informe **seu próprio email de operador** e defina a senha por conta própria; nunca forneça a senha ao chat. Verifique/ative o email conforme necessário.
3. Depois que a conta existir, vincule-a à empresa com a consulta **abaixo**, substituindo somente `EMAIL_DO_OPERADOR` pelo email que você acabou de cadastrar. Execute no SQL Editor do mesmo projeto:
```sql
insert into public.tenant_memberships (tenant_id, user_id, role, active)
select t.id, u.id, 'owner', true
from public.tenants t
join auth.users u on lower(u.email) = lower('EMAIL_DO_OPERADOR')
where t.slug = 'loyolas-lanches'
on conflict (tenant_id,user_id) do update set role='owner', active=true
returning tenant_id, user_id, role, active;
```
Confira se a consulta retornou uma linha. **Não use um email de outra pessoa** nem vincule usuários não verificados.
4. No navegador, abra o Gestor em `/login?returnTo=/adm-landing` e faça login com os dados criados. **O acesso de demonstração sem login continua disponível para leitura**, mas uploads e salvamentos passam a usar a sessão autorizada.
5. Vá ao ADM da Landing → Imagens & Upload → História ou CTA e selecione até 30 fotos de uma vez (incluindo 9). O envio agora persiste a lista completa em **uma única gravação ao final**, evitando sobrescrita de fotos. Cada imagem aceita até 15 MB: JPG/PNG/WebP/GIF.
6. Se o upload concluir e a gravação da galeria falhar, use **Tentar salvar galeria (sem reenviar fotos)**.
7. Abra a Landing em outra aba, pressione **F5** e confirme imagens; verifique a contagem no banco `landing_content`.

## Segurança e escopo
- **Nunca** alterar políticas do Storage para permitir gravação anônima.
- **Nunca** expor `service_role` no navegador ou no GitHub.
- O tenant segue `DRAFT`; não habilite checkout real até a homologação.
- A migração, clientes, pedidos e imagens existentes não foram apagados.
- A associação de operador usa o UUID real do Auth, sem importar senhas do PocketBase.
