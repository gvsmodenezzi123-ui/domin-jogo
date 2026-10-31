import { useEffect, useState } from 'react';
import { ENHANCEMENTS } from '../data/enhancedTiles.js';
import { getRarity } from '../data/rarities.js';
import { getRelic } from '../data/relics.js';
import { relicSlotsFor } from '../engine/loadout.js';
import { sound } from '../engine/audioSynth.js';
import { availableNodes, regionOfState } from '../engine/campaignMap.js';
import { haptic } from '../engine/progress.js';
import { packBuyBlock, relicBuyBlock, sellPriceFor, tileBuyBlock } from '../engine/shop.js';
import { PACKS } from '../data/packs.js';
import { PackSprite } from './art/PackArt.jsx';
import CoinCount from './CoinCount.jsx';
import DominoTile from './DominoTile.jsx';
import LampRig from './LampRig.jsx';
import RelicIcon from './RelicIcon.jsx';
import RivalSpeech from './RivalSpeech.jsx';
import { CoinGlyph } from './UiGlyphs.jsx';
import { DiceCupIcon, ValtinhoSprite } from './art/SceneArt.jsx';
import { useFitScale } from './useFitScale.js';

/** Falas do Valtinho ao abrir a loja (uma por visita) e reagindo ao que você faz. */
const GREETINGS = ['Só mercadoria quente...', 'Vai levar ou vai ficar só olhando?', 'O Tio Zé mandou te cobrar o dobro...'];
const REACTIONS = {
  relic: 'Boa escolha. Não conta pra ninguém onde comprou.',
  tile: 'Essa pedra aí é de primeira.',
  sell: 'Te dou isso aqui e olhe lá.',
  reroll: 'Deixa eu ver o que tem lá no fundo...',
  coins: 'Sem dinheiro, sem mercadoria.',
  full: 'Bolsa cheia, campeão. Vende alguma coisa antes.',
  pack: 'Veio direto da fronteira. Escolhe logo, que o fiscal passa.',
};

/** Último evento da loja desta visita (abriu, comprou, vendeu, reembaralhou). */
function lastShopEvent(events) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const ev = events[i];
    if (['shopOpen', 'shopBuy', 'shopSell', 'shopReroll', 'runLoaded'].includes(ev.type)) return ev;
  }
  return null;
}

/** Última movimentação de moedas na loja: o "+$4" / "−$8" que sobe do saldo. */
function lastShopCoins(events) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const ev = events[i];
    if (ev.type === 'shopOpen' || ev.type === 'runLoaded') return null;
    if (ev.type === 'coins' && ev.who === 'player') return ev;
  }
  return null;
}

/** O que o Valtinho está dizendo agora: a reclamação local mais nova ou a reação ao último evento. */
function npcLine(events, complaint) {
  const ev = lastShopEvent(events);
  const at = ev?.seq ?? 0;
  if (complaint && complaint.at >= at) return { key: `c${complaint.n}`, text: REACTIONS[complaint.kind] };
  if (!ev || ev.type === 'shopOpen' || ev.type === 'runLoaded') return { key: `g${at}`, text: GREETINGS[at % GREETINGS.length] };
  if (ev.type === 'shopBuy') return { key: `e${at}`, text: REACTIONS[ev.kind] };
  if (ev.type === 'shopSell') return { key: `e${at}`, text: REACTIONS.sell };
  return { key: `e${at}`, text: REACTIONS.reroll };
}

const tileLabel = (tileId) => {
  const [a, b] = tileId.split('-');
  return `[${a}|${b}]`;
};

function Price({ amount, short = false }) {
  return (
    <span className={`shop-price ${short ? 'shop-price-short' : ''}`}>
      <CoinGlyph size={12} />${amount}
    </span>
  );
}

/**
 * Versão 1.5: o pacote aberto em cima do balcão. As 3 opções lado a lado; tocar escolhe,
 * FICAR COM ESTE confirma (o pacote já foi pago: não tem como fechar sem levar um).
 */
