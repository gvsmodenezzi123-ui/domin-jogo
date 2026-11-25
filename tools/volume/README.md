# Personagens em volume (versão 2.46)

Cada personagem é um modelo 3D por distância com sinal, montado a partir da ficha dele
(`src/components/art/portraitSpecs.js`): a cabeça (`head.mjs`, a mesma de frente e de perfil), o
corpo e a roupa (`body.mjs`, de frente; `seat.mjs`, sentado de lado), as mãos (`hands.mjs`), os
objetos (`props.mjs`) e os emotes (`gestures.mjs`). `r3d.mjs` ilumina, passa para pixel art
(tons por material, limpeza, contornos) e os detalhes à mão vão por cima (`fdecals.mjs`,
`sdecals2.mjs`). As cores saem de `cast.mjs` (`rampsOf`).

    node tools/volume/bake.mjs src/components/art/cast tioZe neide ...   # os quadros de cada um
    FRONT_ONLY=1 node tools/volume/bake.mjs src/components/art/cast tioZe  # refaz só a frente e a subida dos braços
    node tools/volume/bakeside.mjs src/components/art/cast aceno tioZe ...  # refaz um emote sentado de lado
    node tools/volume/bakelegs.mjs src/components/art/cast neide ...        # refaz só as pernas (sentado)
    node tools/volume/bakechairs.mjs src/components/art/cast             # as duas cadeiras
    node tools/volume/fsheet.mjs frente.png 1 [chaves...]               # folha de contato de frente
    node tools/volume/ssheet.mjs lado.png 1 [chaves...]                 # folha de contato sentado

Cada personagem leva uns 4 minutos (o busto e o corpo em supersampling 2×, os emotes em 1×). Cada
emote tem os quadros do gesto e os dois do braço subindo (`gestures.mjs`: `frontRaise`, `sideRaise`).
Cada personagem fica em dois pedaços (`castio.mjs`): `<chave>.js` (o parado, os humores e os pontos
da brasa e dos olhos) e `<chave>.g.js` (os emotes), que o jogo carrega depois. O jogo lê os quadros
por `src/components/art/castHD.js`.

# Salas e HUD em volume (versão 2.47)

O mesmo encanamento, para o cenário: `cena/common.mjs` tem a câmera (alta, na perspectiva do tampo
da mesa: o chão e a mesa dividem a linha do horizonte) e a mesa em 3D que faz sombra; cada sala é
um módulo em `cena/rooms/` (a cena por distância com sinal, as luzes, as cores e os desenhos por
cima). `cena/render.mjs` ilumina, `cena/pixelpass.mjs` passa para pixel art e `cena/decals.mjs`
tem os letreiros, o neon e as juntas do chão.

    node tools/volume/cena/runroom.mjs sinuca /tmp/sinuca.png 3        # a sala inteira (1040 × 414)
    node tools/volume/cena/runroom.mjs sinuca /tmp/teste.png 1 500,0,900,200   # só um pedaço
    python3 tools/volume/cena/tomodule.py /tmp/sinuca.png src/components/art/rooms/landsinuca.js still
    python3 tools/volume/cena/tomodule.py /tmp/praia.png src/components/art/rooms/landpraia.js day
    node tools/volume/cena/daycomp.mjs landpraia /tmp/praia.png /tmp/comp.png  # a de dia com o céu
    node tools/volume/cena/ui.mjs [pasta]                               # as peças do HUD

As salas: `boteco` (landroom), `sinuca` (landsinuca), `bicho` (landbicho), `noite` (landnoite),
`calcada` (landcalcada), `praia` (landpraia) e `praca` (landpraca). Cada uma leva de 1 a 7 minutos
em supersampling 3×. A imagem é larga: a tela de referência (896 × 414) no meio e 72 px de sobra de
cada lado; o jogo corta o meio que cabe (`roomCrop`). `tomodule.py` passa o PNG para 256 cores
(conferindo o erro) e escreve o módulo; nas salas de dia (`day`) o céu e o mar ficam
transparentes, para a camada de trás de `landRooms.js` aparecer.

# O visual novo em volume (versão 2.48)

As telas do visual novo são um palco fixo de 896 × 414 visto de frente (`cena/novo/stage.mjs`):
cada fundo é uma cena em `cena/novo/` (o mapa: `mapback.mjs`), renderizada pelo
`cena/runstage.mjs`; as peças (as tábuas e os botões em 9 fatias, as molduras e os fundinhos dos
pontos, os objetos) saem do `cena/novo/kit.mjs` direto em `src/components/art/novoVolumePx.js`.

    node tools/volume/cena/runstage.mjs ./novo/mapback.mjs /tmp/map.png 3
    python3 tools/volume/cena/tomodule.py /tmp/map.png src/components/art/stages/map.js still
    node tools/volume/cena/novo/kit.mjs [pasta]

Uma cena pode exportar `FRONT` (os materiais e a faixa de linhas que o jogo põe por cima de quem
fica atrás de um balcão): o `runstage` escreve também `<saída>-front.png`.

# As lojas em volume (versão 2.49)

A Loja do Valtinho (`cena/novo/shopback.mjs`) e o Mercado Negro (`blackback.mjs`) são fundos do
palco de 896 × 414, com a faixa do balcão (`FRONT`) por cima de quem atende. O porão do Seu Tião
(`tiaoback.mjs`) é do palco deitado (`LandStage`): 1000 × 450 unidades e a sobra de 48 × 88 de cada
lado, 1096 × 626 a 1 pixel por unidade (o `LandStage` recebe a imagem pronta em `image`). As peças
novas (a tábua de cantoneira, os nichos, a almofada, as vitrines, a madeira roxa, o botão de
sangue, a correntinha, a caixa de ferramentas e a moeda) saem do `kit.mjs`.

    node tools/volume/cena/runstage.mjs ./novo/shopback.mjs /tmp/shop.png 3
    python3 tools/volume/cena/tomodule.py /tmp/shop.png src/components/art/stages/shop.js still
    python3 tools/volume/cena/tomodule.py /tmp/shop-front.png src/components/art/stages/shopFront.js day
