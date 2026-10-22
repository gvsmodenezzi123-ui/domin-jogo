# Buxaria — Patch 0.5.5

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
  | Nas duas pontas (a pedra servia nos dois lados, ex.: 4\|2 em pontas 4 e 4) | 2 ♥ |
  | Cruzada (última pedra casa com as duas pontas) | 3 ♥ |
  | Tranca (menor soma de pontos na mão vence; empate não dá dano) | 1 ♥ |

- **Múltiplo de 5:** se a soma das duas pontas abertas fechar em múltiplo de 5, quem jogou ganha **+$3**.
- **Compra por turno:** 1ª grátis · 2ª custa $3 · 3ª custa 1 coração (nunca mata: precisa ter 2+). Máximo 3.
- **Passar a vez** (Patch 0.5.4):
  - nada encaixa e o dorme tem pedra: o botão fica apagado; a **1ª compra (grátis) é obrigatória**;
  - tem jogada e ainda não comprou: **PASSAR A VEZ ($3)** (sem saldo: **SALDO INSUFICIENTE ($3)**);
  - já comprou no turno (ou o dorme secou sem jogada): passa **de graça**;
  - comprou e não dá para comprar de novo (3 compras, dorme seco ou sem como pagar) e nada encaixa:
    **passe automático** com o aviso "SEM JOGADAS DISPONÍVEIS! TURNO PASSADO!".
- Dois passes seguidos (um de cada) = **tranca na hora**.
- Tranca também acontece sozinha quando a mesa fecha (pontas iguais e as 7 pedras do número na mesa)
  ou quando o Dorme secou e ninguém encaixa.

## Patch 0.7.0: conquistas, 20 talismãs novos e o dorme no canto da mesa

### Conquistas (`engine/achievements.js`)

Dez metas. Cada uma libera um talismã para o sorteio da Loja do Valtinho e do Mercado Negro.
Até a meta sair, esse talismã não aparece em lugar nenhum.

| Conquista | Meta | Libera |
| --- | --- | --- |
| Freguês do Zé | Derrote o Tio Zé 2 vezes (somando as runs) | Moeda Furada |
| Boca de Balcão | Compre ao menos 1 item na Loja em 3 nós diferentes na mesma run | Tampa de Garrafa Amassada |
| No Limite do Sangue | Compre a 3ª pedra do dorme (pagando coração) e jogue ela antes da vez do rival | Fósforo Riscado |
| Malandragem de Truco | Feche 3 múltiplos de 5 numa única partida | Baralho de Truco Marcado |
| Cirurgia de Tranca | Vença uma tranca com só 1 pedra na mão | Abridor de Lata Cego |
| Colecionador de Esquina | Equipe 6 talismãs comuns básicos diferentes ao longo das runs | Nota de 3 Reais |
| Milagre de Boteco | Bata a rodada com uma bucha tendo só 1 coração | Fita Crepe do Gambiarra |
| Rei da Sinuca Branca | Vença a campanha na Maleta Branca 2 vezes | Balança de Açougue Descalibrada |
| Mesa Limpa | Derrote o Seu Arlindo ou o Beto Cigano sem tomar dano na partida | Cálice de Sangue de Galo |
| Mão Fechada | Vença uma partida inteira sem comprar do dorme | Dado de Osso Humano |

- O App passa os eventos novos do reducer para `trackAchievements(events, state)`.
  `checkAchievement(id, context)` confere cada meta na hora em que ela pode acontecer.
- Ao sair uma conquista, o jogo grava `achievement_<id>` e `relic_unlocked_<relicId>` no
  localStorage, dispara `buxaria-achievement` na `window` e o talismã já entra no sorteio
  (`UNLOCK_RELICS`).
- Os contadores também ficam no aparelho: vitórias sobre o Tio Zé, campanhas na Branca,
  comuns equipados e lojas da run. "Apagar tudo" não mexe nas conquistas.
- Para a Mesa Limpa, pagar a 3ª compra com coração não conta como dano. Para a Mão Fechada,
  compra forçada (como a da Falsa Partida do Comendador) não conta como compra.
- Quem já tinha zerado a Branca antes do 0.7.0 começa com 1 campanha contada.
- O painel DEV tem LIBERAR A PRÓXIMA e ZERAR CONQUISTAS.

### Aviso de conquista (`AchievementToast.jsx`)

