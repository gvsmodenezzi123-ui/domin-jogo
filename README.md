# Buxaria — Patch 0.1.2

Duelo 1x1 tático de **dominó roguelike** contra o Tio Zé, em dark pixel art
(clima Inscryption / Buckshot Roulette). Feito como PWA para tela vertical de iPhone.

## Rodando

```bash
npm install
npm run dev       # servidor local (abre na rede, dá pra testar no celular)
npm test          # testes do motor, da IA e do layout (inclui 300 duelos simulados)
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

## Regras do Patch 0.1

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

## Arquitetura

```
src/
  engine/
    dominoLogic.js    regras puras: pedras, embaralhar, pontas, encaixe com rotação
                      automática, tranca, batida/dano, abertura, escada de compra
    boardLayout.js    grade da mesa em "U" (caminhos de cada ponta, sem zoom)
    gameReducer.js    estado do duelo e transições; emite eventos com `seq`
    gameFeedback.js   eventos → banner, falas e humor do Tio Zé, dica do jogador
    audioSynth.js     sintetizador Web Audio puro: efeitos, trilha de bossa e ambiência de bar
  ai/
    tioZeAI.js        decisão do Tio Zé + delay reflexivo de 700ms + falas
  components/
    DominoTile.jsx    pedra de osso envelhecido, chanfro 3D, pips em CSS Grid
    TableBoard.jsx    feltro verde-musgo, vinheta da lâmpada, caminho em "U"
    OpponentHeader.jsx painel do Tio Zé (avatar pixel art, corações, pedras viradas, dorme)
    PlayerRack.jsx    mão em leque flutuante, seleção de pedras e botões de ação
    handFan.js        geometria do leque (posição, inclinação e descida de cada pedra)
    PauseMenu.jsx     pausa: continuar, som, sair do duelo
    RoundOverlay.jsx  resultado da rodada / fim do duelo
    TitleScreen.jsx   tela inicial (destrava o áudio no iOS)
    PixelSprite.jsx, PixelHeart.jsx, sprites.js   pixel art em SVG
  App.jsx             loop principal: reducer, agenda do Tio Zé, sons, orquestra a UI
  pwa.js              bloqueio de pinça/zoom e registro do service worker
public/
  manifest.json, sw.js, icons/, splash/
scripts/generate-icons.mjs   gera os PNGs (sem dependências)
```

**Fluxo de dados:** a UI despacha ações (`PLAY`, `DRAW`, `PASS`, `TIO_ZE_ACT`, `START_DUEL`,
`NEXT_ROUND`) para um reducer puro. Toda aleatoriedade (o baralho embaralhado) entra pela ação,
então o motor é determinístico e testável. O reducer emite eventos (`tilePlaced`, `bonus5`,
`heartLost`, `roundEnd`...) e o `App` transforma cada um em som, tremida e banner.

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
