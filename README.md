# Loyola's Lanches — Sistema Integrado de Pedidos e Gestão

Sistema completo e responsivo para hamburgueria e lanchonete artesanal com mais de 18 anos de história em Pindamonhangaba - SP.

Consulte a documentação completa de arquitetura técnica e guia para desenvolvedores / agentes de IA em:
👉 **[docs/ARQUITETURA.md](docs/ARQUITETURA.md)**

---

## Canais Integrados

1. **Landing Page Pública (`/`):** Apresentação institucional, cardápio canônico em destaque, avaliações reais 5.0 e redes sociais. Identidade: Oliva / Vinho / Prata.
2. **Loja do Cliente (`/loja`):** App mobile-first para pedidos online, customização de ingredientes, cortesia da linha Gourmet e checkout com entrega ou retirada. Identidade: Carvão / Vermelho.
3. **Painel de Gestão & PDV PWA (`/gestao`):** Lançamento de pedidos balcão, recepção com alerta sonoro dos pedidos da loja, controle de estoque com baixa por receita e fechamento de caixa. Identidade: Preto / Vermelho.
4. **Área Administrativa da Landing (`/adm-landing`):** Editor de textos, upload de fotos e seletor de paletas de temas no estilo Adobe HSV.

---

## Como Executar Localmente

```bash
npm install
npm run dev
```

Para validar tipos e build:
```bash
npm run build
```
