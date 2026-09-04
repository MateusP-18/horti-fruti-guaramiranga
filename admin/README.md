# Painel Administrativo — Hortifruti Guaramiranga

Sistema de gestão administrativo completo, em HTML/CSS/JS puro (sem
frameworks, sem build). Fica em `admin/`, ao lado do site público, mas com
suas próprias páginas — nenhum arquivo do site foi descaracterizado.

## Como abrir
Abra `admin/index.html` no navegador. Não existe login nesta etapa (ver
"O que não foi implementado" abaixo) — o painel abre direto no Dashboard.

Para o painel e o site público compartilharem dados de verdade, veja a nota
sobre isso no README da raiz do projeto (seção "Como abrir").

## Estrutura
```
admin/
├── index.html            → Dashboard
├── produtos.html          → Seções de Produtos (Hortifruti/Polpas/Açougue)
├── midias.html             → Mídias do Site (mídias · avaliações · comentários)
├── estoque.html              → Estoque (visão geral · movimentações · baixo · histórico)
├── gestao-vendas.html          → Gestão de Vendas (vendas · pagamentos · caixa)
├── analise-vendas.html          → Análise de Vendas (indicadores · rankings · comparações)
├── analytics.html                → Analytics do Site (visitas · funil · cliques)
└── assets/
    ├── css/admin.css
    └── js/
        ├── admin-ui.js    sidebar, confirmação, toast, gráficos (SVG puro)
        └── um arquivo por página (dashboard.js, produtos.js, midias.js,
            estoque.js, gestao-vendas.js, analise-vendas.js, analytics.js)

../shared/                 → usado também pelo site público (ver raiz do projeto)
├── core/store.js            armazenamento, formatação, cálculo de períodos
└── services/                 8 serviços — única porta de entrada/saída dos dados
    ├── productsService.js
    ├── inventoryService.js
    ├── salesService.js
    ├── paymentsService.js
    ├── cashService.js
    ├── analyticsService.js
    ├── reviewsService.js     (avaliações + comentários)
    └── mediaService.js
```

## Arquitetura: camada de serviços (sem Supabase ainda)
Nesta evolução, o painel deixou de ter sua própria cópia isolada de dados —
agora ele lê e escreve através dos mesmos serviços que o site público usa
(pasta `shared/services/`), sobre o mesmo `localStorage` (chave
`hg_store_v1`). Nenhuma tela mexe direto no `localStorage`: tudo passa por
funções como `buscarProdutos()`, `registrarMovimentacao()`,
`registrarVenda()`, `registrarPagamento()`, `registrarEvento()` etc.

Isso resolve o problema de informação conflitante entre painel e site
(ex.: painel mostrando "disponível" enquanto o site já está "esgotado") e
deixa o sistema pronto para, no futuro, trocar só o *interior* dessas
funções por chamadas ao Supabase — nenhuma das 7 páginas do painel nem o
site público precisam ser reescritos quando isso acontecer.

## Regra de coerência estoque × disponibilidade
Implementada em `productsService.js`:
- **Estoque = 0** → o produto é sempre tratado como esgotado/indisponível,
  não importa o que o interruptor "disponível" diga.
- **Estoque > 0 e disponível = sim** → disponível normalmente.
- **Estoque > 0 mas abaixo do mínimo** → continua disponível, só entra no
  alerta de reposição.
- Situação do estoque em 4 níveis: 🟢 normal · 🟠 baixo · 🔴 crítico
  (≤ metade do mínimo) · ⚫ esgotado.

## Funcionalidades por página

**Dashboard** — indicadores de Vendas e Site respeitam o filtro de período;
indicadores de Estoque são sempre o valor atual. Gráfico de estoque geral e
tabela de reposição.

**Seções de Produtos** — igual à etapa anterior (categorias → dashboard da
categoria → cadastro/edição), agora com 4 níveis de estoque e o campo
"Origem" nas movimentações. Editar o estoque direto no formulário também
gera uma movimentação registrada — nunca é só um número solto.

**Mídias do Site** — mídias institucionais (com ativar/desativar, além de
alterar/remover), avaliações e comentários. As métricas de clique saíram
daqui e agora ficam em Analytics do Site.

**Estoque** (novo) — visão geral (indicadores + gráficos de todas as
seções), movimentações (registrar para qualquer produto + últimas
movimentações), estoque baixo (todos os produtos que precisam de reposição,
com atalho para editar) e histórico completo com filtro por período,
categoria, produto, tipo e origem.

**Gestão de Vendas** (novo) — área operacional:
- *Vendas*: vendas do site entram sozinhas (via checkout do carrinho); "Nova
  venda presencial" registra uma venda manual com múltiplos itens e
  pagamento (com cálculo de troco para dinheiro).
