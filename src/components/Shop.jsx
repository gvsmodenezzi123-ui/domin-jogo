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
import { paintAwning, paintCounterFront, paintRoughPlank, paintShelfRow, paintShopWall } from './art/shopPixels.js';
import CoinCount from './CoinCount.jsx';
import DominoTile from './DominoTile.jsx';
import LampRig from './LampRig.jsx';
import PackOpening from './PackOpening.jsx';
import PaintedBox from './PaintedBox.jsx';
import RelicIcon from './RelicIcon.jsx';
import RivalSpeech from './RivalSpeech.jsx';
import { NpcPortrait, PackArt, ShopSprite } from './ShopArt.jsx';
import { CoinGlyph } from './UiGlyphs.jsx';
import { prefersReducedMotion } from './motion.js';
import { useFitScale } from './useFitScale.js';
import DominoKey from './DominoKey.jsx';
import LandStage from './LandStage.jsx';
import { useLandscape } from './useLandscape.js';
import { SHOP_PAD, paintShopBack } from './art/landShop.js';

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

/** As partículas de poeira dançando no cone de luz da lâmpada. */
const DUST = Array.from({ length: 9 }, (_, i) => ({ left: 18 + ((i * 37) % 64), top: 30 + ((i * 53) % 120), delay: -(i * 1.3), dur: 6 + (i % 4) * 1.5 }));

/** As fagulhas douradas subindo dos pacotes lacrados (a promessa do que tem dentro). */
const SPARKS = Array.from({ length: 4 }, (_, i) => ({ left: 18 + i * 20, delay: -(i * 0.9), dur: 2.6 + (i % 2) * 0.8 }));

