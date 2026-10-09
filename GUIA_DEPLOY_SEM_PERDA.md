# Guia de atualização: Render + MongoDB Atlas Free

Este roteiro prepara uma atualização controlada, com cópia recuperável e conferência
dos destinos. Não existe garantia de risco zero. Nenhuma etapa deste documento foi
executada no banco, no Cloudinary ou no Render de produção pelo agente.

As correções estão em `fix/backend-security`; produção estava vinculada a `main`,
commit `78ef3cf`. Confirme o commit atualmente Live no painel antes de começar.

## 1. Anotar os destinos e impedir deploy acidental

1. Abra o serviço existente no Render. Em Settings, configure **Auto-Deploy: Off**.
   Isso impede publicação automática, mas NÃO interrompe gravações no banco.
2. Anote, em local privado: serviço, branch, commit Live, comandos de build/start,
   versão Node, health check e configurações atuais. Guarde segredos em um gerenciador
   de senhas; não envie valores por chat nem publique capturas com valores visíveis.
3. Confira separadamente o host do cluster e o nome efetivo do banco usado pela API.
   Não deduza o nome pelo título do projeto. Se a URI não indicar banco, confirme o
   banco efetivo com o código/configuração atuais antes de copiar ou alterar a URI.
4. Confira o produto/conta Cloudinary e o respectivo `cloud_name`.

| Destino | Produção | Teste |
| --- | --- | --- |
| API | Serviço existente, mesma URL | Segundo serviço |
| Código | `main`, após aprovação | `fix/backend-security` |
| MongoDB | MESMO host e MESMO nome de banco atuais | Outro cluster/banco |
| Cloudinary | MESMO produto e cloud_name atuais | Produto separado |

O link `https://dashboard.render.com/web/srv-d7bu65hr0fns739fab9g/env` é o painel
privado do backend. Ele não é a URL do frontend e não permite confirmar os valores
sem acesso autenticado à conta.

## 2. Conferir Environment sem publicar nada

Abra Environment e confira variáveis individuais, grupos vinculados e Secret Files.
Registre de onde cada configuração vem; uma variável individual prevalece sobre um
grupo. Evite nomes duplicados em grupos diferentes.

Os nomes obrigatórios são `MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET`. Se faltarem, o serviço pode estar
dependendo do `.env` antigo do Git. A correção remove esse arquivo da publicação:
o Environment precisa estar completo antes de publicar.

