# PocketBase — servidor independente (Railway)

**Separado do frontend Vercel. Não usar o endpoint antigo da Skip.**

1. No Railway, crie projeto e serviço GitHub a partir deste repositório. Configure **Config file path:** `/railway.toml`.
2. O build Docker copia `pocketbase/migrations` e `pocketbase/hooks` para o container.
3. Crie **um volume persistente montado em `/data`**, antes de iniciar o serviço. Sem volume, o SQLite e os uploads são perdidos após redeploy.
4. Habilite domínio público HTTPS do serviço e confirme `https://.../api/health`.
5. Configure superusuário do PocketBase em canal seguro (NÃO no frontend nem no GitHub) e teste migrações no banco vazio **antes** de migrar dados reais.
6. Configure `VITE_POCKETBASE_URL` com o domínio HTTPS nos dois projetos Vercel: cliente e gestor. Faça novo deploy de ambos.
7. Configure CORS permitido para domínios dos dois frontends, SSL, backups `/data`, restauração testada e alertas.

### Cuidados obrigatórios
- As migrações `0001` a `0007` executaram num PocketBase 0.40.5 temporário com sucesso. O teste não substitui validação dos dados reais já existentes na infraestrutura antiga.
- A coleção `users` usada pelo login operacional e as regras de API precisam ser auditadas/implantadas.
- O novo hook `orders_finalize.pb.js` recalcula preço, adicionais, descontos e baixas de estoque no servidor em transação. Foi testado em PocketBase 0.40.5 num ambiente temporário; ainda faltam homologação de operação e limites de requisições antes da produção.
- API de clientes e vouchers não pode ter acesso público irrestrito; incluir autenticação real ou tokens limitados por operação.
- Não copie o `.env` antigo nem exponha segredos através de variáveis `VITE_*`.
- Migrar dados antigos somente com backup, exportação autorizada e conferência de integridade; publicar servidor vazio não equivale a migrar os cadastros.

### Comandos úteis
`pocketbase serve --http=0.0.0.0:8090 --dir=/data`

O serviço funciona separadamente da Vercel e utiliza as migrations e hooks versionados no GitHub.