- Um cartão desce no alto da tela, em qualquer tela (menu, mapa, lojas, no meio da
  partida), por cima até do corte de cena.
- O cartão tem moldura dourada, um troféu 40x40 piscando com brilho e
  "CONQUISTA DESBLOQUEADA!", mais o nome da conquista e "Talismã liberado: …".
- Ele chega com uma fanfarra metálica (`sound.playAchievement()`), fica 3,8 s e sobe de
  volta. Vários avisos entram em fila.

### Os 20 talismãs novos (`data/relics.js`, arte em `art/RelicArt070.jsx`)

| Talismã | Raridade | Efeito |
| --- | --- | --- |
| Palito de Dente Usado | Comum | 1ª pedra de soma ímpar da rodada: +$2 |
| Moeda Furada 🔒 | Comum | Passe estratégico custa $1 |
| Pano de Chão Úmido | Comum | Bucha numa ponta: o rival não usa essa ponta na vez dele |
| Tampa de Garrafa Amassada 🔒 | Comum | Rodada sem bucha na mão: +$4 |
| Rádio de Pilha Chiando | Comum | Pontas com soma par: 15% de o rival comprar por engano |
| Fósforo Riscado 🔒 | Comum | 1ª compra da rodada mostra a próxima pedra do dorme |
| Óculos Fundo de Garrafa | Raro | Na vez do rival, a pedra que ele vai jogar aparece virada antes de sair |
| Canivete Suíço Enferrujado | Raro | 1x por partida: 1 pedra da mão vira a bucha do número maior (botão CANIVETE) |
| Baralho de Truco Marcado 🔒 | Raro | Múltiplo de 5 com uma ponta 4: −1♥ no rival |
| Abridor de Lata Cego 🔒 | Raro | Batida com o rival ainda com 2+ pedras: +1 de dano |
| Cinzeiro Cheio de Bitucas | Raro | Rival passou 2 vezes seguidas: 1 pedra dele fica à mostra |
| Nota de 3 Reais 🔒 | Raro | 1º reembaralhar de cada visita à Loja é grátis |
| Fita Crepe do Gambiarra 🔒 | Lendário | 1x por partida: joga de novo se a próxima pedra encaixa na ponta que abriu |
| Espelho de Banheiro Trincado | Lendário | Pedra de grife do rival: a sua comum mais pesada copia o material |
| Balança de Açougue Descalibrada 🔒 | Lendário | Na tranca, sua soma tem −10 |
| Relógio de Parede do Bar | Lendário | Mesa com 4, 8, 12… pedras: ponta direita aceita qualquer número na sua vez |
| Cálice de Sangue de Galo 🔒 | Necrótico | Batida de bucha dá 5 de dano; cada compra custa 1♥ (nunca o último) |
| Dedo de Cadáver Amarrado | Necrótico | Rival compra até achar pedra que encaixa; seus talismãs vendem por $0 |
| Testamento Rasgado | Necrótico | Golpe fatal recomeça a rodada do zero; depois queima ele e mais 1 talismã seu |
| Dado de Osso Humano 🔒 | Necrótico | Toda pedra sua encaixa em ponta 6; passar a vez custa 1♥ (nunca o último) |

🔒 = sai só depois da conquista.

### Livro de Boteco (`CollectionBook.jsx`)

- Os talismãs de conquista ainda trancados aparecem como silhueta escura com um "?" de
  pixel e o nome BLOQUEADO.
- No lugar do efeito, uma caixa pontilhada âmbar diz "[?] COMO DESBLOQUEAR: …". Nas metas
  que somam, ela mostra o progresso (Tio Zé 1/2, comuns 3/6, campanhas 1/2).
- Liberados, eles aparecem inteiros: sprite 40x40, nome, raridade, efeito e o selo
  DESBLOQUEADO com o nome da conquista.
- O topo da aba mostra CONQUISTAS N/10.

### Dorme no canto da mesa (`TableBoard.jsx`)

- A pilha de pedras viradas e quantas ainda restam saíram do cabeçalho do rival. Agora ficam
  grandes, no canto de cima à direita do feltro.
- Com 3 ou menos o número fica âmbar; vazio, vermelho com VAZIO. Cada compra dá um pulinho
  no número.

## Patch 0.6.3: maletas de dominó (Modo Normal e Modo Difícil)

### Mesa das maletas (`CaseSelect.jsx`, `art/CaseArt.jsx`, `TitleScreen.jsx`)

