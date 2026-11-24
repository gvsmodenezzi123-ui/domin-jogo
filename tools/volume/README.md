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
    node tools/volume/bakechairs.mjs src/components/art/cast             # as duas cadeiras
    node tools/volume/fsheet.mjs frente.png 1 [chaves...]               # folha de contato de frente
    node tools/volume/ssheet.mjs lado.png 1 [chaves...]                 # folha de contato sentado

Cada personagem leva uns 4 minutos (o busto e o corpo em supersampling 2×, os emotes em 1×). Cada
emote tem os quadros do gesto e os dois do braço subindo (`gestures.mjs`: `frontRaise`, `sideRaise`).
Cada personagem fica em dois pedaços (`castio.mjs`): `<chave>.js` (o parado, os humores e os pontos
da brasa e dos olhos) e `<chave>.g.js` (os emotes), que o jogo carrega depois. O jogo lê os quadros
por `src/components/art/castHD.js`.