function PackOpening({ opening, onPick, press }) {
  const [picked, setPicked] = useState(null);
  const pack = PACKS[opening.packId];
  return (
    <div className="overlay-backdrop fixed inset-0 z-[72] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="pack-title">
      <div className="pack-open w-full max-w-[380px] px-3 pb-4 pt-3 text-center">
        <div className="pack-open-head">
          <PackSprite id={pack.id} className="h-12 w-12" />
          <div className="text-left">
            <p id="pack-title" className="font-pixel text-[11px] leading-snug text-[#ffd36b]">
              {pack.name.toUpperCase()}
            </p>
            <p className="font-term text-[17px] leading-none text-bone-200">Escolha um. Os outros voltam pro Valtinho.</p>
          </div>
        </div>
        <div className="pack-options mt-3" role="radiogroup" aria-label="Opções do pacote">
          {opening.options.map((option, index) => {
            const relic = option.kind === 'relic' ? getRelic(option.id) : null;
            const enh = option.kind === 'tile' ? ENHANCEMENTS[option.enhancement] : null;
            const tier = getRarity(relic ? relic.rarity : enh.rarity);
            const [a, b] = option.kind === 'tile' ? option.tileId.split('-').map(Number) : [0, 0];
            return (
              <button
                key={`${option.id ?? option.tileId}-${index}`}
                type="button"
                role="radio"
                aria-checked={picked === index}
                className={`pack-option ${picked === index ? 'is-on' : ''} ${tier.id === 'mitico' ? 'is-mythic' : ''}`}
                style={{ '--rarity': tier.color, animationDelay: `${index * 110}ms` }}
                onClick={() => {
                  sound.playClick();
                  setPicked(index);
                }}
                {...(relic ? press({ kind: 'relic', id: relic.id, owner: 'shop' }) : press({ kind: 'offerTile', tileId: option.tileId, enhancement: option.enhancement }))}
              >
                <span className="pack-option-art">
                  {relic ? <RelicIcon relic={relic} size={44} /> : <DominoTile values={[a, b]} unit={18} depth={3} enhancement={option.enhancement} shimmer />}
                </span>
                <span className={`rarity-badge ${tier.id === 'mitico' ? 'rarity-badge-mythic' : ''}`}>{tier.label}</span>
                <span className="pack-option-name">{relic ? relic.short : enh.name.toUpperCase()}</span>
                <span className="pack-option-text">{relic ? relic.description : `Substitui o seu ${tileLabel(option.tileId)} comum. ${enh.description}`}</span>
              </button>
            );
          })}
        </div>
        <button type="button" data-tone="play" className="btn-pixel mt-3 w-full" disabled={picked === null} onClick={() => onPick?.(picked)}>
          {picked === null ? 'TOQUE NUMA OPÇÃO' : 'FICAR COM ESTE'}
        </button>
      </div>
    </div>
  );
}

/** Valtinho do Bar: respira devagar e pisca de vez em quando. */
function Valtinho() {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let timer = 0;
    const loop = () => {
      timer = setTimeout(
        () => {
          setBlink(true);
          timer = setTimeout(() => {
            setBlink(false);
            loop();
          }, 140);
        },
        2200 + Math.random() * 3200,
      );
    };
    loop();
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="shop-npc" aria-hidden="true">
      <ValtinhoSprite blink={blink} className="shop-npc-sprite" />
    </div>
  );
}

/**
 * Loja Clandestina (Patch 0.5.5): uma cena de balcão de boteco, não um formulário.
 *   toldo listrado · lâmpada pendurada com o cone de luz sobre o balcão
 *   o Valtinho do Bar atrás do balcão, com as falas dele
 *   balcão de madeira: 3 talismãs no veludo com etiqueta de papel pardo,
 *     2 pedras de grife inclinadas no expositor com fita adesiva
 *   frente do balcão: a sua Bolsa de Talismãs (4 nichos, toque para vender a 50%)
 *   copo de dados (REEMBARALHAR) e a placa de madeira para voltar ao mapa
 * Segurar qualquer mercadoria mostra o efeito. Desde o Patch 0.6.1 a loja é um caminho
 * opcional da teia: sair dela volta para o mapa, que mostra as próximas bifurcações.
 */