Ao preparar variáveis individuais, escolha **Save only**. As opções **Save and
deploy** e **Save, rebuild, and deploy** publicam imediatamente. Alterações em grupos
e Secret Files têm comportamento diferente: não trate todo botão Save como seguro.
[Documentação Render](https://render.com/docs/configure-environment-variables).

## 3. Preparar ferramentas e acesso para a cópia

O Atlas Free não oferece backup gerenciado, mas permite `mongodump` e `mongorestore`.
Não use exportação CSV como substituto do backup completo do banco.
[Backup Atlas](https://www.mongodb.com/docs/atlas/backup-restore-cluster/).

1. Instale os [MongoDB Database Tools](https://www.mongodb.com/docs/database-tools/installation/)
   para Windows. Eles não foram encontrados no PATH deste computador na preparação.
2. Abra outro PowerShell e confirme `mongodump --version` e `mongorestore --version`.
3. Em Atlas, confira **Database Access** e **Network Access** no projeto correto.
   Autorize o IP público atual do computador para a cópia, preferencialmente com
   expiração. Não abra acesso a todo o mundo apenas para executar o backup.
4. Use um usuário de backup com leitura suficiente no banco escolhido. Esse usuário
   de conexão é diferente dos usuários/membros cadastrados no aplicativo.
5. Prepare outro cluster para restaurar. Use versão MongoDB compatível, preferindo
   a mesma versão da origem. No Free há limite de um cluster por projeto: pode ser
   necessário outro projeto. Não duplique todo o banco dentro do cluster atual sem
   conferir espaço: o limite de armazenamento inclui documentos e índices.

## 4. Fazer a primeira cópia consistente

Avise os usuários sobre uma janela de indisponibilidade. Interrompa a API de produção
com **Suspend Service** no painel do Render e pare outros serviços/scripts que
gravem no mesmo banco. Não exclua serviço, cluster, banco ou coleções. Suspenda
somente depois de salvar os arquivos locais descritos na etapa 6.

Impedir novas gravações é necessário: o Free não suporta `mongodump --oplog` nem
`mongorestore --oplogReplay`. Uma cópia feita enquanto várias coleções mudam pode
ficar inconsistente. Só pedir aos usuários para não usar o site não bloqueia chamadas
diretas à API. [Limites Atlas Free](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/).

Substitua TODOS os campos `SUBSTITUA_...` abaixo. A URI do comando não contém usuário
nem senha. A senha será solicitada interativamente pelo `mongodump`.

```powershell
$backupDir = Join-Path $env:LOCALAPPDATA 'Ekklesia-Backups'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$backupPath = Join-Path $backupDir ('ekklesia-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.archive.gz')

mongodump --uri 'mongodb+srv://SUBSTITUA_HOST_ORIGEM/' --username 'SUBSTITUA_USUARIO_BACKUP' --authenticationDatabase 'admin' --db 'SUBSTITUA_BANCO_PRODUCAO' --archive="$backupPath" --gzip
if ($LASTEXITCODE -ne 0) { throw 'Backup falhou. Interrompa a atualização.' }
if ((Get-Item -LiteralPath $backupPath).Length -eq 0) { throw 'Arquivo vazio.' }
Get-FileHash -LiteralPath $backupPath -Algorithm SHA256
```

Anote caminho, horário, host, banco, versão das ferramentas e hash. Copie arquivo e
hash também para outro armazenamento privado e criptografado, fora deste computador.
Não coloque backup em pasta do Git. `.gz` comprime, mas não criptografa.
O hash identifica o arquivo; não prova que ele pode ser restaurado.
[Sintaxe mongodump](https://www.mongodb.com/docs/database-tools/mongodump/).

## 5. Restaurar e conferir a cópia em outro destino

Antes de executar, confirme que o host é o do cluster de TESTE, que o banco de destino
é novo/vazio e que o usuário tem escrita apenas no destino necessário. Não use
`--drop`. Não execute este comando apontando para produção.

No mesmo PowerShell, usando o arquivo da etapa anterior:

```powershell
mongorestore --uri 'mongodb+srv://SUBSTITUA_HOST_TESTE/' --username 'SUBSTITUA_USUARIO_RESTORE' --authenticationDatabase 'admin' --archive="$backupPath" --gzip --nsInclude 'SUBSTITUA_BANCO_PRODUCAO.*' --nsFrom 'SUBSTITUA_BANCO_PRODUCAO.*' --nsTo 'ekklesia_restorecheck.*' --stopOnError
if ($LASTEXITCODE -ne 0) { throw 'Restauração falhou. Interrompa a atualização.' }
```

Confira no Atlas Data Explorer ou Compass:

- Todas as coleções da aplicação, nomes e contagem EXATA de documentos; não use só
  estimativas do painel nem apenas a coleção de usuários.
- Amostras com os mesmos `_id`, tipos BSON, datas, igreja e referências entre registros.
- Definições dos índices, especialmente unicidade de e-mail, e opções das coleções.
- Totais financeiros por igreja, departamento, status e período, incluindo pendentes.
- Referências de galeria/comprovantes e existência dos arquivos correspondentes.

O filtro de namespace precisa coincidir com o nome real do banco; código de saída
zero com zero documentos não é uma restauração válida. Se falhar, guarde os logs
privadamente, use outro destino vazio e investigue antes de prosseguir.
O dump não recria usuários de conexão do Atlas, regras de rede ou configuração Render.
[Sintaxe mongorestore](https://www.mongodb.com/docs/database-tools/mongorestore/).

A cópia real fica em ambiente privado de recuperação. Não a publique como uma
homologação acessível na internet. Depois desta primeira conferência, é possível
retomar a versão atual para os usuários enquanto a homologação é preparada.

## 6. Preservar comprovantes e galeria

1. Baixe os originais do Cloudinary, inclusive PDFs, e guarde um inventário relacionando
   cada arquivo a `public_id`, tipo de recurso/entrega e registro no banco. URLs no dump
   não são cópias dos arquivos. Confira se todos os downloads abrem corretamente.
   [Download dos ativos](https://cloudinary.com/documentation/ts_how_can_i_download_my_accounts_assets).
2. Salve os arquivos locais da pasta `uploads` existente no computador e recupere
   qualquer ativo acessível apenas na instância atual ANTES de suspensão/restart.
   No Render Free o sistema de arquivos é efêmero: mudanças locais desaparecem em
   redeploy, restart ou suspensão por inatividade.
   [Arquivos no Render Free](https://render.com/docs/free).
3. Procure referências legadas a `/uploads/`. A versão corrigida não publica a pasta
   antiga e não faz migração automática durante a leitura. Se houver referências,
   a migração de ativos é uma etapa separada obrigatória antes da promoção: copiar
   arquivo, validar destino, atualizar a referência exata e conferir com o frontend.
4. Não exclua originais nem altere IDs em massa. Comprovantes públicos antigos exigem
   migração específica para entrega autenticada e invalidação dos URLs antigos.
   Novos uploads privados não tornam os comprovantes antigos privados.

## 7. Homologar a correção com dados fictícios

Crie outro Web Service no Render com `fix/backend-security`, banco de teste e produto
Cloudinary de teste. Não reutilize credenciais de produção nem sua URI de produção.
Teste com uma versão do frontend apontando explicitamente para a API de teste.

Valide login de cada perfil, isolamento por igreja, edição de usuários, importação
CSV/XLSX e falha de lote, contribuição pendente, confirmação autorizada, despesa,
galeria, JPG/PNG/PDF e expiração dos links. O exemplo de saldo é R$100 confirmados
menos R$20 de despesa confirmada = R$80; R$50 pendentes ficam separados.

Uma diferença de saldo pode ser correção do cálculo antigo, e não perda de registros.
Compare documentos e valores por status. Não confirme registros em massa para
forçar o saldo antigo. `INACTIVE`, `TRANSFERRED` e `DISCIPLINE` continuam sendo
situações cadastrais; bloqueio de acesso é separado.

Teste também o processo de manter o usuário MongoDB da API temporariamente apenas
com leitura, conectar/iniciar a versão e depois liberar escrita. Se a inicialização
exigir criação de índices, resolva esse procedimento em homologação antes de usar
o bloqueio em produção. `/ready` verifica conexão, não permissões de escrita.

## 8. Preparar a configuração final sem mudar o destino dos dados

| Chave | Valor/regra de produção |
| --- | --- |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | Node 24, alinhado à `.node-version` |
| `HOST` | `0.0.0.0` |
| `MONGO_URI` | Mesmo cluster e mesmo banco; novas credenciais |
| `JWT_SECRET` | Novo segredo aleatório de pelo menos 32 bytes |
| `CLOUDINARY_CLOUD_NAME` | Mesmo produto/conta que já contém os arquivos |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Novas credenciais desse mesmo produto |
| `PUBLIC_API_URL` | `https://ekklesia-finance-backend.onrender.com` |
| `CORS_ORIGINS` | Origem HTTPS real do frontend; sem caminho, barra final ou `*` |
| `TRUST_PROXY` | Configuração validada para os proxies reais; não presumir saltos |

Deixe o Render fornecer `PORT`. Build: `npm ci --omit=dev`. Start: `npm start`.
Não adicione execução de seed/importação/migração aos comandos de build ou start.
O frontend e a API de produção mantêm as URLs existentes.

Para gerar JWT_SECRET no seu computador, com Node instalado:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Guarde o resultado no gerenciador de senhas e no Environment, nunca no Git ou chat.
A troca encerra sessões; os usuários farão novo login, sem recriar suas contas.

As credenciais antigas apareceram no histórico Git: remover `.env` não as revoga.
Crie e teste o novo usuário de conexão do MongoDB, limitado ao banco correto, e novas
chaves Cloudinary no mesmo produto antes de aposentar os antigos. Não troque o host,
o nome do banco nem `cloud_name` junto com a senha. Senhas com caracteres especiais
precisam da codificação correta na URI; obtenha a conexão pelo fluxo oficial Atlas.

## 9. Fazer a publicação na janela final

1. Mantenha Auto-Deploy Off e confirme aceite de homologação, recuperação testada e
   tratamento de `/uploads/`. Avise os usuários e interrompa os serviços que gravam.
2. Faça uma NOVA cópia com todas as gravações paradas. Repita a restauração em outro
   banco vazio, compare com a origem e registre os totais finais. A primeira cópia
   não inclui alterações feitas desde sua criação.
3. Use o novo usuário MongoDB da API temporariamente com acesso apenas de leitura,
   conforme ensaiado na etapa 7. Pare/restrinja também qualquer outro escritor. Não
   compartilhe esse usuário entre produção e testes. Após validar as novas credenciais,
   revogue a credencial exposta antiga enquanto a API está interrompida. Confirme que
   conexões antigas não continuam gravando; o bloqueio precisa ser efetivo.
4. Cadastre as variáveis finais com **Save only**. Confira novamente host, banco,
   cloud_name e URL. Faça merge da branch aprovada em `main`, com CI aprovado.
5. No MESMO serviço Render, retome-o conforme o fluxo do painel e use **Manual Deploy
   → Deploy latest commit** para publicar o commit aprovado e as variáveis novas.
   Retomar/reiniciar não substitui publicar a versão nova: confira o SHA no painel.
   O bloqueio de escrita no banco permanece durante essa transição.
6. Acompanhe build/start/logs. Confira `/health` e `/ready`, login e leituras autorizadas.
   Compare as contagens e os totais com a cópia final. Nenhuma gravação deve ter ocorrido
   durante o bloqueio. Só configure Health Check Path `/ready` depois que essa rota
   estiver disponível; não a aplique antecipadamente à versão antiga sem a rota.
7. Estando o commit, destinos e leituras corretos, libere `readWrite` para o usuário
   novo somente no banco correto. Aguarde aplicação das permissões e, se necessário,
   reinicie a MESMA versão aprovada para renovar a conexão. Confira a escrita autorizada
   conforme o ensaio, sem criar lançamentos financeiros fictícios na produção.
8. Reabra o acesso aos usuários, solicite novo login e acompanhe erros/arquivos/saldos.
   Finalize a revogação das chaves Cloudinary antigas assim que validar as novas.
   Se a conta não permitir coexistência de chaves, ensaie antes a troca na manutenção.

Se algum requisito falhar, mantenha a janela de manutenção. Não publique para testar
se a aplicação conecta por acaso e não libere permissões para contornar erro desconhecido.
Depois de estabilizar, pode-se habilitar **After CI Checks Pass**; backup e cuidados
com dados continuam necessários em mudanças futuras.

## 10. Se algo der errado

Interrompa novas gravações e preserve a situação atual e os logs antes de qualquer
recuperação. Não restaure automaticamente o backup por cima de produção: isso pode
apagar lançamentos recebidos depois da cópia. Prefira corrigir o código mantendo
dados atuais; se houve corrupção, restaure em OUTRO banco e reconcilie as diferenças.

O rollback Render não desfaz alterações MongoDB/Cloudinary. Também pode reutilizar
as variáveis individuais do deploy antigo. Um rollback direto ao build antigo pode
trazer credenciais expostas, além das vulnerabilidades anteriores, e falhar caso as
credenciais tenham sido revogadas. Não reative segredos comprometidos. Prepare uma
versão compatível de recuperação sem `.env`, com segredos novos, e faça um deploy
normal validado; não use um rollback antigo às cegas.
[Comportamento dos rollbacks](https://render.com/docs/rollbacks).

Mantenha cópias privadas periódicas, teste restauração regularmente e retenha cópias
anteriores aos deploys. Nenhuma nova gravação depois de um backup está protegida por
aquele arquivo: a frequência de backup define o intervalo potencial de perda.

## Critérios para prosseguir

- [ ] Host/banco/cloud_name de produção identificados e preservados.
- [ ] Variáveis completas no Environment; origem real do frontend conhecida.
- [ ] Backup final com gravações bloqueadas, hash e segunda cópia privada.
- [ ] Restauração real em destino separado conferida, incluindo índices e totais.
- [ ] Arquivos Cloudinary e locais preservados; referências `/uploads/` tratadas.
- [ ] Homologação com dados fictícios aprovada, incluindo congelamento de escrita.
- [ ] Credenciais expostas substituídas; sessões antigas encerradas.
- [ ] CI aprovado, SHA correto publicado manualmente e rotas validadas.
- [ ] Comparação final aprovada antes de liberar escrita e acesso dos usuários.
- [ ] Recuperação preparada sem restaurar segredos antigos ou sobrescrever dados novos.
