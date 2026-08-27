# Site — Hortifruti Guaramiranga

Landing page institucional (HTML/CSS/JS puro, sem dependências de build).

## Como abrir
Basta abrir `index.html` no navegador. Para publicar, envie a pasta inteira
(`index.html` + pasta `assets/`) para qualquer hospedagem (Hostinger, Vercel,
Netlify, GitHub Pages etc.) ou para o próprio painel do domínio.

## Estrutura
```
index.html
assets/
  css/style.css
  js/script.js
  img/logo-64.png   (favicon)
  img/logo-160.png  (cabeçalho / rodapé)
  img/logo-320.png  (uso geral / og:image)
  img/logo_full.png (versão em alta resolução, fundo transparente)
```

O logo foi recortado a partir da imagem que vocês enviaram (removi o fundo
preto quadrado, deixando só o círculo, com transparência).

## O que já está pronto
- Todas as seções com o conteúdo real que vocês já divulgam: bio do
  Instagram, horário (07:30–19h), destaque do açougue (novidade), destaques
  "Cliente feliz" e "Ação do Bem", link de WhatsApp real
  (wa.me/message/4MNKUYFCIBTYP1) e Instagram (@hortifrutiguaramiranga).
- SEO básico (meta tags, dados estruturados de loja local), acessibilidade
  (navegação por teclado, textos alternativos, contraste revisado) e
  performance (fontes com carregamento otimizado, imagens leves).
- Menu mobile, botão flutuante de WhatsApp, animações leves ao rolar a
  página e contador de seguidores.

## Pendências para revisar antes de publicar
Marcadas com `[Endereço completo — adicionar]` e afins no próprio site:

1. **Endereço exato** da loja (seção "Localização" e dados estruturados no
   `<head>` do `index.html`).
2. **Mapa do Google** — hoje é um placeholder; depois de ter o endereço,
   gere o embed em https://www.google.com/maps e cole no lugar indicado.
3. **Dias de funcionamento** — o Instagram só informa o horário (07:30–19h),
   não os dias. Confirme se é todo dia ou de segunda a sábado.
4. **Fotos e vídeos reais** — todos os quadros tracejados com "📷 Foto: ..."
   são só posição reservada. Substitua por fotos reais da loja, dos
   produtos, do açougue e das ações sociais.
5. **Preços do encarte** — os valores usados na seção "Ofertas fresquinhas"
   (Pernil suíno R$21,99, Colchão suíno R$21,99, Carne moída R$34,99,
   Alface R$2,99, Banana palma R$2,99) são do último encarte visto no
   Instagram de vocês — são só um exemplo de como fica visualmente.
   Atualizem toda semana com os preços atuais.
6. **Depoimentos** — os 3 cards de "Cliente feliz" estão vazios
   (placeholder). Vale puxar depoimentos reais dos Stories/destacados.
7. **Ação do Bem** — o texto está genérico; substituam pelo relato real das
   ações sociais que vocês já divulgam no destaque do Instagram.

## Observação de segurança
Site 100% estático (sem formulário, sem backend, sem coleta de dados), então
a superfície de risco é mínima. Ainda assim, ao publicar:
- Use HTTPS (a maioria das hospedagens já oferece isso de graça).
- Ao trocar o link do WhatsApp/Instagram, mantenha `rel="noopener noreferrer"`
  nos links `target="_blank"` (já está assim em todos).