O NOVO JOGO abre uma mesa de feltro escuro sob a lâmpada, com duas maletas em pixel art 48x48:

- **Maleta Branca** (modo clássico): estojo de madeira marfim com fechos dourados e pedras de
  osso. Sempre liberada; começa a run no modo normal.
- **Maleta Preta** (modo difícil): couro preto, cantoneiras de metal escovado e pedras de ônix
  com pips brancos.
  - Trancada: fica presa por corrente e cadeado. Tocar avisa
    "TRANCADO! DERROTE O COMENDADOR MOREIRA NO MODO NORMAL PARA DESBLOQUEAR.".
  - Liberada: na primeira vez o cadeado abre e as correntes caem; depois ela fica aberta, com
    uma aura roxa.
- O NOVO JOGO no fim de uma run volta para esta mesa.

### Desbloqueio (`HardUnlockModal.jsx`, `engine/progress.js`)

- Zerar a campanha normal com a Maleta Preta ainda trancada abre, antes do final, uma lousa:
  "CAMPANHA NORMAL CONCLUÍDA! VOCÊ QUEBROU A BANCA DO COMENDADOR!".
- A Maleta Preta destranca na tela, com o som seco da corrente, e aparece
  "NOVO MODO DESBLOQUEADO: DOMINÓ PRETO (MODO DIFÍCIL)".
- A chave `buxaria_hard_mode_unlocked = true` vai para o localStorage na hora.
  "Apagar tudo" nas Opções não tira o desbloqueio.
- O painel DEV tem LIBERAR / TRANCAR A MALETA PRETA, para testar.

### Dominó Preto (`DominoTile.jsx`, `tileSkin.js`)

Na Maleta Preta as pedras comuns da partida (sua mão, a mesa e as do rival) ficam em ébano
fosco (`#1c1917`), com a divisória grafite e os pips brancos. As pedras de grife não mudam:
Ouro, Rubi, Cristal, Chumbo e Fantasma continuam com o material delas.

### Calibragem do Modo Difícil (`data/difficulty.js`, `data/rivals.js` → `HARD_LOADOUTS`)

| | Normal | Difícil |
| --- | --- | --- |
| Você | 5♥, $5 | 4♥ (teto 4), $3 |
| Região 1 | só pedras comuns, IA intuitiva | 1 pedra de grife + 1 talismã, IA calculista |
| Região 2 | 1–2 grifes, até 2 talismãs | 2 grifes, até 2 talismãs, contas precisas de tranca e de 5 |
| Região 3 | até 3 grifes, 2 talismãs | 3 grifes (Rubi, Fantasma) + 2 talismãs perigosos, IA mais agressiva |
| Seu Arlindo | 5♥ | 6♥, 4 buchas de Chumbo |
| Beto Cigano | 6♥, taxa de $2 | 7♥, taxa de $3, 2 Ouros e 1 Rubi |
| Comendador | 7♥, Dedal + Carteira | 8♥, Tranca Cadavérica + Falsa Partida, imune à 1ª tranca |

Prêmio das mesas, loja, Mercado Negro e regras do dominó são iguais nos dois modos.
O save guarda a maleta da run.

### Correção: balão de fala do rival (`RivalSpeech.jsx`)

Desde o 0.5.5 o balão do rival não sumia: ficava na mesa até a próxima fala e podia cobrir
uma ponta. A regra de saída estava numa camada de CSS que perdia para a de entrada. Agora:

- ele some sozinho uns 2 segundos depois de terminar a frase;
- ele some na hora quando você escolhe uma pedra, para as pontas ficarem à vista.

## Patch 0.6.2: 15 rivais por run, mapa limpo e "Nas duas pontas!"

- **Elenco sorteado** (`engine/campaignMap.js` → `runCast`):
  - cada run escala 15 dos 18: em cada região o chefe é fixo e 4 dos outros 5 são sorteados;
  - quem fica de fora muda de run para run;
  - entre os 4, o de menos corações abre a região.
- **Nada repetido por região:** cada rival, a Loja do Valtinho, o Mercado Negro e o Seu Tião
  aparecem uma vez só. Os andares 2 a 5 têm 6 nós (3 mesas + os 3 desvios) em 1 a 3 faixas.
  Todo caminho tem de 1 a 3 mesas no meio, e sempre há uma bifurcação entre mesa e desvio.
  O save foi para a versão 3: saves da 0.6.1 não continuam.
