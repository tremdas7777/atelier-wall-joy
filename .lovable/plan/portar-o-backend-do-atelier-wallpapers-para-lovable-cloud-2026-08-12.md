# Portar o backend do Atelier Wallpapers para Lovable Cloud

## Objetivo
Reescrever o backend Node/Express do repositório (pagamentos Stripe, banco de dados, painel admin e downloads) usando **Lovable Cloud** (banco + storage) + **Stripe**, mantendo o frontend estático atual em `public/` funcionando sem reformulação visual.

## Decisões de arquitetura
- **Frontend**: mantém os HTML/JS/CSS estáticos em `public/`. Nenhuma reformulação visual — só um pequeno ajuste no formulário de configurações do admin.
- **APIs**: criar rotas server TanStack em `/api/*` que replicam exatamente os endpoints do Express, para o JS existente continuar chamando os mesmos caminhos (`/api/checkout`, `/api/order/status`, `/api/admin/*`, etc.).
- **Banco**: PostgreSQL via Lovable Cloud — tabelas `orders`, `page_views`, `checkout_events`, `settings`. Acesso somente por service_role (server-side). RLS habilitado, sem políticas anônimas (locked pela Data API).
- **Admin auth**: senha única via secret `ADMIN_PASSWORD`, sessão em cookie httpOnly assinado (JWT com `JWT_SECRET`). Mantém a tela de login de senha única que já existe no admin.
- **Stripe**: chaves como secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`). Checkout criado via API REST do Stripe com `fetch` (sem SDK Node — 100% compatível com edge). Webhook verifica assinatura com HMAC (`crypto`).
- **Produtos (ZIP)**: Supabase Storage, bucket `products`. Admin envia o ZIP pelo painel; download via token → redirect (302) para URL assinada do storage.
- **Configurações editáveis no admin**: preços (essencial/premium), nome da loja, e-mail de suporte (tabela `settings`). Chaves Stripe viram apenas indicador de status (configurado/não), só-leitura no formulário.

## Endpoints a criar (rotas server em `src/routes/api/`)
1. `POST /api/track` — registra page view
2. `POST /api/checkout` — cria sessão Stripe + pedido pendente
3. `GET /api/order/status` — status do pedido + URL de download
4. `POST /api/stripe/webhook` — confirma pagamento e cumpre pedido
5. `GET /api/download/$token` — valida token e redireciona para ZIP assinado
6. `POST /api/admin/login` · `POST /api/admin/logout` · `GET /api/admin/me` — auth admin
7. `GET /api/admin/dashboard` — métricas (receita, pedidos, views hoje, status)
8. `GET /api/admin/orders` — lista pedidos
9. `GET /api/admin/analytics` — receita/views por dia + breakdown por plano
10. `GET /api/admin/live` — feed de atividade (pedidos + views)
11. `GET /api/admin/products` · `POST /api/admin/upload-product` — status e upload de ZIPs
12. `GET /api/admin/settings` · `PUT /api/admin/settings` — configurações

## Módulos auxiliares (`src/lib/atelier/*.server.ts`)
- `db.server.ts` — consultas (orders, settings, events, views) via supabaseAdmin
- `auth.server.ts` — verificar senha admin, assinar/validar cookie JWT
- `stripe.server.ts` — criar checkout session, construir/verificar evento webhook
- `delivery.server.ts` — gerar tokens, cumprir pedido pago, validar download
- `products.server.ts` — info de produtos no storage (existe, tamanho, atualizado)

## Migração de banco
Uma migration criando as 4 tabelas com `GRANT` a `service_role`, RLS habilitado, + `INSERT` das settings padrão (preços, nome, e-mail) e 2 pedidos demo pagos (igual ao repo: `cs_demo_essentiell`, `cs_demo_premium`).

## Secrets necessários
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` — você digita num formulário seguro
- `ADMIN_PASSWORD` — você define, ou eu gero uma
- `JWT_SECRET` — gerado automaticamente

## Ordem de execução
1. Habilitar Lovable Cloud ✅ (já feito)
2. Migration de banco + criar bucket `products` + upload dos ZIPs placeholder existentes
3. Pedir secrets (Stripe + senha admin) via formulário seguro
4. Criar módulos auxiliares em `src/lib/atelier/`
5. Criar as rotas `/api/*`
6. Pequeno ajuste no admin HTML (campos Stripe só-leitura) — sem tocar no resto do frontend
7. Validar: build do projeto, login admin, dashboard, fluxo de checkout demo, download
