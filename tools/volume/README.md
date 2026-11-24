# Personagens em volume (prévia)

O Tio Zé refeito: um modelo 3D por distância com sinal (`model.mjs`: a cabeça, igual de frente e
de perfil; `front.mjs`: o busto atrás da mesa; `side.mjs`: o corpo inteiro sentado, em camadas),
iluminado e passado para pixel art (`r3d.mjs`: tons por material, limpeza, contornos), com os
detalhes à mão por cima (`decals.mjs`, `sdecals.mjs`).

    node frun.mjs <saida> 3 <humor>          # frente: idle, blink, talk, thinking, smug, hurt
    node srun.mjs <saida> <camada> 3 <humor> # perfil: upper, legs, chair
    node pack.mjs ../../src/components/art/tioZeHD.js nome=arquivo.rgba:w:h ...
