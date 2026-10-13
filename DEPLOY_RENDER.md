# Liberação controlada no Render

O serviço atual aponta para `main`, commit `78ef3cf`. As correções estão na branch
`fix/backend-security`. Nenhum deploy ou migração de produção foi executado. Push na
branch de correções não atualiza o serviço vinculado à `main`.

## Preparação

1. Abra **Environment** no serviço atual e confirme os nomes `MONGO_URI`, `JWT_SECRET`,
   `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, sem compartilhar
   os valores. Se o serviço depende do `.env` do Git, cadastrar as variáveis no painel
   é obrigatório antes da promoção: o arquivo foi retirado do índice.
2. Planejar a rotação das credenciais expostas de MongoDB/Cloudinary e usar um novo
   JWT_SECRET aleatório com pelo menos 32 bytes. Manter o banco existente, sem recriá-lo.
   A troca de JWT_SECRET encerra sessões existentes; todos precisarão fazer novo login.
3. Criar backup verificável do MongoDB e guardar os ativos legados. Testar restauração
   em um ambiente separado antes da liberação.
4. Criar um segundo serviço de homologação, apontado à branch de correções, com banco
   e credenciais separados. Usar dados fictícios. Não testar gravações no banco atual.

## Configuração da versão corrigida

| Configuração | Valor/regra |
| --- | --- |
| Runtime | Node LTS 24; alinhar NODE_VERSION do painel com .node-version |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Health Check Path | `/ready`, que só retorna 200 com conexão MongoDB ativa |
| NODE_ENV | `production` |
| HOST | `0.0.0.0` |
| PORT | Porta fornecida pelo Render |
| CORS_ORIGINS | Origens reais do frontend separadas por vírgula, sem caminho/barra final; sem `*` |
| PUBLIC_API_URL | URL HTTPS do respectivo serviço; ausente, usa RENDER_EXTERNAL_URL |
| TRUST_PROXY | Proxies realmente confiáveis; aceita configuração Express ou número de saltos. Validar IPs/rate limit em homologação; não usar true nem assumir a quantidade. |
| MONGO_URI/JWT_SECRET/CLOUDINARY_* | Novos segredos exclusivamente no Environment do respectivo serviço |

Em produção, a URL pública permanece `https://ekklesia-finance-backend.onrender.com`.
Configuração ausente, JWT curto, CORS wildcard ou URL pública HTTP impede a inicialização.
Conferir as configurações antes do merge. O teste local não valida os provedores reais.

## Aceite em homologação

- Login, sessão, `/health` e `/ready` com o frontend corrigido, para todos os perfis.
- Status cadastrais não suspendem acesso. Suspensão usa `authEnabled: false`, exclusivo
  do Admin. Mudanças de acesso/senha/permissões revogam tokens via `authVersion`.
  A interface atual ainda não tem controle para authEnabled.
- Novas senhas/reset: mínimo 12 caracteres e máximo 72 bytes UTF-8. Senhas antigas ainda
  funcionam no login. Alterar a própria senha exige `currentPassword`.
- Membro/líder não confirma contribuições; líder só altera/exclui seus registros pendentes.
  Conferir R$100 confirmados - R$20 de despesa confirmada = R$80, sem incluir R$50 pendentes.
  Auditar auto confirmações anteriores e registros sem status; não confirmar em massa.
- Novos comprovantes JPG/PNG/PDF com entrega autenticada, IDs diferentes para nomes iguais,
  e links assinados que expiram em 10 minutos. Atualizar a lista gera novos links.
  Verificar no Cloudinary real o suporte à entrega de PDFs autenticados.
- CSV/XLSX, duplicatas e rollback de lote. Importação exige Atlas/replica set e transações;
  não funciona com MongoDB standalone. Avaliar latência de lotes grandes, que podem exceder
  o timeout do cliente e precisam de evolução para processamento por jobs.
- Galeria legada: conferir referências a `/uploads/` e migrar os arquivos de forma
  controlada antes de remover essa dependência do deploy. Arquivos locais foram preservados.
  A listagem não realiza mais uploads/gravações. Galeria sem igreja pertence apenas à ADPV
  original na leitura; novas imagens gravam igreja.
- Comprovantes públicos antigos continuam públicos até uma migração no provedor. Planejar
  backup, cópia autenticada, atualização dos IDs no banco e invalidação dos ativos antigos.
  Não apagar o original antes de validar a substituição.

## Promoção

1. Para a primeira liberação, configurar **Auto-Deploy → Off** no serviço de produção.
   Após estabilização, usar **After CI Checks Pass**.
2. Confirmar Environment, backup, aceite de homologação e tratamento dos dados legados.
3. Fazer merge da branch validada em `main` e usar **Manual Deploy → Deploy latest commit**.
   A URL atual da API continua a mesma.
4. Acompanhar build/start, healthcheck, logs e testes de login/financeiro/arquivos.

## Recuperação

Guardar o SHA anterior e o novo. Rollback do Render restaura código, mas não desfaz
gravações em MongoDB/Cloudinary. Pode reutilizar variáveis individuais do deploy antigo,
incluindo credenciais expostas; não executar rollback antigo sem revisar esse efeito.
Não restaurar chaves expostas. Voltar ao commit antigo reintroduz falhas de segurança;
preparar uma versão compatível sem .env e com os segredos novos para deploy normal.

Para o cenário Atlas Free, seguir o [guia detalhado](GUIA_DEPLOY_SEM_PERDA.md), incluindo
restauração de teste, bloqueio de escrita e preservação dos arquivos.

Retirar .env do último commit não revoga segredos nem limpa o histórico. O saneamento
do histórico remoto exige coordenação e não foi executado. Não reescrever o histórico
enquanto o Render estiver promovendo alterações automaticamente.

Referências: [deploys](https://render.com/docs/deploys),
[rollbacks](https://render.com/docs/rollbacks),
[variáveis](https://render.com/docs/configure-environment-variables) e
[proxies Express](https://expressjs.com/en/guide/behind-proxies/).
