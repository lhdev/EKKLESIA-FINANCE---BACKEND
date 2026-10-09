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

Leia [DEPLOY_RENDER.md](DEPLOY_RENDER.md) antes da promoção e
[SECURITY_CHANGES.md](SECURITY_CHANGES.md) para mudanças, evidências e pendências.

`GET /health` verifica o processo; `GET /ready` exige conexão MongoDB ativa.
Não executar seed em build/start. Importação transacional exige Atlas/replica set.
O frontend está em um repositório separado.