/** A fumaça do cigarro (do Valtinho e do Cinzeiro no veludo): três baforadas defasadas. */
function Smoke({ className = '' }) {
  return (
    <span className={`shop-smoke ${className}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

/**
 * Versão 2.2: tudo pintado em pixel art (art/shopPixels.js): o toldo rasgado, a parede de
 * azulejo, o Valtinho fumando sob a lâmpada com a poeira no facho, a estante em 2.5D (veludo,
 * bilhetes com alfinete, pacotes lacrados respirando), os nichos entalhados, o copo de couro e
 * a placa rebitada. A abertura do pacote virou cena de cinema (PackOpening.jsx).
 *
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
  const [talking, setTalking] = useState(false);
  const { shop } = state;
  const coins = state.coins.player;
  const region = regionOfState(state);
  const exits = availableNodes({ ...state, run: { ...state.run, cleared: [...state.run.cleared, state.run.node] } }).length;
  const coinFx = lastShopCoins(state.events);
  const upgraded = Object.entries(state.decks.player);
  const selling = sellId ? getRelic(sellId) : null;
  const line = npcLine(state.events, complaint);
  const canReroll = coins >= shop.rerollCost;

  // Versão 2.2: a entrada (toldo desce, a luz acende, o Valtinho sobe, a mercadoria assenta):
  // o sininho da porta e um toque de madeira para cada peça que cai na prateleira (o CSS anima)
  useEffect(() => {
    sound.playShopBell();
    if (prefersReducedMotion()) return undefined;
    const timers = [760, 850, 940, 1080, 1180].map((ms, i) => setTimeout(() => sound.playShelfTap(i), ms));
    return () => timers.forEach(clearTimeout);
  }, []);

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

  const landscape = useLandscape();
  const sellModal = selling && (
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
  );

  if (landscape) {
    const slots = relicSlotsFor(state);
    return (
      <div className={`shop-scene shop-land map-atmo-${region.atmosphere}`} role="dialog" aria-modal="true" aria-labelledby="shop-title">
        <LandStage paint={() => paintShopBack(41, region.atmosphere)} cacheKey={`land-loja-${region.atmosphere}`} pad={SHOP_PAD} bleed="#0a0705" label="Loja do Valtinho" role="presentation">
          {/* o Valtinho atrás do balcão, sob a lâmpada dele */}
          <div className="sl-lamp" aria-hidden="true">
            <LampRig part="light" lamp={52} cord={110} beamWidth={260} />
            <LampRig part="body" lamp={52} cord={110} beamWidth={260} />
          </div>
          <div className="sl-npc" aria-hidden="true">
            <NpcPortrait who="valtinho" size={184} speaking={talking} />
          </div>
          <RivalSpeech key={line.key} text={line.text} voice="valtinho" tail="down" tailX="50%" linger={false} onMouth={setTalking} className="sl-speech" />

          {/* a placa na cornija da estante e o seu dinheiro */}
          <h1 id="shop-title" className="sl-sign">
            LOJA CLANDESTINA <span>· {region.name}</span>
          </h1>
          <span className="sl-cash" aria-label={`Seu saldo: ${coins} moedas`}>
            <CoinCount value={coins} className="text-[16px]" />
            {coinFx && (
              <span key={coinFx.seq} className={`coin-float sl-cash-fx ${coinFx.amount > 0 ? 'is-gain' : 'is-loss'}`}>
                {coinFx.amount > 0 ? `+$${coinFx.amount}` : `−$${-coinFx.amount}`}
              </span>
            )}
          </span>

          {/* fileira de cima: os talismãs no veludo, cada um sob o seu foquinho */}
          <ul className="sl-relics" aria-label="Talismãs à venda">
            {shop.relics.map((offer, index) => {
              const relic = getRelic(offer.id);
              const tier = getRarity(relic.rarity);
              const block = relicBuyBlock(state, offer);
              return (
                <li key={`${offer.id}-${shop.rerolls}`} style={{ '--rarity': tier.color, '--float-delay': `${-index * 0.8}s` }}>
                  <button
                    type="button"
                    className={`scene-tap sl-relic ${offer.sold ? 'is-sold' : ''} ${block === 'coins' && !offer.sold ? 'is-short' : ''}`}
                    onClick={() => buyRelic(index)}
                    aria-label={offer.sold ? `${relic.name}: vendido` : `Comprar ${relic.name} (${tier.label.toLowerCase()}) por ${offer.price} moedas`}
                    {...press({ kind: 'relic', id: offer.id, owner: 'shop' })}
                  >
                    <span className="sl-relic-stage" aria-hidden="true">
                      <ShopSprite name="almofada" scale={2.4} className="sl-cushion" />
                      {!offer.sold && (
                        <span className="sl-relic-art">
                          <RelicIcon relic={relic} size={60} />
                        </span>
                      )}
                    </span>
                    <span className="sl-tag">
                      <span className="sl-tag-rarity">{tier.label}</span>
                      <span className="sl-tag-name">{relic.short}</span>
                      {offer.sold ? <span className="shop-tag-sold">VENDIDO</span> : <Price amount={offer.price} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* embaixo: os bilhetes das pedras de grife na cortiça */}
          <div className="sl-notes" aria-label="Pedras de grife">
            {shop.tiles.map((offer, index) => {
              const enhancement = ENHANCEMENTS[offer.enhancement];
              const [a, b] = offer.tileId.split('-').map(Number);
              const label = tileLabel(offer.tileId);
              const block = tileBuyBlock(state, offer);
              return (
                <button
                  key={`${offer.tileId}-${shop.rerolls}`}
                  type="button"
                  className={`scene-tap sl-grife ${offer.sold ? 'is-sold' : ''} ${block === 'coins' && !offer.sold ? 'is-short' : ''}`}
                  style={{ '--tilt': `${index ? 2 : -2}deg` }}
                  onClick={() => buyTile(index)}
                  aria-label={offer.sold ? `${label} de ${enhancement.name}: vendido` : `Comprar ${label} de ${enhancement.name} por ${offer.price} moedas, substitui o seu ${label} comum`}
                  {...press({ kind: 'offerTile', tileId: offer.tileId, enhancement: offer.enhancement })}
                >
                  <ShopSprite name="alfinete" scale={2} className="sl-pin" />
                  <span className="sl-note-name">{enhancement.name.toUpperCase()}</span>
                  <span className="sl-grife-tile">{!offer.sold && <DominoTile values={[a, b]} unit={18} depth={5} enhancement={offer.enhancement} shimmer />}</span>
                  {offer.sold ? (
                    <span className="shop-tag-sold">VENDIDO</span>
                  ) : (
                    <>
                      <span className="sl-note-hand">Substitui {label}</span>
                      <Price amount={offer.price} short />
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* e a prateleira dos pacotes lacrados */}
          {shop.packs?.length > 0 && (
            <ul className="sl-packs" aria-label="Mercadoria lacrada">
              {shop.packs.map((offer, index) => {
                const pack = PACKS[offer.id];
                const block = packBuyBlock(state, offer);
                return (
                  <li key={offer.id}>
                    <button
                      type="button"
                      className={`scene-tap sl-pack ${offer.sold ? 'is-sold' : ''} ${block === 'coins' && !offer.sold ? 'is-short' : ''}`}
                      style={{ '--breath-delay': `${-index * 0.9}s` }}
                      onClick={() => buyPack(index)}
                      aria-label={offer.sold ? `${pack.name}: já aberto` : `Comprar ${pack.name} por ${offer.price} moedas: ${pack.blurb}`}
                      {...press({ kind: 'pack', id: offer.id })}
                    >
                      <span className="sl-pack-art" aria-hidden="true">
                        {!offer.sold && <PackArt id={offer.id} size={72} />}
                        {offer.sold && <span className="shop-pack-torn" />}
                      </span>
                      <span className="sl-pack-name">{pack.short}</span>
                      {offer.sold ? <span className="shop-tag-sold">ABERTO</span> : <Price amount={offer.price} short />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* na frente do balcão: a bolsa (toque para vender), o copo de dados e a saída */}
          <div key={`pouch-${alert}`} className={`sl-pouch ${alert ? 'animate-hotbar-full' : ''}`}>
            <p className="sl-pouch-label">
              BOLSA DE TALISMÃS {state.relics.player.length}/{slots} <span>· toque para vender (50%)</span>
            </p>
            <div className="sl-niches" role="group" aria-label="Seus talismãs (toque para vender)">
              {Array.from({ length: slots }, (_, i) => {
                const relic = getRelic(state.relics.player[i]);
                if (!relic)
                  return (
                    <span key={`empty-${i}`} className="sl-niche is-empty" aria-hidden="true">
                      <ShopSprite name="nicho" scale={2.2} />
                    </span>
                  );
                return (
                  <button
                    key={relic.id}
                    type="button"
                    className="scene-tap sl-niche relic-slot"
                    style={{ '--rarity': getRarity(relic.rarity).color }}
                    onClick={() => setSellId(relic.id)}
                    aria-label={`${relic.name}: vender por ${sellPriceFor(state, relic.id)} moedas`}
                    {...press({ kind: 'relic', id: relic.id, owner: 'player' })}
                  >
                    <ShopSprite name="nicho" scale={2.2} />
                    <span className="sl-niche-relic">
                      <RelicIcon relic={relic} size={36} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {alert > 0 && (
            <p key={`alert-${alert}`} className="shop-alert animate-shop-alert sl-alert" role="alert">
              BOLSA CHEIA! VENDA UM TALISMÃ ANTES
            </p>
          )}
          <button type="button" className={`scene-tap sl-dice ${canReroll ? '' : 'is-short'}`} onClick={reroll} aria-label={`Reembaralhar a vitrine por ${shop.rerollCost} moedas`}>
            <span key={shaking} className={shaking ? 'shop-dice-shake' : ''}>
              <ShopSprite name="copo" scale={1.5} />
            </span>
            <span className="sl-dice-label">REEMBARALHAR</span>
            {shop.rerollCost === 0 && (state.run?.freeRerolls ?? 0) > 0 ? <span className="shop-price shop-price-short">GRÁTIS ×{state.run.freeRerolls}</span> : <Price amount={shop.rerollCost} short />}
          </button>
          {upgraded.length > 0 && (
            <div className="sl-deck" aria-label={`Seu baralho tem ${upgraded.length} pedras de grife`}>
              <span>SEU BARALHO</span>
              <span className="sl-deck-tiles">
                {upgraded.map(([tileId, enhancement]) => {
                  const [a, b] = tileId.split('-').map(Number);
                  return (
                    <span key={tileId} {...press({ kind: 'offerTile', tileId, enhancement })}>
                      <DominoTile values={[a, b]} unit={9} depth={1} enhancement={enhancement} still />
                    </span>
                  );
                })}
              </span>
            </div>
          )}
          <DominoKey
            label={leaveTitle.replace(/\s*→$/, '')}
            note={leaveNote ?? (exits > 1 ? `${exits} caminhos seguem daqui` : 'a trilha segue em frente')}
            pips={4}
            tone="ivory"
            w={290}
            h={62}
            className="sl-leave is-main"
            onClick={onLeave}
          />
        </LandStage>
        {shop.opening && <PackOpening opening={shop.opening} onPick={onPackPick} press={press} />}
        {sellModal}
      </div>
    );
  }

  return (
    <div className={`shop-scene shop-v22 map-atmo-${region.atmosphere} fixed inset-0 z-[55]`} role="dialog" aria-modal="true" aria-labelledby="shop-title">
      <div ref={fitOuter} className="shop-scroll">
        <div ref={fitInner} className="scene-fit" style={fitStyle}>
          {/* Versão 2.2: o toldo de lona pintado (desbotado, desfiado, rasgado nas pontas) */}
          <header className="shop-awning">
            <PaintedBox name="toldo" painter={paintAwning} className="shop-awning-canvas" />
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

          {/* a parede de azulejo, a lâmpada com a poeira no facho e o Valtinho fumando */}
          <section className="shop-backwall" aria-label="Atendente">
            <PaintedBox name="azulejo" painter={paintShopWall} className="shop-wall-canvas" />
            <div className="shop-lamp-zone" aria-hidden="true">
              <LampRig part="light" lamp={40} cord={10} beamWidth={300} />
              <LampRig part="body" lamp={40} cord={10} beamWidth={300} className="z-[6]" />
            </div>
            <span className="shop-dust" aria-hidden="true">
              {DUST.map((d, i) => (
                <i key={i} style={{ left: `${d.left}%`, top: d.top, animationDelay: `${d.delay}s`, animationDuration: `${d.dur}s` }} />
              ))}
            </span>
            <div className="shop-npc-wrap">
              <RivalSpeech key={line.key} text={line.text} voice="valtinho" tail="down" tailX="50%" linger={false} onMouth={setTalking} className="shop-npc-speech" />
              <div className="shop-npc" aria-hidden="true">
                <NpcPortrait who="valtinho" size={128} speaking={talking} />
                <Smoke className="shop-npc-smoke" />
              </div>
            </div>
          </section>

          {/* a estante de madeira maciça: talismãs no veludo, pedras de grife nos bilhetes, pacotes lacrados */}
          <section className="shop-estante" aria-label="Estante">
            <div className="shop-row shop-row-relics">
              <PaintedBox name="prateleira-1" painter={paintShelfRow} seed={61} className="shop-row-canvas" />
              <h2 className="sr-only">Talismãs à venda</h2>
              <ul className="shop-goods">
                {shop.relics.map((offer, index) => {
                  const relic = getRelic(offer.id);
                  const tier = getRarity(relic.rarity);
                  const block = relicBuyBlock(state, offer);
                  return (
                    <li key={`${offer.id}-${shop.rerolls}`} className="shop-good" style={{ '--rarity': tier.color, '--float-delay': `${-index * 0.8}s` }}>
                      <button
                        type="button"
                        className={`scene-tap shop-good-btn ${offer.sold ? 'is-sold' : ''} ${block === 'coins' && !offer.sold ? 'is-short' : ''}`}
                        onClick={() => buyRelic(index)}
                        aria-label={offer.sold ? `${relic.name}: vendido` : `Comprar ${relic.name} (${tier.label.toLowerCase()}) por ${offer.price} moedas`}
                        {...press({ kind: 'relic', id: offer.id, owner: 'shop' })}
                      >
                        <span className="shop-good-stage" aria-hidden="true">
                          <ShopSprite name="almofada" scale={2} className="shop-cushion" />
                          {!offer.sold && (
                            <>
                              <span className="shop-good-shadow" />
                              <span className="shop-good-glow" />
                              <span className="shop-good-art">
                                <RelicIcon relic={relic} size={48} />
                                {relic.art === 'cinzeiro' && <Smoke className="shop-relic-smoke" />}
                              </span>
                            </>
                          )}
                        </span>
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
            </div>

            <div className="shop-row shop-row-grife">
              <PaintedBox name="prateleira-2" painter={paintShelfRow} seed={62} className="shop-row-canvas" />
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
                      {/* o bilhete de papel pardo rasgado, preso com o alfinete enferrujado */}
                      <span className="shop-note" aria-hidden="true">
                        <ShopSprite name="alfinete" scale={2} className="shop-pin" />
                        <span className="shop-note-name">{enhancement.name.toUpperCase()}</span>
                        {offer.sold ? (
                          <span className="shop-tag-sold">VENDIDO</span>
                        ) : (
                          <>
                            <span className="shop-note-hand">Substitui {label}</span>
                            <Price amount={offer.price} short />
                          </>
                        )}
                      </span>
                      <span className="shop-grife-tile">
                        {!offer.sold && <DominoTile values={[a, b]} unit={20} depth={6} enhancement={offer.enhancement} shimmer />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Versão 1.5: a prateleira dos pacotes fechados (abre na hora, escolhe 1 de 3) */}
            {shop.packs?.length > 0 && (
              <div className="shop-row shop-row-packs">
                <PaintedBox name="prateleira-3" painter={paintShelfRow} seed={63} className="shop-row-canvas" />
                <h2 className="shop-sealed font-pixel">MERCADORIA LACRADA</h2>
                <ul className="shop-packs">
                  {shop.packs.map((offer, index) => {
                    const pack = PACKS[offer.id];
                    const block = packBuyBlock(state, offer);
                    return (
                      <li key={offer.id}>
                        <button
                          type="button"
                          className={`scene-tap shop-pack ${offer.sold ? 'is-sold' : ''} ${block === 'coins' && !offer.sold ? 'is-short' : ''}`}
                          style={{ '--breath-delay': `${-index * 0.9}s` }}
                          onClick={() => buyPack(index)}
                          aria-label={offer.sold ? `${pack.name}: já aberto` : `Comprar ${pack.name} por ${offer.price} moedas: ${pack.blurb}`}
                          {...press({ kind: 'pack', id: offer.id })}
                        >
                          <span className="shop-pack-art" aria-hidden="true">
                            {!offer.sold && (
                              <>
                                <PackArt id={offer.id} size={76} className="shop-pack-canvas" />
                                <span className="shop-pack-sparks">
                                  {SPARKS.map((p, i) => (
                                    <i key={i} style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />
                                  ))}
                                </span>
                              </>
                            )}
                            {offer.sold && <span className="shop-pack-torn" />}
                          </span>
                          <span className="shop-pack-name">{pack.short}</span>
                          {offer.sold ? <span className="shop-tag-sold">ABERTO</span> : <Price amount={offer.price} short />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          {/* a frente do balcão: a Bolsa de Talismãs em nichos entalhados na madeira */}
          <section className="shop-counter-front" aria-label="Balcão">
            <PaintedBox name="balcao" painter={paintCounterFront} className="shop-counter-canvas" />
            <div key={`pouch-${alert}`} className={`shop-pouch ${alert ? 'animate-hotbar-full' : ''}`}>
              <p className="shop-pouch-label">
                BOLSA DE TALISMÃS {state.relics.player.length}/{relicSlotsFor(state)}
                <span>Toque para vender (50%)</span>
              </p>
              <div className="shop-niches" role="group" aria-label="Seus talismãs (toque para vender)">
                {Array.from({ length: relicSlotsFor(state) }, (_, i) => {
                  const relic = getRelic(state.relics.player[i]);
                  if (!relic)
                    return (
                      <span key={`empty-${i}`} className="shop-niche shop-niche-empty" aria-hidden="true">
                        <ShopSprite name="nicho" scale={2} className="shop-niche-px" />
                      </span>
                    );
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
                      <ShopSprite name="nicho" scale={2} className="shop-niche-px" />
                      <span className="shop-niche-relic">
                        <RelicIcon relic={relic} size={34} />
                      </span>
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

          {/* o copo de couro dos dados e a placa de madeira tosca com rebites */}
          <footer className="shop-controls">
            <button
              type="button"
              className={`scene-tap shop-dice ${canReroll ? '' : 'is-short'}`}
              onClick={reroll}
              aria-label={`Reembaralhar a vitrine por ${shop.rerollCost} moedas`}
            >
              <span key={shaking} className={shaking ? 'shop-dice-shake' : ''}>
                <ShopSprite name="copo" scale={1.6} className="shop-dice-px" />
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
              <PaintedBox name="placa" painter={paintRoughPlank} className="shop-plank-canvas" />
              <span className="shop-plank-title">{leaveTitle}</span>
              <span className="shop-plank-next">
                <span>{leaveNote ?? (exits > 1 ? `${exits} CAMINHOS SEGUEM DAQUI` : 'A TRILHA SEGUE PARA CIMA')}</span>
              </span>
            </button>
          </footer>
        </div>
      </div>

      {shop.opening && <PackOpening opening={shop.opening} onPick={onPackPick} press={press} />}

      {sellModal}
    </div>
  );
}