export default function Shop({ state, onBuyRelic, onBuyTile, onSell, onReroll, onLeave, onBuyPack, onPackPick, press, leaveTitle = 'VOLTAR AO MAPA →', leaveNote = null }) {
  // Patch 0.9.3: sem scroll; se ainda passar da tela, a cena encolhe para caber
  const [fitOuter, fitInner, fitStyle] = useFitScale();
  const [sellId, setSellId] = useState(null);
  const [alert, setAlert] = useState(0);
  const [complaint, setComplaint] = useState(null);
  const [shaking, setShaking] = useState(0);
  const { shop } = state;
  const coins = state.coins.player;
  const region = regionOfState(state);
  const exits = availableNodes({ ...state, run: { ...state.run, cleared: [...state.run.cleared, state.run.node] } }).length;
  const coinFx = lastShopCoins(state.events);
  const upgraded = Object.entries(state.decks.player);
  const selling = sellId ? getRelic(sellId) : null;
  const line = npcLine(state.events, complaint);
  const canReroll = coins >= shop.rerollCost;

  const complain = (kind) => {
    setComplaint((c) => ({ kind, at: state.seq, n: (c?.n ?? 0) + 1 }));
    haptic([30, 40, 30]);
  };

  const buyRelic = (index) => {
    const offer = shop.relics[index];
    if (offer.sold) return;
    const block = relicBuyBlock(state, offer);
    if (block === 'full') {
      setAlert((n) => n + 1);
      complain('full');
      return;
    }
    if (block === 'coins') {
      complain('coins');
      return;
    }
    if (!block) onBuyRelic(index);
  };

  const buyTile = (index) => {
    const offer = shop.tiles[index];
    if (offer.sold) return;
    const block = tileBuyBlock(state, offer);
    if (block === 'coins') {
      complain('coins');
      return;
    }
    if (!block) onBuyTile(index);
  };

  const buyPack = (index) => {
    const offer = shop.packs[index];
    if (offer.sold) return;
    const block = packBuyBlock(state, offer);
    if (block === 'full') {
      setAlert((n) => n + 1);
      complain('full');
      return;
    }
    if (block === 'coins') {
      complain('coins');
      return;
    }
    if (!block) onBuyPack?.(index);
  };

  const reroll = () => {
    if (!canReroll) {
      complain('coins');
      return;
    }
    setShaking((n) => n + 1);
    sound.playDiceShake();
    onReroll();
  };

  const confirmSell = () => {
    onSell(sellId);
    setSellId(null);
  };

  return (
    <div className={`shop-scene map-atmo-${region.atmosphere} fixed inset-0 z-[55]`} role="dialog" aria-modal="true" aria-labelledby="shop-title">
      <div ref={fitOuter} className="shop-scroll">
        <div ref={fitInner} className="scene-fit" style={fitStyle}>
        {/* toldo listrado com a barra denteada */}
        <header className="shop-awning">
          <div className="shop-awning-inner">
            <h1 id="shop-title" className="shop-sign">
              LOJA CLANDESTINA
              <span className="shop-sign-region">{region.name}</span>
            </h1>
            <span className="shop-cash" aria-label={`Seu saldo: ${coins} moedas`}>
              <CoinCount value={coins} className="text-[14px]" />
              {coinFx && (
                <span key={coinFx.seq} className={`coin-float absolute right-1 top-0 font-pixel text-[10px] ${coinFx.amount > 0 ? 'text-[#9fe08a]' : 'text-blood-400'}`}>
                  {coinFx.amount > 0 ? `+$${coinFx.amount}` : `−$${-coinFx.amount}`}
                </span>
              )}
            </span>
          </div>
        </header>

        {/* parede do fundo: lâmpada, prateleira e o Valtinho atrás do balcão */}
        <section className="shop-backwall" aria-label="Atendente">
          <div className="shop-lamp-zone" aria-hidden="true">
            <LampRig part="light" lamp={44} cord={14} beamWidth={320} />
            <LampRig part="body" lamp={44} cord={14} beamWidth={320} className="z-[6]" />
          </div>
          <div className="shop-shelf" aria-hidden="true" />
          <div className="shop-npc-wrap">
            <RivalSpeech key={line.key} text={line.text} voice="valtinho" tail="down" tailX="50%" linger={false} className="shop-npc-speech" />
            <Valtinho />
          </div>
        </section>

        {/* balcão de madeira com as marcas de copo */}
        <section className="shop-counter" aria-label="Balcão">
          <h2 className="sr-only">Talismãs à venda</h2>
          <ul className="shop-goods">
            {shop.relics.map((offer, index) => {
              const relic = getRelic(offer.id);
              const tier = getRarity(relic.rarity);
              const block = relicBuyBlock(state, offer);
              return (
                <li key={`${offer.id}-${shop.rerolls}`} className="shop-good" style={{ '--rarity': tier.color }}>
                  <button
                    type="button"
                    className={`scene-tap shop-good-btn ${offer.sold ? 'is-sold' : ''} ${block === 'coins' && !offer.sold ? 'is-short' : ''}`}
                    onClick={() => buyRelic(index)}
                    aria-label={offer.sold ? `${relic.name}: vendido` : `Comprar ${relic.name} (${tier.label.toLowerCase()}) por ${offer.price} moedas`}
                    {...press({ kind: 'relic', id: offer.id, owner: 'shop' })}
                  >
                    <span className="shop-velvet" aria-hidden="true" />
                    {/* a vaga continua lá depois de vendido: a etiqueta não pula */}
                    <span className="shop-good-art">{!offer.sold && <RelicIcon relic={relic} size={48} />}</span>
                    <span className="shop-tag">
                      <span className="shop-tag-rarity">{tier.label}</span>
                      <span className="shop-tag-name">{relic.short}</span>
                      {offer.sold ? <span className="shop-tag-sold">VENDIDO</span> : <Price amount={offer.price} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <h2 className="sr-only">Pedras de grife</h2>
          <div className="shop-display">
            {shop.tiles.map((offer, index) => {
              const enhancement = ENHANCEMENTS[offer.enhancement];
              const [a, b] = offer.tileId.split('-').map(Number);
              const label = tileLabel(offer.tileId);
              const block = tileBuyBlock(state, offer);
              return (
                <button
                  key={`${offer.tileId}-${shop.rerolls}`}
                  type="button"
                  className={`scene-tap shop-grife ${index === 0 ? 'shop-grife-left' : 'shop-grife-right'} ${offer.sold ? 'is-sold' : ''} ${
                    block === 'coins' && !offer.sold ? 'is-short' : ''
                  }`}
                  onClick={() => buyTile(index)}
                  aria-label={
                    offer.sold ? `${label} de ${enhancement.name}: vendido` : `Comprar ${label} de ${enhancement.name} por ${offer.price} moedas, substitui o seu ${label} comum`
                  }
                  {...press({ kind: 'offerTile', tileId: offer.tileId, enhancement: offer.enhancement })}
                >
                  <span className="shop-grife-tile">
                    {!offer.sold && <DominoTile values={[a, b]} unit={22} depth={3} enhancement={offer.enhancement} shimmer />}
                  </span>
                  <span className="shop-tape">
                    <span className="shop-tape-name">{enhancement.name.toUpperCase()}</span>
                    {offer.sold ? (
                      <span className="shop-tag-sold">VENDIDO</span>
                    ) : (
                      <>
                        <span className="shop-tape-sub">Substitui {label} comum</span>
                        <Price amount={offer.price} short />
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Versão 1.5: a prateleira dos pacotes fechados (abre na hora, escolhe 1 de 3) */}
          {shop.packs?.length > 0 && (
            <>
              <h2 className="sr-only">Pacotes fechados</h2>
              <ul className="shop-packs">
                {shop.packs.map((offer, index) => {
                  const pack = PACKS[offer.id];
                  const block = packBuyBlock(state, offer);
                  return (
                    <li key={offer.id}>
                      <button
                        type="button"
                        className={`scene-tap shop-pack ${offer.sold ? 'is-sold' : ''} ${block === 'coins' && !offer.sold ? 'is-short' : ''}`}
                        onClick={() => buyPack(index)}
                        aria-label={offer.sold ? `${pack.name}: já aberto` : `Comprar ${pack.name} por ${offer.price} moedas: ${pack.blurb}`}
                        {...press({ kind: 'pack', id: offer.id })}
                      >
                        <span className="shop-pack-art">{!offer.sold && <PackSprite id={offer.id} className="h-10 w-10" />}</span>
                        <span className="shop-pack-name">{pack.short}</span>
                        {offer.sold ? <span className="shop-tag-sold">ABERTO</span> : <Price amount={offer.price} short />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {/* frente do balcão: a Bolsa de Talismãs, 4 nichos entalhados */}
          <div key={`pouch-${alert}`} className={`shop-pouch ${alert ? 'animate-hotbar-full' : ''}`}>
            <p className="shop-pouch-label">
              BOLSA DE TALISMÃS {state.relics.player.length}/{relicSlotsFor(state)}
              <span>Toque para vender (50%)</span>
            </p>
            <div className="shop-niches" role="group" aria-label="Seus talismãs (toque para vender)">
              {Array.from({ length: relicSlotsFor(state) }, (_, i) => {
                const relic = getRelic(state.relics.player[i]);
                if (!relic) return <span key={`empty-${i}`} className="shop-niche shop-niche-empty" aria-hidden="true" />;
                return (
                  <button
                    key={relic.id}
                    type="button"
                    className="scene-tap shop-niche relic-slot"
                    style={{ '--rarity': getRarity(relic.rarity).color }}
                    onClick={() => setSellId(relic.id)}
                    aria-label={`${relic.name}: vender por ${sellPriceFor(state, relic.id)} moedas`}
                    {...press({ kind: 'relic', id: relic.id, owner: 'player' })}
                  >
                    <RelicIcon relic={relic} size={34} />
                  </button>
                );
              })}
            </div>
            {upgraded.length > 0 && (
              <div className="shop-deck" aria-label={`Seu baralho tem ${upgraded.length} pedras de grife`}>
                <span>SEU BARALHO</span>
                {upgraded.map(([tileId, enhancement]) => {
                  const [a, b] = tileId.split('-').map(Number);
                  return (
                    <span key={tileId} {...press({ kind: 'offerTile', tileId, enhancement })}>
                      <DominoTile values={[a, b]} unit={8} depth={1} enhancement={enhancement} still />
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          {alert > 0 && (
            <p key={`alert-${alert}`} className="shop-alert animate-shop-alert px-2 py-1.5 text-center font-pixel text-[8px] leading-relaxed" role="alert">
              BOLSA CHEIA! VENDA UM TALISMÃ ANTES
            </p>
          )}
        </section>

        {/* copo de dados e a placa de madeira */}
        <footer className="shop-controls">
          <button
            type="button"
            className={`scene-tap shop-dice ${canReroll ? '' : 'is-short'}`}
            onClick={reroll}
            aria-label={`Reembaralhar a vitrine por ${shop.rerollCost} moedas`}
          >
            <span key={shaking} className={shaking ? 'shop-dice-shake' : ''}>
              <DiceCupIcon className="h-14 w-14" />
            </span>
            <span className="shop-dice-label">REEMBARALHAR</span>
            {/* versão 1.4: reembaralhares guardados pelo Pé de Coelho Sarnento */}
            {shop.rerollCost === 0 && (state.run?.freeRerolls ?? 0) > 0 ? (
              <span className="shop-price shop-price-short">GRÁTIS ×{state.run.freeRerolls}</span>
            ) : (
              <Price amount={shop.rerollCost} short />
            )}
          </button>
          <button type="button" className="scene-tap shop-plank" onClick={onLeave}>
            <span className="shop-nail shop-nail-tl" aria-hidden="true" />
            <span className="shop-nail shop-nail-tr" aria-hidden="true" />
            <span className="shop-nail shop-nail-bl" aria-hidden="true" />
            <span className="shop-nail shop-nail-br" aria-hidden="true" />
            <span className="shop-plank-title">{leaveTitle}</span>
            <span className="shop-plank-next">
              <span>{leaveNote ?? (exits > 1 ? `${exits} CAMINHOS SEGUEM DAQUI` : 'A TRILHA SEGUE PARA CIMA')}</span>
            </span>
          </button>
        </footer>
        </div>
      </div>

      {shop.opening && <PackOpening opening={shop.opening} onPick={onPackPick} press={press} />}

      {selling && (
        <div className="overlay-backdrop fixed inset-0 z-[70] flex items-center justify-center px-8" role="dialog" aria-modal="true" aria-labelledby="sell-title">
          <div className="shop-receipt w-full max-w-[280px] px-4 py-4 text-center">
            <p className="shop-receipt-head">VALTINHO DO BAR · COMPRA</p>
            <div className="mx-auto mt-2 w-fit">
              <RelicIcon relic={selling} size={48} />
            </div>
            <p id="sell-title" className="mt-2 font-pixel text-[9px] leading-snug">
              {selling.name.toUpperCase()}
            </p>
            <p className="shop-receipt-note">{getRarity(selling.rarity).label} · revenda a 50%</p>
            <div className="mt-3 grid gap-2">
              <button type="button" data-tone="blood" className="btn-pixel" onClick={confirmSell}>
                VENDER POR ${sellPriceFor(state, selling.id)}
              </button>
              <button type="button" className="btn-pixel" onClick={() => setSellId(null)}>
                FICAR COM ELE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