- **Mapa:** nós que você ainda não alcança ficam levemente apagados; os caminhos abertos pulsam.
  O rival de cada mesa só aparece quando o caminho até ela abre (ou depois de vencido); até lá a
  polaroid mostra "?", também na região em que você está (o chefe aparece só em silhueta).
- **Painel DEV:** a seção ENTRAR DIRETO abre a loja, o Mercado Negro ou o Seu Tião da região
  atual, até no meio de uma mesa.
- **Mesa:** o som e o menu saíram de cima da mão do rival. Agora ficam na fileira dos seus
  talismãs, à direita.
- **Nova batida "Nas duas pontas!"** (`classifyBatida` → `duasPontas`):
  - bater com uma pedra que servia nos dois lados, sem ser Cruzada
    (ex.: 4|2 com as pontas 4 e 4), arranca 2 corações;
  - um balão rápido estoura no alto do feltro, creme quando é sua e vermelho quando é do rival;
  - a Cruzada (3|5 em pontas 3 e 5) continua valendo 3.

## Patch 0.6.1: campanha em teia, Mercado Negro e Seu Tião

A campanha deixou de ser uma trilha fixa de "luta → loja → próximo". Cada run sorteia, pela
semente, uma **teia de caminhos** no estilo Slay the Spire / FTL, e os 18 rivais estão nela.

### Teia procedural (`engine/campaignMap.js`, `data/campaign.js`, `CampaignMap.jsx`)

- 3 regiões × 6 andares, de baixo para cima:
  - **andar 1**: um rival de entrada (Tio Zé, Marcão do Guincho, Carlinhos Mão Leve);
  - **andares 2 a 5**: 2 ou 3 caminhos (esquerda, centro, direita) que se cruzam só entre vizinhos.
    Eles misturam **COMBATE** (um dos 4 rivais comuns da região), **LOJA DO VALTINHO**,
    **MERCADO NEGRO** e o **SEU TIÃO DAS MOEDAS**;
  - **andar 6**: todos os caminhos convergem no chefe (Seu Arlindo, Beto Cigano, Comendador Moreira).
- Escalação por região:
  - R1: Tio Zé · Tonho do Gás, Baiano da Sinuca, Valdir Borracheiro, Dona Neide · Seu Arlindo;
  - R2: Marcão do Guincho · Serginho 22, Cida da Marmita, Paulinho Pente Fino, Tião Navalha · Beto Cigano;
  - R3: Carlinhos Mão Leve · Bigode de Ouro, Madama Sofia, Doutor Fausto, Alemão do Ferro Velho · Comendador Moreira.
- Garantias de cada sorteio (se uma falha, sorteia de novo com a mesma semente):
  - os 4 comuns de cada região estão em algum nó, então os 18 estão no mapa. Quem fica fora do
    caminho que você escolhe não é enfrentado nesta run;
  - todo caminho tem 2 ou 3 mesas nos andares do meio e nunca o mesmo rival duas vezes;
  - toda região tem loja, mercado e Seu Tião, e nenhum caminho passa por dois especiais iguais seguidos;
  - pelo menos duas bifurcações põem lado a lado uma mesa e um desvio sem luta.
- A loja virou um caminho opcional: vencer a mesa volta direto ao mapa.
- O mapa mostra a teia inteira:
  - os caminhos abertos pulsam e o que você percorreu fica riscado a giz;
  - o que ficou para trás apaga;
  - regiões futuras mostram só o tipo do nó (e a silhueta do chefe).
- O save (v2) guarda só a semente, o nó atual e o caminho; a teia é refeita dela.

### Mercado Negro (`BlackMarketModal.jsx`, `engine/blackMarket.js`)

O beco do **Corvo da Madrugada** (encapuzado, olhos vermelhos, 48x48) vende 3 dos 5 talismãs da
nova raridade **NECRÓTICA** ($18 a $26). Eles nunca aparecem na loja do Valtinho:

| Talismã | Efeito |
| --- | --- |
| Pacto do Coveiro | +2 de dano em toda batida sua; a 3ª compra do turno custa 2 corações |
| Osso Ensanguentado | cada bucha sua que entra na mesa arranca $3 do rival |
| Olho da Morte | rival em 1♥: qualquer pedra com 0 ou 6 que você jogar acaba a partida |
| Tranca Cadavérica | rodada em tranca custa 3♥ a quem perder a soma (vale para os dois) |
| Falsa Partida | 1x por partida, o golpe fatal deixa você com 1♥ e o rival compra 2 |

