# Ekklesia Finance — Backend

API Node.js/Express, MongoDB e Cloudinary. Node LTS 24 recomendado.

```sh
npm ci
npm test
npm audit
npm start
```

Em desenvolvimento, configurar o .env local a partir de .env.example; `npm run dev`
usa o watcher nativo do Node. Em produção, os segredos ficam no Environment do Render.
Não versionar .env, banco, uploads ou node_modules.

Leia o [guia passo a passo para Atlas Free](GUIA_DEPLOY_SEM_PERDA.md) e
[DEPLOY_RENDER.md](DEPLOY_RENDER.md) antes da promoção e
[SECURITY_CHANGES.md](SECURITY_CHANGES.md) para mudanças, evidências e pendências.

`GET /health` verifica o processo; `GET /ready` exige conexão MongoDB ativa.
Não executar seed em build/start. Importação transacional exige Atlas/replica set.
O frontend está em um repositório separado.

## Igrejas autorizadas

Para autorizar outra igreja, adicione seu nome em `ALLOWED_CHURCHES`, no arquivo
`src/shared/config/churches.js`, e execute `npm test`. Adpv e Rosa de Saron já estão
habilitadas. A configuração é compartilhada por cadastro, login, autenticação,
seed de administrador e galeria; os testes percorrem as igrejas configuradas.

A regra de autorização fica em `src/domain/services/ChurchPolicy.js`, separada
da lista de igrejas e sem dependência de banco ou HTTP. Os casos de uso de cadastro,
login e criação de imagens aceitam uma política no segundo argumento do construtor
com o método `validateChurch(church, statusCode)`, mantendo a política padrão para
os consumidores existentes. Novas igrejas não exigem alterações nesses casos de uso.

A validação ignora caixa e espaços externos, preservando a grafia informada para
compatibilidade com dados existentes. As consultas continuam limitadas à igreja
do usuário. Imagens legadas sem igreja pertencem exclusivamente à Adpv.
