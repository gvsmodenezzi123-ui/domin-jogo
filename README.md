# Buxaria — Patch 0.4

Duelo 1x1 tático de **dominó roguelike** numa campanha de 18 rivais, em dark pixel art
(clima Inscryption / Buckshot Roulette). Feito como PWA para tela vertical de iPhone.

## Rodando

```bash
npm install
npm run dev       # servidor local (abre na rede, dá pra testar no celular)
npm test          # testes do motor, da IA, do layout e das relíquias (centenas de duelos simulados)
npm run lint
npm run build     # gera dist/ (base relativa: funciona na raiz ou em subpasta)
npm run preview   # serve o build, com service worker ativo
npm run icons     # regenera ícones e splash screens em public/
```

No iPhone: abra no Safari → Compartilhar → **Adicionar à Tela de Início**.
O app abre em tela cheia, com barra de status translúcida e sem zoom.

## Publicar (para testar como PWA)

O PWA precisa de HTTPS. Duas opções:

**GitHub Pages** (repo público, ou conta com plano pago se o repo for privado)
1. O workflow `.github/workflows/deploy-pages.yml` roda a cada push em `main` (e nesta branch do patch):
   lint → testes → build → publica `dist/` na branch `gh-pages`.
2. Uma vez só: Settings → Pages → Build and deployment → Source: **Deploy from a branch** →
   `gh-pages` / `(root)` → Save.
3. Endereço: `https://<usuário>.github.io/domin-jogo/`

**Vercel ou Netlify** (grátis também para repo privado)
- Importe o repositório pelo site deles (login com GitHub) e escolha a branch.
- O Vite é detectado sozinho: build `npm run build`, pasta `dist`.

## Regras básicas

- Duplo-seis (28 pedras), 7 para cada lado, 14 no **Dorme**. 5 corações para cada um.
- A 1ª rodada (e qualquer rodada depois de empate) abre com a **maior bucha** das mãos.
  Depois disso, quem venceu a rodada anterior abre com qualquer pedra.
- Dano de cada vitória:

  | Vitória | Dano |
  | --- | --- |
  | Batida normal | 1 ♥ |
  | Batida de bucha (última pedra é dupla) | 2 ♥ |
  | Cruzada (última pedra casa com as duas pontas) | 3 ♥ |
  | Tranca (menor soma de pontos na mão vence; empate não dá dano) | 1 ♥ |

- **Múltiplo de 5:** se a soma das duas pontas abertas fechar em múltiplo de 5, quem jogou ganha **+$3**.
- **Compra por turno:** 1ª grátis · 2ª custa $3 · 3ª custa 1 coração (nunca mata: precisa ter 2+). Máximo 3.
- **Passar a vez** é sempre permitido com a mesa aberta. Dois passes seguidos (um de cada) = **tranca na hora**.
- Tranca também acontece sozinha quando a mesa fecha (pontas iguais e as 7 pedras do número na mesa)
  ou quando o Dorme secou e ninguém encaixa.

## Patch 0.4: campanha, menus e mesa viva

### Menu principal (`TitleScreen.jsx`)
Lâmpada, logo **BUXARIA** com contorno pesado e quatro botões:
- **JOGAR** → NOVO JOGO ou **CONTINUAR** (apagado se não houver run salva).
- **OPÇÕES** → volume dos efeitos, volume da música/bar, vibração e resetar progresso (pede confirmação).
- **COLEÇÕES** → o **Livro de Boteco** com todos os talismãs, pedras de grife e rivais. O que você já
  viu (loja, hotbar do rival, seu baralho, mesa) mostra ícone, nome e efeito; o resto é silhueta com "?".
- **CRÉDITOS** da mesa.

### Campanha (`src/data/campaign.js`, `CampaignMap.jsx`)
3 regiões × 6 nós = 18 rivais. Os nós 1–5 sobem de dificuldade; o 6º é o **chefe**.
Trilha vertical de baixo para cima: o nó vencido ganha um **X de giz** e libera o próximo.

