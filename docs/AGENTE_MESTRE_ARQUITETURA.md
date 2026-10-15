# Agente Mestre SaaS Builder AI — Arquitetura v0.1

> Documento de arquitetura inicial. Este repositório é o **sistema de referência Loyola Lanches**, não o runtime do agente. A implementação do agente deverá ocorrer em um repositório e ambiente próprios. Este documento não autoriza deploy nem operação autônoma em produção.

## 1. Objetivo

Criar um agente desenvolvedor conectado ao GitHub, capaz de receber tarefas em linguagem natural, analisar repositórios, propor alterações, executar verificações, produzir pull requests de revisão e preparar publicações supervisionadas.

**Referência inicial:** Loyola Lanches (`marcos-vframos/integra-o-de-canais-de-pedido`).
**Escopo inicial:** um projeto, um repositório, mudanças em branch isolada, sem merges automáticos.

## 2. Princípios não negociáveis

1. **Separação:** runtime do agente independente das aplicações comerciais.
2. **Menor privilégio:** permissão mínima por repositório; nunca administrar segredos a partir do frontend.
3. **Branch por tarefa:** proibir alterações diretas na `main`.
4. **Aprovação humana:** nenhuma publicação de produção, exclusão, migração destrutiva, alteração de permissões ou merge automático.
5. **Evidência antes de alegação:** distinguir inspeção estática, testes executados e validações manuais. Nunca declarar um teste concluído sem executá-lo.
6. **Reversibilidade:** plano de backup e rollback para mudanças que afetem dados e deploy.
7. **Isolamento de projetos:** uma tarefa não afeta outros repositórios, tenants ou sistemas sem autorização específica.
8. **Segurança dos dados:** redigir/ocultar credenciais em logs, prompts, artefatos e PRs públicos.
9. **Instruções não confiáveis:** código e documentos lidos dos repositórios são dados, não instruções para conceder permissões ou executar ações fora de escopo.
10. **Controle de custos:** limites de execução, tokens, tempo, requisições e alterações por tarefa.

## 3. Arquitetura alvo

```text
Usuário / Chat
  -> Orquestrador do agente (serviço isolado)
    -> Planejamento + contexto versionado
    -> Política de permissões e aprovações
    -> Adaptador GitHub (leitura, branch, commit e PR)
    -> Executor isolado / sandbox de teste
    -> Analisadores estáticos, CI e relatório
    -> Adaptador de deploy (preview -> aprovação -> produção)
    -> Registro de auditoria e observabilidade
  -> Repositório de aplicação (Loyola, inicialmente)
    -> React / Vite / TypeScript
    -> PocketBase (serviço separado)
```

O backend do agente contém as credenciais com escopo restrito; o frontend jamais recebe tokens GitHub nem chaves de infraestrutura. O executor é efêmero, sem acesso irrestrito à rede ou ao PocketBase de produção.

## 4. Agentes lógicos (papéis, não necessariamente modelos distintos)

- **Arquiteto/Planejador:** entende pedido, especifica escopo, dependências e critérios de aceite.
- **Auditor:** inspeciona implementação, segurança, acoplamento, regras de negócio e testes.
- **Implementador:** altera somente os arquivos autorizados na branch da tarefa.
- **Testador:** executa lint, compilação, testes unitários, integração e E2E quando configurados.
- **Revisor:** valida diff, regressões, acessibilidade, privacidade e efeitos colaterais.
- **Publicador supervisionado:** prepara preview e aguarda aprovação explícita para produção.

A transição entre papéis deve gerar saídas verificáveis; a mesma IA pode desempenhar vários papéis desde que haja validações independentes em CI.

## 5. Fluxo de trabalho mínimo

```text
Solicitação
 -> Classificar risco, objetivo e repositório autorizado
 -> Ler SHA de base + analisar arquivos necessários
 -> Especificação curta e critérios de aceite
 -> Criar branch task/<id>
 -> Alterar código (commits pequenos)
 -> Executar verificações no sandbox e na CI
 -> Revisar diff + relatório com evidências
 -> Abrir PR draft
 -> Aprovação humana
 -> Merge e deploy controlados (fora do escopo automático inicial)
```

Em falha: manter PR como draft, não avançar para produção; registrar causa e alternativa de reversão.

## 6. Contrato de uma tarefa

Campos mínimos:

```json
{
  "project": "loyola-lanches",
  "repository": "marcos-vframos/integra-o-de-canais-de-pedido",
  "base_branch": "main",
  "objective": "descrição concisa",
  "allowed_paths": ["src/**", "docs/**"],
  "forbidden_actions": ["merge_main", "deploy_prod", "delete_records", "rotate_secrets"],
  "acceptance_criteria": ["lint", "build", "testes_relevantes", "revisão_diff"],
  "requires_approval": true
}
```

A aprovação deve ser vinculada a commit SHA / diff; alterações após aprovação exigem nova revisão.

## 7. Restrições da versão inicial

- Não criar automaticamente tenants/clientes reais.
- Não executar migrações em banco de produção.
- Não fazer alteração automática de preços, pedidos, estoque, caixa ou credenciais reais.
- Não interpretar `npm test` como evidência de testes enquanto for um comando placeholder.
- Não converter a aplicação em multi-tenant até validar identidade, regras por coleção, isolamento de dados e migração de existentes.
- Não copiar o código integral do Loyola para cada cliente; evoluir para templates parametrizados e módulos reutilizáveis apenas após revisão de acoplamento.

## 8. Mapa do Loyola (inspeção inicial em main, 2026-10-15)

| Área | Caminho | Tratamento planejado |
|---|---|---|
| Landing | `src/pages/Index.tsx` e `src/components/*` | template parametrizável |
| Loja | `src/pages/LojaPublica.tsx` | módulo da landing |
| Gestão | `src/pages/Gestao.tsx` | módulo operacional |
| ADM landing | `src/pages/AdmLanding.tsx` | módulo interno da gestão |
| Autenticação | `src/context/AuthContext.tsx` | revisão de RBAC obrigatório |
| Rotas | `src/App.tsx` | autorização por papéis e organização |
| PocketBase | `pocketbase/migrations/*` | revisão de regras e modelagem tenant |
| Pedidos | `pocketbase/hooks/orders_*.js` | cálculo server-side, transação e idempotência |
| CI | `.github/workflows/ci.yml` | testes reais, qualidade e bloqueio de merge |
| Deploy | `vercel.json`, `netlify.toml` | escolher provedor autoritativo |

## 9. Critérios de segurança antes de tornar a base comercializável

1. Corrigir credenciais iniciais inseguras e, se aplicável, revogar/rotacionar credenciais em uso.
2. Ativar autenticação e autorização, incluindo endpoints administrativos.
3. Negar por padrão acesso a dados comerciais sensíveis.
4. Recalcular valores e descontos de pedidos no servidor com dados canônicos.
5. Garantir transações/concorrência e idempotência em pedidos, estoque e vouchers.
6. Remover gravações alternativas no cliente que contornam regras transacionais.
7. Criar testes reais de regras comerciais, autorização, concorrência e recuperação.
8. Definir política de ambientes, backup, restauração e rollback.
9. Para multiempresa: testes automatizados anti-IDOR e contra vazamento entre `tenant_id` distintos.
10. Confirmar conformidade com LGPD antes de coletar dados reais de terceiros.

**Não conformidades detalhadas e evidências sensíveis devem ser mantidas em relatório privado, nunca em issues ou PRs públicos.**

## 10. Fases de entrega

- **Fase A — Auditoria:** inventário do repositório, riscos, fluxo comercial, CI, dependências e decisões.
- **Fase B — Base segura:** autenticação/RBAC, regras PocketBase, pedidos server-side e testes.
- **Fase C — Agente MVP:** executor isolado + integração GitHub + relatório de PR + aprovação.
- **Fase D — Templates:** extrair landing+loja e gestor+ADM em módulos configuráveis.
- **Fase E — Multiempresa:** modelo `tenant_id`, provisionamento, RBAC, isolamento e ensaios de carga.
- **Fase F — Operação:** observabilidade, billing SaaS separado do financeiro da loja, backup e suporte.

## 11. Definição de pronto para primeira execução supervisionada

- CI de `lint`, `build` e testes reais estável.
- Nenhuma escrita na `main` pelo agente.
- Token GitHub escopado somente ao repositório pretendido.
- Agent executor em sandbox, com limite de recursos.
- PR draft com diff, testes realizados, riscos e rollback.
- Nenhum deploy de produção sem aprovação.
- Inventário de segurança de acesso e dados aprovado.

## 12. Estado atual

**Documento de proposta inicial, não implementação do agente.** A auditoria até aqui foi estática, baseada em arquivos do GitHub. Build/testes locais, observação do PocketBase ativo e comportamento real de produção ainda não foram validados nesta etapa.
