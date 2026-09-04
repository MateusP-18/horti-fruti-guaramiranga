# Site — Hortifruti Guaramiranga

Landing page institucional + vitrine de produtos (HTML/CSS/JS puro, sem
dependências de build, sem frameworks) — agora com **painel administrativo**
(pasta `admin/`) e uma **camada de dados compartilhada** (pasta `shared/`)
entre os dois.

## Como abrir
Abra `index.html` no navegador para o site público, ou `admin/index.html`
para o painel administrativo. Para publicar, envie a pasta inteira para
qualquer hospedagem (Hostinger, Vercel, Netlify, GitHub Pages etc.).

**Importante:** para o site e o painel realmente compartilharem os mesmos
dados (mesmo catálogo, mesmo estoque — ver "Arquitetura de dados"
abaixo), abra os dois a partir do **mesmo domínio/pasta**, e de preferência
teste por um servidor local (`python3 -m http.server`, por exemplo) em vez
de abrir os arquivos com duplo clique — alguns navegadores tratam
armazenamento local de forma diferente para arquivos abertos direto do
disco. Em produção (hospedagem de verdade), isso não é um problema.

## Estrutura
```
index.html              (site público)
assets/
  css/style.css
  js/script.js
  img/...                (logo em vários tamanhos)
shared/                  (NOVO — compartilhado entre site e painel)
  core/store.js           dados, formatação, cálculo de períodos
  services/                8 serviços: produtos, estoque, vendas,
                            pagamentos, caixa, analytics, avaliações, mídias
admin/                   (NOVO — painel administrativo, ver admin/README.md)
  index.html · produtos.html · midias.html · estoque.html
  gestao-vendas.html · analise-vendas.html · analytics.html
  assets/css/admin.css
  assets/js/admin-ui.js + um arquivo por página
```

O logo foi recortado a partir da imagem que vocês enviaram (removi o fundo
preto quadrado, deixando só o círculo, com transparência).

## O que já está pronto

### Landing page institucional
- Todas as seções com o conteúdo real que vocês já divulgam: bio do
  Instagram, horário (07:30–19h), destaque do açougue (novidade), destaques
  "Cliente feliz" (fundo laranja) e "Ação do Bem", link de WhatsApp real
  (wa.me/message/4MNKUYFCIBTYP1) e Instagram (@hortifrutiguaramiranga).
- SEO básico, acessibilidade e performance — como antes.

### Vitrine de produtos
- 3 seções com carrossel (Hortifruti/verde, Polpas/amarelo, Açougue/vinho),
  modal de produto, carrinho lateral e pedido pelo WhatsApp — como antes,
  sem nenhuma mudança visual ou de comportamento.
- **O que mudou por dentro:** os produtos agora vêm do serviço compartilhado
  (`shared/services/productsService.js`) em vez de um array fixo dentro do
  `script.js`. Isso é o que permite o painel administrativo editar o mesmo
  catálogo que o site usa — ver "Arquitetura de dados" abaixo.
- O carrinho, ao "Enviar pedido pelo WhatsApp", agora também registra a
  venda (origem "site", status "aguardando") e baixa o estoque dos itens —
  ambos vistos no painel administrativo, em Gestão de Vendas/Estoque.
- O site também registra eventos de uso (visita, produto visto, item no
  carrinho, clique no WhatsApp/Instagram) para aparecerem em Analytics do
  Site, no painel — sem coletar nenhuma informação pessoal.

## Arquitetura de dados (site + painel compartilhados)
Site e painel agora leem e escrevem os **mesmos dados**, guardados no
`localStorage` do navegador sob a chave `hg_store_v1`, através de 8
serviços em `shared/services/` (produtos, estoque, vendas, pagamentos,
caixa, analytics, avaliações/comentários, mídias). Nenhuma tela — nem do
site, nem do painel — mexe direto no `localStorage`; tudo passa pelos
serviços, que são a única porta de entrada e saída dos dados.

Isso significa: editar um produto no painel reflete imediatamente no site
(mesmo estoque, mesmo preço, mesma disponibilidade — nunca mais um
"disponível" no painel enquanto o site mostra esgotado).

Ainda **não existe Supabase**. Quando ele entrar, a ideia é que só o
*interior* das funções dentro de `shared/services/*.js` mude (de leitura em
localStorage para chamadas ao banco) — o site e as 7 páginas do painel não
precisam ser reescritos. Detalhes de como cada serviço está organizado,
o que fica pronto para banco de dados e o que ainda não foi implementado:
ver `admin/README.md`.

## Pendências para revisar antes de publicar
Marcadas com `[Endereço completo — adicionar]`, "Descrição a cadastrar" e
afins no próprio site:

1. **Endereço exato** da loja (seção "Localização" e dados estruturados no
   `<head>` do `index.html`).
2. **Mapa do Google** — hoje é um placeholder; depois de ter o endereço,
   gere o embed em https://www.google.com/maps e cole no lugar indicado.
3. **Dias de funcionamento** — o Instagram só informa o horário (07:30–19h),
   não os dias. Confirme se é todo dia ou de segunda a sábado.
4. **Fotos e vídeos reais** — todos os quadros tracejados com "📷 Foto: ..."
   são só posição reservada. Dá pra trocar direto pelo painel, na aba
   Mídias do Site (fotos de produto ficam dentro de cada produto, em
   Seções de Produtos).
5. **Preços** — tanto os da seção "Ofertas fresquinhas" quanto os do
   catálogo de produtos (todos em R$ 00,00) precisam ser preenchidos com
   os valores reais — pelo painel, em Seções de Produtos.
6. **Catálogo de produtos** — os 26 produtos de exemplo precisam ser
   conferidos/ajustados para o que vocês realmente vendem — pelo painel.
7. **Depoimentos** — os cards de "Cliente feliz" no site são só exemplo
   visual; as avaliações reais são cadastradas pelo painel, em Mídias do
   Site → Avaliações.
8. **Ação do Bem** — o texto está genérico; substituam pelo relato real.
9. **Testar o botão do WhatsApp do carrinho ao vivo** — o link é do formato
   `wa.me/message/...` (link curto do WhatsApp Business); o parâmetro de
   texto (`?text=`) deve funcionar igual ao formato `wa.me/<número>`, mas eu
   não consegui testar ao vivo se o WhatsApp realmente abre com a mensagem
   já preenchida nesse formato específico — vale testar pelo celular antes
   de divulgar.

## Observação de segurança
Site estático (sem formulário, sem backend), então a superfície de risco é
mínima. Ainda assim, ao publicar:
- Use HTTPS (a maioria das hospedagens já oferece isso de graça).
- Ao trocar o link do WhatsApp/Instagram, mantenha `rel="noopener noreferrer"`
  nos links `target="_blank"` (já está assim em todos).
- Quando o catálogo passar a vir do Supabase, nunca coloque chaves
  privadas/senhas direto no código — só chaves públicas destinadas ao uso
  no navegador (o painel já está preparado para isso, sem login ainda —
  ver `admin/README.md`).