### Seu Tião das Moedas (`CoinEventModal.jsx`)

O velho no engradado de cerveja dá uma gorjeta de **$1 a $12**, fixa pela semente:

- cada dólar é uma moeda voando para o contador;
- cada moeda toca um "tim" metálico um semitom acima do anterior;
- a contagem fecha com o tilintar do caixa.

### IA por região (`data/rivals.js` → `AI_TIERS`, `ai/tioZeAI.js`)

- **R1, intuitiva**: baralho 100% osso. Cada um joga no instinto do próprio estilo.
- **R2, calculista**: 1 ou 2 pedras de grife e até 2 talismãs passivos. Conta uma jogada à frente
  para fechar múltiplo de 5.
- **R3 e chefes, agressiva**: até 3 pedras de grife (com Rubi e Fantasma) e 2 talismãs fortes.
  Arma a batida e solta Rubi, Chumbo e Fantasma quando você está sem a ponta. Ninguém espia a sua mão.

### Corte de cena (`ScreenTransition.jsx`)

Uma camada preta global (`.screen-transition-overlay`, sem toque) faz o corte em:

- escolher nó no mapa;
- voltar ao mapa depois da vitória;
- entrar e sair da loja, do beco e do Seu Tião;
- novo jogo, continuar e menu.

Ela escurece em 350 ms, a cena troca por baixo e ela clareia em mais 350 ms.

## Patch 0.5.5: menu limpo, balões inteiros, botões de placa e a Loja como cena

### Tela inicial (`TitleScreen.jsx`, `BuxariaLogo.jsx`)
- **Logo BUXARIA em SVG vetorial:** letras lapidadas (cantos em 45°) numa grade 7×10, extrusão 3D
  cor de sangue seco, contorno preto, face de osso, chanfro duplo (filete de osso + faixa de metal),
  rachaduras e o feixe especular cruzando a cada ~6 s. Embaixo: **"Criador: Gabriel Modenezzi"**
  (tocar abre os créditos). 3 toques no logo continuam liberando o painel DEV.
- **Ícones nos cantos** (pixel art 40×40, `art/SceneArt.jsx`): livro de couro com a pedra [2|1]
  na capa → COLEÇÕES; engrenagem de latão → OPÇÕES. Saíram os botões de texto do centro.
- **JOGAR é só a palavra:** marfim/âmbar, sombra funda; ao tocar cresce 5% e acende em dourado.
  No mesmo lugar surgem **CONTINUAR** (dourado com run salva, apagado sem), **NOVO JOGO** e
  **VOLTAR**, também só em texto. Com run salva, o NOVO JOGO confirma ali mesmo.

### Balão de fala (`RivalSpeech.jsx`)
- A frase nunca mais é cortada: o balão se ajusta e quebra linha. O tamanho final é reservado
  desde o início, então ele não pula enquanto o texto é digitado com a voz do rival.
- Veludo escuro (zinc-900/95), borda de 1,5 px cor de osso/âmbar, vinheta por dentro e cauda em
  degraus de pixel apontando para o retrato. Na mesa ele aparece logo abaixo do cabeçalho.

### Botões e hotbar
- **Todos os `.btn-pixel` viraram placas de metal entalhadas:** chanfro claro de 2 px em cima,
  base escura de 4 px, letra em baixo-relevo e rebites; ao tocar afundam 2 px na hora com o
  **clique mecânico** (`sound.playClick`, tocado pelo App em qualquer placa). Tons:
  **JOGAR/ABRIR/SENTAR/PRÓXIMA RODADA** verde-oliva aceso, **PASSAR** ferrugem/vinho,
  **ENTRAR NA LOJA** dourado fosco pulsando, o resto em ferro escovado ou latão.
- **Talismãs soltos na mesa** (`Hotbar` com `bare`): sem moldura nem vagas vazias, cada um flutua
  com a própria sombra no feltro (seus e os do rival). O toque longo continua abrindo o balão.

