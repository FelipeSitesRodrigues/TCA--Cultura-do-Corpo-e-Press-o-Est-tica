# Cultura do Corpo e Pressão Estética · TCA 2026

Apresentação do Trabalho de Conclusão Anual do 3º ano do Colégio Cristão Kairós (Suzano, 2026).
Davi Borges, Gabriel Macário, Felipe Rodrigues e Brenno Veiga. Orientadora: Prof.ª Girlene da Silva Lima.

Site estático de slides, com animação, vídeo e gráficos. Sem framework e sem dependência de runtime.

## Como passar os slides

| Pra fazer | Aperta |
|---|---|
| Avançar | seta →, espaço, Enter, Page Down (passador de slide) ou clique |
| Voltar | seta ←, Page Up ou clique no canto esquerdo da tela |
| Tela cheia | F |
| Começo / fim | Home / End |

Bolinhas piscando no canto de baixo: ainda tem clique naquele slide. No slide 14 a alça do comparador pode ser arrastada.

Sem internet, abrir `dist/index.html` direto do disco funciona igual.

## Estrutura

- `src/index.html`: moldura (HUD, cortina entre apresentadores)
- `src/slides/`: um arquivo por slide, na ordem do nome
- `src/css/base.css`: tokens, cores por apresentador, sistema de animação
- `src/css/slides.css`: estilo de cada slide
- `src/js/deck.js`: navegação, contadores, vídeo, comparador e grade de pontos
- `src/img/imagens.json`: recorte, cor e tamanho de cada foto
- `dist/`: o que vai pro ar (a Vercel serve essa pasta sem build)

## Comandos

```bash
npm install                     # sharp e puppeteer-core, só pra build e print
node build.mjs                  # gera dist/
node scripts/servir.mjs dist 4173
node scripts/slides.mjs         # print de cada slide em revisao/ (modo estático)
node scripts/slides.mjs --pdf   # PDF de reserva em revisao/apresentacao.pdf
```

`?estatico` na URL mostra cada slide no estado final, sem animação.

As fotos originais (`src/img/raw/`) não vão pro repositório: só a lista de origem e licença,
em `src/img/raw/fontes.md`. O `dist/` já tem as versões tratadas.