| Região | Rivais (chefe por último) |
| --- | --- |
| 1. Boteco da Esquina | Tio Zé · Tonho do Gás · Baiano da Sinuca · Valdir Borracheiro · Dona Neide · **Seu Arlindo, o Rei da Bucha** (5♥, bucha dele dá dano dobrado) |
| 2. Clube da Sinuca Clandestino | Marcão do Guincho · Serginho 22 · Cida da Marmita · Paulinho Pente Fino · Tião Navalha · **Beto Cigano, o Banqueiro** (6♥, cobra $2 a cada compra sua) |
| 3. Submundo do Jogo do Bicho | Carlinhos Mão Leve · Bigode de Ouro · Madama Sofia · Doutor Fausto · Alemão do Ferro Velho · **Comendador Moreira, o Dono do Boteco** (7♥, 2 talismãs lendários, imune à 1ª tranca) |

Regras próprias (`mechanics` em `rivals.js`, aplicadas no `gameReducer.js`): Cida recupera 1♥ quando
você passa; Paulinho vê a sua pedra mais pesada e Sofia as suas buchas (a IA usa e a sua mão marca com
um olho); Carlinhos rouba $2 quando casa as duas pontas; as pedras do Alemão valem 2× na tranca.

- **Seus corações continuam** de um nó para o outro: vencer cura **+2♥**, vencer chefe cura tudo.
- **Save** (`engine/save.js` + `engine/progress.js`, localStorage `buxaria:run`): gravado no mapa e na
  loja (nó, vida, moedas, talismãs, pedras de grife e a vitrine como estava). Perder ou vencer a run apaga.
- Vencer o Comendador encerra a run: **VOCÊ É O NOVO DONO DO BOTECO**.

### Loja em grade
Topo com saldo e a sua hotbar (toque para vender); 3 cartas quadradas de talismã em cima; 2 cartas
largas de pedra de grife embaixo, com o material animado e "Substitui [X|Y]". Reembaralhar fica mais
caro na mesma visita: **$3, $5, $8, depois $12**. Chance de raridade por região:

| Região | Comum | Raro | Lendário | Mítico |
| --- | --- | --- | --- | --- |
| 1 | 60% | 35% | 5% | 0% |
| 2 | 45% | 35% | 15% | 5% |
| 3 | 30% | 30% | 25% | 15% |

### Mesa
- Fala do rival num **balão compacto** colado no retrato, some em 2,5 s. Os avisos de +$3 e de talismã
  viraram **textos flutuantes**: o "+$3 Σ10" sobe da pedra jogada até o contador de moedas.
- **Toque só seleciona.** Jogar é no botão JOGAR ou na vaga pontilhada da mesa (sem toque duplo).
- **Jogada do rival:** "PENSANDO..." embaixo do retrato (mín. 600 ms) → a pedra voa da mão dele até a
  ponta (400 ms) → **SLAM** seco de osso na madeira + a mesa treme 100 ms → 800 ms de destaque (anel
  amarelo pulsando, escala 1,05 e o rótulo "[4|3]"). Só então a sua vez libera.
- Feltro com a cor de cada rival, enfeites (giz, rasgo e marca de caneca, neon, cinzas e moedas, névoa
  tóxica, runas, ferrugem, conhaque e mogno) e clima por região (fumaça no clube, brasa no submundo).
- Pedras de grife: Ouro com reflexo contínuo, Rubi pulsando com brasas subindo, Cristal com prisma de
  arco-íris na borda, Chumbo em metal escuro com rachadura em relevo, Fantasma flutuando (75–95%).
  Cada uma tem som próprio ao entrar na mesa (moedas, sino de vidro, baque grave com eco, bigorna).

## Patch 0.3: run roguelike, Loja Clandestina e rivais

> Parte deste patch mudou no 0.4 (vida entre nós, ordem fixa dos rivais, preço do reembaralhar): veja acima.

### A run
- Você começa com o baralho de 28 pedras **100% comum** e sem talismãs, contra o **Tio Zé**.
- Uma **partida** é vencida zerando os corações do rival (3 na maioria; o Tião Navalha tem 5,
  o Beto Cigano 4). Seus 5 corações voltam cheios a cada partida; perder uma partida acaba a run.
- Vencer paga **$8** (o Tião paga +$4, o Beto +$15) e abre a **Loja Clandestina do Boteco**.
- Moedas, talismãs e o seu baralho passam de uma partida para a outra.