- *Pagamentos*: histórico de pagamentos; permite confirmar o pagamento de
  uma venda do site que ainda está "Aguardando".
- *Caixa*: abrir caixa (valor inicial + responsável), registrar
  entradas/retiradas durante o dia, e fechar caixa com conferência
  (esperado × informado × diferença) — testado com valores propositalmente
  diferentes para confirmar que a diferença aparece corretamente.

**Análise de Vendas** (evoluída) — agora estatística de verdade: filtro de
período com calendário oficial (semana seg→dom, mês dia1→último dia, ano
1/jan→31/dez), comparação automática com o período anterior (hoje×ontem,
semana×semana anterior, mês×mês anterior, ano×ano anterior), produtos mais
E menos vendidos, categorias, origem (site×presencial), forma de pagamento
e horários de maior movimento.

**Analytics do Site** (novo) — eventos reais gerados pelo uso do site
(`page_view`, `product_view`, `add_to_cart`, `cart_open`, `checkout_start`,
`whatsapp_click`, `instagram_click`), funil de conversão com percentual de
queda em cada etapa, e rankings de produtos mais vistos/mais adicionados ao
carrinho. **Sem nenhuma informação pessoal coletada.**

## Filtro de período (calendário oficial)
Hoje · Ontem · Esta semana (segunda→domingo) · Semana anterior · Este mês
(dia 1→último dia) · Mês anterior · Este ano (1/jan→31/dez) · Ano anterior
· Total histórico · Personalizado. Usado no Dashboard, Análise de Vendas,
Analytics do Site e no Histórico de Estoque.

## Dados de exemplo vs. dados reais
- **Produtos**: 26 produtos de exemplo (preços em R$ 00,00) — mesmos dados
  desde a etapa anterior.
- **Avaliações e comentários**: 1 exemplo cada, claramente marcado
  ("Cliente Exemplo"), avaliação em status Oculta por padrão.
- **Vendas, pagamentos, caixa, eventos de analytics**: **começam
  completamente vazios**. Só passam a existir quando alguém realmente
  compra pelo site ou quando o administrador registra algo no painel — não
  há nenhum número inventado em lugar nenhum. Onde não há dados, a tela
  mostra "Ainda não existem dados suficientes para esta análise" em vez de
  um gráfico vazio ou zerado sem explicação.

## Preparado para Supabase
Estrutura de dados pensada nas entidades sugeridas (mesmo sem banco SQL
ainda): `products`, `categories`, `product_images`, `inventory_movements`,
`sales`, `sale_items`, `payments`, `cash_registers`, `cash_movements`,
`reviews`, `site_media`, `analytics_events`. Toda leitura/escrita passa
pelos 8 serviços — trocar o motor deles por chamadas ao Supabase não exige
tocar nas telas. Sem login: a estrutura não assume nenhum usuário logado em
lugar nenhum, então plugar o Supabase Auth depois (com perfis
Administrador/Gerente/Caixa/Estoquista) não exige desfazer nada.

## O que foi propositalmente NÃO implementado
Login/autenticação, integrações reais (Google Reviews, Instagram,
Facebook, WhatsApp Business API), pagamento online, PDV completo, emissão
fiscal — exatamente como pedido. O registro de eventos de analytics e de
vendas do site já está ativo (gera dados reais a partir do uso real do
site), mas ainda em `localStorage`, não em um banco de verdade.

## Testado nesta evolução
Produtos (criar/editar/excluir/ativar/desativar/estoque/imagem — como
antes, revalidado com os novos serviços); estoque (entrada/saída/ajuste,
4 níveis, histórico filtrado); venda presencial completa com múltiplos
itens e cálculo de troco; confirmação de pagamento de venda do site;
abertura, movimentação e fechamento de caixa (com diferença proposital
para confirmar a conferência); Análise de Vendas com dados reais gerados
nos testes (rankings, categorias, origem, forma de pagamento, comparação
de períodos); Analytics do Site com eventos reais gerados navegando o site
público de verdade (funil, produtos mais vistos); as 7 páginas do painel
em desktop (1440px) e celular (390px) sem estouro de layout; compartilhamento
de dados confirmado entre o site e o painel, inclusive com as duas abas
abertas ao mesmo tempo.

### Um bug real encontrado e corrigido durante os testes
As colunas de `.adm-grid-2`/`.adm-grid-3` (usadas para colocar dois ou três
painéis lado a lado) não tinham `minmax(0, ...)`, então quando uma tabela
larga (como a de "Origem" em Análise de Vendas) ficava dentro delas, o
grid inteiro era forçado a alargar a página em vez de deixar só a tabela
rolar internamente. Corrigido globalmente no `admin.css` (afetava também a
versão mobile, que tinha o mesmo problema em uma coluna só).
