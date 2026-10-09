# Correções do backend — 2026-10-09

Branch `fix/backend-security`. Preparação para homologação; produção não alterada.

- Novas senhas/reset validados, bcrypt custo 12 e seed sem credencial conhecida.
  Login mantém compatibilidade com senhas antigas.
- JWT HS256, revogação de sessões ao mudar senha/acesso/permissões e authEnabled separado
  do status cadastral, conforme regra definida pelo proprietário.
- Validação de role/status/booleanos, email, URLs e datas; updates com runValidators.
- Membro/líder não confirma lançamentos; líder só altera/exclui seus registros pendentes.
  Confirmações registram autor/data; Mídia não recebe acesso financeiro por permissão avulsa.
- Saldo só inclui confirmados, com pendências separadas e verificação de overflow.
- PUT financeiro não altera comprovante por campos arbitrários enviados pelo cliente.
- Arquivos com IDs aleatórios/overwrite desativado; novos comprovantes autenticados e
  URLs assinadas de 10 minutos geradas depois do controle de acesso da listagem.
- MIME restrito/assinatura de bytes verificada; SVG/HTML rejeitados; limites de campos,
  arquivos e concorrência; XLSX limitado a 10 MB descompactados antes do parse.
- Importação valida lote e grava em transação, exigindo Atlas/replica set.
- Galeria por igreja, GET sem migração/gravação e URLs locais sem confiar no Host da chamada.
- users.view exigido na listagem e DTO mínimo para Financeiro.
- Rate limits, Helmet, no-store, erros sem detalhes/credenciais, /ready e validação de ambiente.
- Dependências atualizadas; nodemon substituído pelo watcher nativo do Node LTS.
- .env/node_modules/uploads retirados do índice e arquivos locais preservados; CI incluído.

## Evidência

55 testes aprovados, incluindo HTTP local e regressões de segurança.
`npm audit` e `npm audit --omit=dev`: zero vulnerabilidades conhecidas reportadas.
Testes não conectam ao MongoDB/Cloudinary reais nem usam credenciais do .env.

## Pendências e limites

Rotação de segredos e saneamento coordenado do histórico remoto ainda são necessários.
Comprovantes públicos antigos e galeria local exigem migração validada. Nenhum dado/índice
foi alterado em produção. Defaults de authVersion/authEnabled preservam contas antigas.

Os limites usam memória de uma instância; réplicas exigem store compartilhado.
Assinatura de bytes não equivale a antivírus ou saneamento completo de PDF; entrega financeira
usa download como anexo. Retenção/limpeza de comprovantes após exclusão financeira exige política.
Paginação com totais, idempotência de POST, versão de PUT e jobs de importação exigem evolução
conjunta dos clientes. Cadastro público continua habilitado; convites/aprovação exigem decisão
de produto. A revisão não certifica ausência de todas as vulnerabilidades.

Procedimento: [DEPLOY_RENDER.md](DEPLOY_RENDER.md).