### Baralho próprio (`state.decks`)
As pedras de grife compradas **substituem** a comum no seu baralho: ele continua com 28. Quando
a pedra cai na sua mão (distribuição ou compra), ela vem aprimorada; se cair na mão do rival, é a
comum dele. O rival tem o baralho dele (o Tião Navalha começa com um [4|6] de Chumbo).

### Loja Clandestina (`src/components/Shop.jsx`, `src/engine/shop.js`)
- Saldo, sua hotbar em **modo venda** (toque num talismã → "VENDER POR $X?").
- **3 talismãs** e **2 peças de grife** sorteados ("[4|2] de Ouro substitui o seu [4|2] comum").
- **Reembaralhar** por $3. Hotbar cheia: "HOTBAR CHEIA! VENDA UM TALISMÃ ANTES DE COMPRAR OUTRO".
- Mostra o próximo adversário e o botão **PRÓXIMO ADVERSÁRIO**.

### Raridades (`src/data/rarities.js`)

| Raridade | Cor | Preço | Revenda | Talismãs | Peças |
| --- | --- | --- | --- | --- | --- |
| Comum | verde | $4–6 | $2 | Cinzeiro, Borracha, Caneca, Giz | — |
| Raro | azul | $7–10 | $4 | Olho de Vidro, Dado Viciado, Chave de Fenda, Bucha de Aço | Ouro |
| Lendário | roxo | $12–16 | $7 | Dedal, Espelho, Carteira, Anel | Cristal, Chumbo |
| Mítico | dourado/sangue | $18–25 | $10 | Mão Grande, Relógio Quebrado, Barbante Mágico (vê 3, escolhe 1) | Rubi, Fantasma |

### Toque longo (350 ms)
Segure uma pedra aprimorada da mão, um talismã (seu, do rival ou da loja) ou uma peça de grife:
aparece um balão com nome, raridade e efeito. Soltar fecha. Toque rápido continua jogando.

### Mesa espelhada
- **Sua hotbar** logo acima do leque (com DESFAZER do Relógio e o botão DEV, se liberado).
- **Bancada do rival** no próprio feltro (sem madeira): retrato, hotbar 2x2 dele, corações, moedas,
  dorme e a mão dele flutuando virada para baixo, ~27% menor, com as pedras reveladas de frente.

### Rivais (`src/data/rivals.js`)

| Rival | Corações | Começa com | Estilo |
| --- | --- | --- | --- |
| Tio Zé | 3 | — | o clássico (abre a run) |
| Seu Arlindo, o Velho Truqueiro | 3 | Chave de Fenda | solta buchas logo no começo |
| Dona Neide, a Rainha da Tranca | 3 | Dedal de Chumbo | defensiva, iguala pontas e tranca |
| Marcão do Guincho | 3 | Cinzeiro de Bar | pesado e agressivo, força você a comprar |
| Tião Navalha | 5 | um [4|6] de Chumbo no baralho | malandro, caça múltiplo de 5 |
| Beto Cigano (mítico, raro) | 4 | Anel do Bicheiro | joga rápido, blefa nas falas, pote alto |

Os talismãs valem para o **dono**: o Cinzeiro do Marcão paga ele quando VOCÊ compra ou passa,
o Dedal da Neide tira o SEU coração, o Anel do Beto cobra de você. A IA usa pesos por rival
(`style` em `rivals.js`, aplicados em `scoreMove`).

## Patch 0.2: talismãs, peças aprimoradas e painel DEV

### Peças aprimoradas (`src/data/enhancedTiles.js`)

O aprimoramento fica na pedra (`tile.enhancement`) e vai junto para a mesa. Desde o 0.3 elas
vêm da Loja Clandestina e substituem a comum no baralho de quem comprou (ver acima).

| Pedra | Visual | Efeito |
| --- | --- | --- |
| Ouro | metal dourado polido, pips escuros, reflexo correndo | +$4 ao jogar; +$10 se você vencer a rodada com ela na mão ou na mesa |
| Rubi (Sanguinária) | carmesim brilhante, brilho vermelho pulsando | se o Tio Zé tiver que comprar ou passar logo depois, toma 1 de dano direto |
| Cristal (Camaleão) | ciano translúcido, neon | a ponta que ela deixa aceita qualquer número na SUA próxima jogada (para o Tio Zé vale o número normal) |
| Chumbo | ferro fosco escuro, rachado | congela a ponta durante a próxima vez inteira do Tio Zé |
| Fantasma | roxo translúcido, pulsação espectral | jogar não gasta a sua vez |