### Loja Clandestina (`Shop.jsx`)
- Cena de balcão: **toldo listrado** vinho/bege com barra denteada, **lâmpada** pendurada com o cone
  de luz, prateleira de garrafas e o **Valtinho do Bar** (48×48: bigodão, palito no canto da boca,
  regata e avental manchado), respirando e piscando, com balão e voz própria. Ele recebe
  ("Só mercadoria quente...", "Vai levar ou vai ficar só olhando?", "O Tio Zé mandou te cobrar o
  dobro...") e reage a compra, venda, reembaralhar, falta de dinheiro e bolsa cheia.
- **Balcão de madeira** com marcas de copo: os 3 talismãs no **veludo vermelho** (sprite 48 e sombra)
  com **etiqueta de papel pardo** (raridade, nome, preço na moeda dourada); as 2 **pedras de grife**
  inclinadas no **expositor** escuro, com o material animado e **fita crepe** ("Substitui [X|Y] comum"
  e o preço). Tocar compra; segurar mostra o efeito.
- **Bolsa de Talismãs:** 4 nichos entalhados na frente do balcão; tocar abre o recibo de venda a 50%.
- **REEMBARALHAR** é um copo de dados de couro virado (balança, faz o barulho de dados chacoalhando
  e mostra o preço: $3, $5, $8, $12). **VOLTAR AO MAPA** é uma placa de madeira com pregos, que mostra
  o próximo rival.

## Patch 0.5.4: passe com custo, áudio novo e iPhone sem lag

### Regra do PASSAR A VEZ (`engine/dominoLogic.js` → `getPassAvailability`, `engine/powers.js`, `engine/gameReducer.js`)
- O passe deixou de ser de graça a qualquer hora. A regra fica no motor, então vale para o botão, para o
  painel DEV e para as simulações:
  - sem jogada e com dorme: **comprar antes** (a 1ª é grátis); o botão fica apagado;
  - com jogada e sem compra no turno: **$3** pelo passe estratégico; sem saldo, **SALDO INSUFICIENTE ($3)**;
  - depois de comprar ao menos 1: passa de graça.
- **Passe automático:** comprou, nada encaixa e não dá para comprar de novo → o reducer trava a mesa
  (`pending: forcedPass`, evento `noMoves`), a faixa vermelha **SEM JOGADAS DISPONÍVEIS! TURNO PASSADO!**
  aparece no centro do feltro (`components/NoMovesBanner.jsx`), o sintetizador toca o "uó-uó-uóóó"
  descendente e, 1,6 s depois, a vez vai sozinha para o rival. Se o Relógio Quebrado estiver pronto, o
  passe não é automático (desfazer ainda é uma saída).
- Testes em `engine/__tests__/passRule.test.js`.

### Direção de áudio (`engine/audioSynth.js`)
- **Saída quente:** tudo passa por um passa-baixa em **2800 Hz** com leve ressonância (vinil).
- **Ducking:** pedra batendo, dano de coração e cada sílaba do rival abaixam a música **30%** por 200 ms
  (rampa exponencial) e ela volta suave.
- **Trilha adaptativa a 128 BPM** (sequenciador com antecedência, sem atraso de timer):
  bossa-funk com **contrabaixo acústico** (decay natural, mono como um instrumento de verdade) e
  **piano elétrico** em senoides com tremolo. Boteco em ii-V-I, Clube da Sinuca no funk, Submundo/chefes
  em menor. **Camada de tensão:** com 1 ou 2 corações de alguém, entram hi-hats em semicolcheias, o filtro
  abre para **4500 Hz** e o andamento acelera 8%.
- **Vitória da partida:** a trilha sai, **fanfarra maior** limpa (metais + prato) e só então entra a
  trilha suave da **Loja Clandestina** (`lojaLounge`, 96 BPM). Rodada vencida: "tã-dã" maior curto.
- **Pedra na mesa:** clique de osso/marfim (800 Hz, 15 ms) + baque oco da madeira (120 Hz, 80 ms), pitch ±5%.
  **Grife:** ouro tilinta cristalino, rubi solta um sub-grave quente, cristal toca um sino com eco.
- **iOS:** no máximo **6 vozes** soando (cada oscilador ou ruído conta; música cede antes dos efeitos,
  com fade de 15 ms) e toda nota termina com `stop()` + `disconnect()` de todos os nós.
- Testes em `engine/__tests__/audioEngine.test.js` (Web Audio simulado).

### Desempenho no Safari do iPhone
- **Luz nas pedras** (`components/tileLighting.js`): antes media todas as pedras e reescrevia variáveis
  CSS ~40 vezes por segundo (layout + repintura da mão e da mesa inteiras). Agora: ~15 atualizações por
  segundo, posições medidas a cada 300 ms e valores em degraus, então a maioria dos quadros não escreve nada.
- **Lâmpada e facho** animam só `transform`/`opacity` (a falha do sprite saiu de `filter` para opacidade,
  o tranco da lâmpada usa `transform`, sem `mix-blend-mode` nas camadas que se mexem).
- **Feltro isolado:** `contain: layout paint` em `.felt-table`.
- **Reflexo e material** (`.shimmer-active`, ouro, rubi, cristal, fantasma) só animam na pedra selecionada e
  nas duas pontas abertas; as em repouso ficam em gradiente estático (`DominoTile` `still`). Flutuação do
  leque, pulso das pontas, brasas do rubi e arco-íris do cristal passaram para `transform`/`opacity`.
- **React.memo** na mesa, no leque (e em cada pedra dele), nos botões, no cabeçalho do rival, na hotbar e
  nas moedas; `useStableHandler`/`useStableValue` (`components/useStable.js`) mantêm as props estáveis.
  Medido no Chromium com a mesa parada: ~65% menos trabalho na thread principal que o 0.5.1.

## Patch 0.5.1: luz viva e pedras deslizando

- **Lâmpada pendurada de verdade** (`components/LampRig.jsx`): balança como pêndulo (±7°, pivô no fio)
  e o facho + a mancha de luz ficam presos nela, varrendo o feltro e clareando as pedras por onde passam.
  Na mesa e no menu.
- **A lâmpada falha:** pisca duplo, zumbe e dá um apagão de ~¼ s; a mesa (ou o salão do menu) escurece junto.
  Cada pedra batida dá um tranco na lâmpada (`components/lampKick.js`).
- **A luz bate nas pedras** (`components/tileLighting.js`): o brilho fica no lado virado para a lâmpada,
  a sombra cai para o lado oposto e as duas andam quando ela balança; longe da mancha de luz a pedra fica
  mais escura, e no apagão as da mesa e as da sua mão escurecem juntas.
- **Pedra deslizando até a ponta** (`components/tileFlight.js`): levanta da mão, desliza em curva girando
  para a orientação da mesa, com rastro e sombra no pano, e cai com SLAM + tremida. A do rival sai da mão
  dele no topo virando de costas para a face e fica 800 ms em destaque.
- **OPÇÕES → ANIMAÇÕES: COMPLETAS/REDUZIDAS.** O "Reduzir Movimento" do iPhone não desliga mais as
  animações sozinho (era o que deixava a mesa parada); quem quiser menos movimento escolhe aqui.

## Patch 0.5.0: arte 40x40 em tudo, física das jogadas e telas novas

- **Arte 40x40 em 100% do jogo** (`components/ArtSprites.jsx`, SVG com `crispEdges`, sem imagens):
  os 18 rivais (4 humores + boca falando cada), os 15 talismãs (volume 3D, sombra no chão, brilho)
  e os ícones de interface (moeda, coração inteiro/quebrado, som, menu, lâmpada, olho).
  `art` em `data/rivals.js` e `data/relics.js` aponta para cada desenho (`components/artRegistry.js`).
- **Cabeçalho do rival travado** (`RivalBench.jsx`): caixa de 96px, bloco fixo de 160px à esquerda
  (retrato, status, nome, corações, moedas, dorme, talismãs), fala em posição absoluta numa linha e
  a mão presa à direita. Cada pedra do rival tem vaga fixa (`RivalHand.jsx`): jogar uma não mexe
  nas outras.
- **Física das jogadas** (`components/tileFlight.js`): a pedra sai da sua mão (ou do topo, do rival),
  desliza 360–400 ms até a ponta girando para a orientação da mesa (bucha chega atravessada) e
  assenta com SLAM de osso na madeira e tremida de 150 ms. A do rival fica 800 ms em destaque.
- **Luz** (`index.css`): `.swinging-lamp` e `.dynamic-light-cone` (balanço e flicker de bar),
  `.shimmer-active` (feixe especular). Pedras de grife: ouro com feixe cruzando, cristal holográfico
  (`holoPrismCycle`), rubi batendo (`rubyHeartbeat`) com pips em brasa, fantasma flutuando
  (`ghostEthereal`), chumbo fosco com rachadura em relevo.
- **Telas:** logo com relevo 3D duplo e botões que afundam 3px; mapa com polaroids, trilha a giz,
  marcas de copo e cinzas; loja em 4 quadrantes sem rolagem; Livro de Boteco encadernado em couro
  com abas de fita; vitória numa lousa de bar com o rival nocauteado e as moedas contando.

## Patch 0.5: arte em alta densidade e cards com relevo

- **Sprites 40x40** em `components/HighDensitySprites.jsx` (SVG com `crispEdges`, sombreamento em
  camadas): o **Tio Zé** (quepe, rugas, barba por fazer, cigarro com brasa), a **Caneca de Chopp**
  trincada, o **Dado Viciado** isométrico e o **Olho de Vidro**. O Tio Zé tem os 4 humores do jogo,
  mexe a boca a cada letra da fala e solta fumaça da brasa (no "ferido" o cigarro cai).
- `art` em `data/rivals.js` e `data/relics.js` liga cada um ao desenho (`components/artRegistry.js`);
  quem ainda não tem desenho novo continua no pixel art antigo (`RelicIcon.jsx`, `RivalAvatar.jsx`).
- **RetroCard** (`components/RetroCard.jsx`): card com borda na cor da raridade e chanfro embaixo,
  que afunda ao apertar. Usado nas cartas da loja e no Livro de Boteco.
- **Mesa:** vinheta mais profunda e moldura chanfrada escura por cima do feltro (mogno no Comendador).

## Patch 0.4.2: iluminação viva

- **Lâmpada balançando** (`.animate-lamp-swing`, 7 s) na mesa e no menu, presa pelo fio no teto.
- **Cone de luz** sobre o feltro (`.animate-light-cone`): balança junto com a lâmpada e pisca de
  leve como luz de bar antigo, com uma falha rápida de energia de vez em quando.
- **Reflexo nas pedras** (`.tile-shimmer-effect`): um feixe de luz passa pelas pedras da sua mão
  (em onda pelo leque) e pelas duas pontas abertas da mesa. A camada é recortada no formato da
  pedra, então os anéis de seleção não são cortados.
- **Fumaça do Tio Zé:** três baforadas defasadas sobem da brasa do cigarro (some quando ele é ferido
  e o cigarro cai). `smoke` em `rivals.js` diz de onde sai.
- Tudo desliga com "Reduzir movimento" do iPhone.

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
    audioSynth.js     motor de som Web Audio: vozes por rival, trilhas por região, efeitos da mesa
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
    RivalSpeech.jsx   balão da fala, letra a letra com a voz do rival
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

### Som de boteco e vozes

Tudo sintetizado em `audioSynth.js` (`sound`, motor `SoundEngine`), sem arquivos de áudio:

- **Vozes "animalese":** cada rival fala letra a letra no balão, com um blip por letra no tom, na
  onda e no ritmo dele (`VOICE_PROFILES`: o Tio Zé é grave e rouco, a Dona Neide aguda e ligeira,
  o Marcão pesado em dente de serra, o Serginho atropela, o Comendador fala devagar...).
  Espaço e pontuação ficam em silêncio. Com o som desligado o texto continua aparecendo.
- **Trilhas por passo:** *botecoJazz* (menu e Boteco da Esquina), *sinucaFunk* (Clube da Sinuca) e
  *bossFight* (Submundo e mesas de chefe). Baixo em triângulo e acordes em senoide.
- **Mesa:** batida de madeira oca (mais grave na bucha); a jogada do rival soma um estalo seco de
  osso (SLAM). Ouro tilinta moedas, Cristal faz sino de vidro, Rubi um baque grave, Chumbo bigorna,
  Fantasma um sopro.
- **Controles:** o botão de som no topo liga/desliga tudo (lembrado entre sessões); OPÇÕES tem
  volume de efeitos e de música. Nada toca antes do primeiro toque (exigência do iOS).

### Tio Zé

Joga sempre que pode (nunca compra nem passa podendo jogar). Sem jogada, compra seguindo a escada
(só gasta coração com 3+). Prefere bater (Cruzada > Bucha > normal), descarregar buchas pesadas,
fechar múltiplos de 5, deixar pontas que ele consegue seguir e pontas que você parece não ter
(ele lembra dos seus passes e compras). Se você passou e a menor soma está com ele, ele passa
de propósito para trancar. Ele não vê a sua mão.