O "shader" de cada uma é CSS puro (`.tile-enh-<id>` em `index.css`): gradientes, chanfro com
`--d`, pips recoloridos e duas camadas extras (`.tile-enh-layer` por dentro, `.tile-enh-glow` por
fora), animadas só com `opacity`/`translate` para não pesar no iPhone. Vale na mão, na mesa, no
resultado da rodada e no painel DEV. Na mesa, a ponta congelada aparece em ferro e a curinga em ciano.

### Talismãs (`src/data/relics.js`)

Até 4 na sua hotbar (acima do leque). Segure um talismã para ver nome, raridade e efeito.
Desde o 0.3 eles são comprados na Loja Clandestina (raridades e preços na tabela acima).

| Talismã | Efeito |
| --- | --- |
| Caneca de Chopp | jogar bucha não gasta a vez |
| Olho de Vidro | revela as 2 pedras mais altas do rival |
| Borracha Escolar | 1x por rodada, encaixe com 1 número de diferença |
| Cinzeiro de Bar | +$2 cada vez que o rival compra ou passa |
| Dado Viciado | começa a rodada com pelo menos 2 pedras de 6 |
| Barbante Mágico | ao comprar, vê 3 e escolhe 1 (as outras vão pro fundo do dorme) |
| Giz de Sinuca | fechar múltiplo de 5 deixa descartar 1 pedra pro fundo do dorme |
| Chave de Fenda | suas buchas valem 0 na tranca |
| Dedal de Chumbo | o rival comprou/passou 2 vezes seguidas: −1 coração |
| Espelho Retrovisor | mostra a pedra que o rival acabou de comprar |
| Anel do Bicheiro | pontas iguais depois da sua jogada: rival −$3 (ou −1 coração sem dinheiro) |
| Bucha de Aço | a [0\|0] encaixa em qualquer ponta |
| Carteira Recheada | +1 de dano na batida a cada $15 que você tem |
| Mão Grande | batida com o rival de 4+ pedras: dano dobrado |
| Relógio Quebrado | 1x por rodada, botão DESFAZER: a última pedra do rival volta pra mão dele e a vez é sua |

Cada talismã é dado + ganchos puros (`rules`, `onDeal`, `onPlayerPlay`, `extraTurn`, `onTioZeMiss`,
`batidaDamage`, `trancaTileValue`, `drawOptions`, `reveal`, `ability`). O reducer chama os ganchos
nos momentos certos (`engine/powers.js` faz a ponte). Dano direto pode nocautear no meio da rodada.

As regras de encaixe ganharam opções (`getPlacement` em `dominoLogic.js`): `wildSides` (Cristal),
`fuzzy` (Borracha), `steelZero` (Bucha de Aço) e `frozenSides` (Chumbo, que a IA do Tio Zé respeita).
Escolhas que dependem de você (Barbante, Giz) travam o jogo em `state.pending` até você decidir.

### Painel DEV (`src/components/DevPanel.jsx`)

Secreto: **3 toques em "VOCÊ"** durante o duelo (ou 3 toques no título BUXARIA, que libera um botão
"DEV" discreto ao lado da sua hotbar e na loja). O rival espera com o painel aberto.

- **Gerar pedra:** lado A e B (0–6) + aprimoramento → ADICIONAR À MÃO (puxa do dorme ou do Tio Zé;
  se a pedra já estiver na mesa, cria uma cópia).
- **Talismãs:** toque para equipar/remover na hora (máximo 4).
- **Rival da partida:** troca o adversário (recomeça a partida) e **VENCER PARTIDA** (vai direto à loja).
- **Recursos:** +10 moedas, resetar vidas, −1 vida do rival, esvaziar a mão dele, limpar a mesa,
  forçar tranca (contagem imediata).

## Arquitetura

```
src/
  engine/
    dominoLogic.js    regras puras: pedras, embaralhar, pontas, encaixe com rotação
                      automática, tranca, batida/dano, abertura, escada de compra
    boardLayout.js    grade da mesa em "U" (caminhos de cada ponta, sem zoom)
    gameReducer.js    estado do duelo e transições; emite eventos com `seq`
    powers.js         relíquias/peças aprimoradas aplicadas ao estado (regras, ganchos, revelações)
    effects.js        transições pequenas compartilhadas (moedas, dano direto, avisos)
    shop.js           vitrine da loja (raridade por região), bloqueios de compra, revenda
    save.js           foto da run para o CONTINUAR (e validação do que vem do storage)
    progress.js       localStorage: save, Livro de Boteco, opções e vibração
    rivalInfo.js      jeito de jogar e regras de cada rival (texto do mapa)
    gameFeedback.js   eventos → texto flutuante do +$3, falas e humor do rival, dica do jogador
    audioSynth.js     sintetizador Web Audio puro: efeitos, trilha de bossa e ambiência de bar
  data/
    rarities.js       comum, raro, lendário, mítico (cor, revenda, peso no sorteio)
    enhancedTiles.js  as 5 peças aprimoradas (dados + ganchos)
    relics.js         os 15 talismãs (dados, ícones 12x12 em pixel art, ganchos por dono)
    campaign.js       as 3 regiões, os 18 nós, preços do reembaralhar e cura entre nós
    rivals.js         os 18 rivais (retratos 16x16, falas, estilo, regras, feltro)
    portraits.js      retratos dos rivais novos do 0.4
  ai/
    tioZeAI.js        decisão do Tio Zé + delay reflexivo de 700ms + falas
  components/
    DominoTile.jsx    pedra de osso envelhecido, chanfro 3D, pips em CSS Grid
    TableBoard.jsx    feltro verde-musgo, vinheta da lâmpada, caminho em "U"
    PlayerRack.jsx    mão em leque flutuante, seleção de pedras e botões de ação
    handFan.js        geometria do leque (posição, inclinação e descida de cada pedra)
    PauseMenu.jsx     pausa: continuar, som, opções, sair para o menu
    CampaignMap.jsx   trilha dos 18 nós com X de giz
    CollectionBook.jsx, OptionsPanel.jsx, MenuModal.jsx   telas do menu
    FloatingTexts.jsx textos que sobem da mesa (useFloats.js)
    RivalBench.jsx    o outro lado da mesa: retrato, hotbar e mão do rival
    RivalHand.jsx     leque do rival (virado, menor, pedras reveladas de frente)
    Hotbar.jsx        4 slots de talismã (seu, do rival, da loja)
    Shop.jsx          Loja Clandestina do Boteco
    InfoBalloon.jsx   balão do toque longo (useLongPress.js)
    DrawChoice.jsx    escolha da compra (Barbante no Dedo)
    DevPanel.jsx      painel de testes secreto
    RoundOverlay.jsx  resultado da rodada / fim do duelo
    TitleScreen.jsx   menu principal (destrava o áudio no iOS)
    PixelSprite.jsx, PixelHeart.jsx, sprites.js   pixel art em SVG
  App.jsx             loop principal: reducer, agenda do Tio Zé, sons, orquestra a UI
  pwa.js              bloqueio de pinça/zoom e registro do service worker
public/
  manifest.json, sw.js, icons/, splash/
scripts/generate-icons.mjs   gera os PNGs (sem dependências)
```

**Fluxo de dados:** a UI despacha ações (`PLAY`, `DRAW`, `DRAW_PICK`, `PASS`, `DISCARD`,
`SKIP_DISCARD`, `UNDO`, `TIO_ZE_ACT`, `NEW_RUN`, `LOAD_RUN`, `ENTER_NODE`, `NEXT_ROUND`, `OPEN_SHOP`,
`SHOP_BUY_RELIC`, `SHOP_BUY_TILE`, `SHOP_SELL_RELIC`, `SHOP_REROLL`, `LEAVE_SHOP`, `DEV`; `START_DUEL` e
`NEXT_MATCH` ficam como atalhos para testes) para um reducer puro. Toda
aleatoriedade (o baralho embaralhado e a `seed` dos sorteios) entra pela ação, então o motor é
determinístico e testável. O reducer emite eventos (`tilePlaced`, `bonus5`,
`heartLost`, `roundEnd`...) e o `App` transforma cada um em som, tremida e texto flutuante.

### Mesa em "U" e câmera dinâmica

O feltro é um "mundo" de 10 unidades de largura (unidade = lado curto da pedra), com
altura congelada no começo de cada rodada. A primeira pedra fica no centro da linha de baixo.
Cada ponta segue a serpentina da sua metade, sempre dentro do feltro:

1. base: do centro para a borda;
2. lateral: sobe pela margem;
3. topo: dobra 90° para dentro, em direção ao centro, deitando as pedras de novo;
4. se ainda precisar: desce pelo meio e fecha a volta por dentro.

- **Posições estáticas (sem teletransporte):** cada pedra é posicionada na ordem em que foi
  jogada (`seq`) e só olha para as que já estão na mesa. Uma pedra nova nunca move, gira nem
  deforma as antigas, e a altura do mundo não muda no meio da rodada (por exemplo, se a dica
  quebrar em duas linhas). Os testes conferem isso a cada jogada em centenas de duelos simulados.
- **Corrente enorme:** depois de lotar a própria metade, usa o espaço livre do resto do feltro.
  Em ~1% das rodadas (16+ pedras numa ponta) uma pedra vai para o espaço livre mais próximo.
- **Buchas sempre atravessadas:** em pé quando a linha corre na horizontal, deitadas nas
  pernas do U, centradas no encaixe. A regra fica em `tileOrientationOnBoard` e a `DominoTile`
  inverte os eixos quando `onBoard` e `isDouble`. Em corredor apertado a bucha encosta na
  ponta deslocada meia unidade.
- **Câmera:** sem zoom manual. Enquadra todas as pedras e as vagas, com zoom máximo no começo
  da rodada (pedra 96×48 px) e afastando conforme a trilha cresce.
- **Pontas abertas:** `scale-110 z-10`, borda pulsante e badge com o número livre em tamanho
  fixo na tela. Com uma pedra selecionada, a vaga vira alvo de toque.
- **Peso da bucha:** ao entrar, a bucha salta, bate e assenta (`tile-slam`), com anel de impacto,
  sombra projetada, pancada dupla de madeira mais grave e a mesa treme.

### Mão em leque

A mão flutua sobre o feltro, sem suporte de madeira. As pedras formam um arco
(`components/handFan.js`): com 7 pedras, 0°, ±8°, ±14°, ±20°, descendo nas pontas, cada uma
com sombra projetada (`drop-shadow(0 10px 8px rgba(0,0,0,.45))`) e uma flutuação lenta. A
pedra tocada sobe para fora do leque (24px, `scale(1.1)`), fica reta e ganha contorno; bucha
selecionada pulsa em amarelo. Mãos grandes encolhem e aproximam as pedras sem sair da tela.

### Som de boteco

Tudo sintetizado em `audioSynth.js`, sem arquivos de áudio:

- **Trilha:** bossa lenta (76 BPM) em loop de 8 compassos — Dm9, G13, Cmaj9, A7♭13 e uma volta
  com Em7–A7. Contrabaixo em senoide no padrão de bossa, acordes em triângulo suave, melodia
  de vibrafone (senoide com tremolo) e escovinha quase inaudível. Agendador com folga de 250 ms,
  que não despeja notas atrasadas quando o app volta do segundo plano.
- **Ambiência:** murmúrio de bar em ruído rosa filtrado (faixa da voz, abafado), grave da sala,
  zumbido da lâmpada e um "tink" de copo ou garrafa a cada 15–25 s, em posição aleatória no estéreo.
- **Controles:** no topo da tela, botão de som (liga/desliga tudo, lembrado entre sessões) ao lado
  do menu. O menu pausa o duelo (o Tio Zé espera) e permite sair para a tela inicial.

### Tio Zé

Joga sempre que pode (nunca compra nem passa podendo jogar). Sem jogada, compra seguindo a escada
(só gasta coração com 3+). Prefere bater (Cruzada > Bucha > normal), descarregar buchas pesadas,
fechar múltiplos de 5, deixar pontas que ele consegue seguir e pontas que você parece não ter
(ele lembra dos seus passes e compras). Se você passou e a menor soma está com ele, ele passa
de propósito para trancar. Ele não vê a sua mão.
