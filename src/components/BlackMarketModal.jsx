import { useEffect, useState } from 'react';
import { sound } from '../engine/audioSynth.js';
import { getRarity } from '../data/rarities.js';
import { getRelic } from '../data/relics.js';
import { relicSlotsFor } from '../engine/loadout.js';
import { marketBuyBlock } from '../engine/blackMarket.js';
import { regionOfState } from '../engine/campaignMap.js';
import { haptic } from '../engine/progress.js';
import CoinCount from './CoinCount.jsx';
import RelicIcon from './RelicIcon.jsx';
import RivalSpeech from './RivalSpeech.jsx';
import { CoinGlyph } from './UiGlyphs.jsx';
import { paintAlley, paintCoatLining, paintRoughPlank } from './art/shopPixels.js';
import PaintedBox from './PaintedBox.jsx';
import { NpcPortrait, ShopSprite } from './ShopArt.jsx';
import { useFitScale } from './useFitScale.js';

/** Falas do Corvo da Madrugada: ao abrir o beco e reagindo ao que você faz. */
const GREETINGS = ['Psiu... aqui, no escuro.', 'Coisa que o Valtinho não tem coragem de vender.', 'Paga em dinheiro. Sem recibo, sem pergunta.'];
const REACTIONS = {
  buy: 'Negócio fechado. Ela cobra o dela, lembra disso.',
  coins: 'Sem grana, some do meu beco.',
  full: 'Bolsa cheia. Volta quando tiver espaço.',
  sold: 'Esse já foi. Não tenho outro.',
};

/** O que o Corvo está dizendo agora: a reclamação mais nova ou a reação à última compra. */
function corvoLine(events, complaint) {
  let ev = null;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (['marketOpen', 'marketBuy', 'runLoaded'].includes(events[i].type)) {
      ev = events[i];
      break;
    }
  }
  const at = ev?.seq ?? 0;
  if (complaint && complaint.at >= at) return { key: `c${complaint.n}`, text: REACTIONS[complaint.kind] };
  if (ev?.type === 'marketBuy') return { key: `b${at}`, text: REACTIONS.buy };
  return { key: `g${at}`, text: GREETINGS[at % GREETINGS.length] };
}

/**
 * Versão 2.2: o beco pintado (tijolo molhado com o vermelho do neon, porta de ferro, cano,
 * sacos de lixo e as poças refletindo o letreiro), o Corvo encapuzado em 64×64 com os olhos
 * vermelhos que apagam quando ele pisca, e o forro do sobretudo em cetim acolchoado: os
 * talismãs pendem das presilhas com a etiqueta de papel encardido. Bolsa em nichos e a placa.
 *
 * Mercado Negro (Patch 0.6.1): o beco do Corvo da Madrugada. Parede de tijolo molhada,
 * neon vermelho falhando, neblina no chão e o contrabandista encapuzado de olhos vermelhos.
 * Ele abre o sobretudo e mostra 3 talismãs Necróticos ($18 a $26) no forro. Ele não compra
 * nada seu: aqui só se paga. Segurar um talismã mostra o efeito (e o preço que ele cobra).
 */
export default function BlackMarketModal({ state, onBuy, onLeave, press, leaveTitle = 'SAIR DO BECO →', leaveNote = 'VOLTAR AO MAPA' }) {
  // Patch 0.9.3: sem scroll; se ainda passar da tela, a cena encolhe para caber
  const [fitOuter, fitInner, fitStyle] = useFitScale();
  const [complaint, setComplaint] = useState(null);
  const [alert, setAlert] = useState(0);
  const [talking, setTalking] = useState(false);
  const { market } = state;
  const coins = state.coins.player;
  const region = regionOfState(state);
  const line = corvoLine(state.events, complaint);

  // Versão 2.2: a entrada no beco: o neon acende falhando (o CSS anima o resto)
  useEffect(() => {
    sound.playNeonBuzz();
  }, []);

  const complain = (kind) => {
    setComplaint((c) => ({ kind, at: state.seq, n: (c?.n ?? 0) + 1 }));
    haptic([30, 40, 30]);
  };

  const buy = (index) => {
    const offer = market.offers[index];
    const block = marketBuyBlock(state, offer);
    if (block === 'full') setAlert((n) => n + 1);
    if (block) {
      complain(block);
      return;
    }
    onBuy(index);
  };

  return (
    <div className={`bm-scene bm-v22 map-atmo-${region.atmosphere} fixed inset-0 z-[55]`} role="dialog" aria-modal="true" aria-labelledby="bm-title">
      <div ref={fitOuter} className="bm-scroll">
        <div ref={fitInner} className="scene-fit" style={fitStyle}>
        <header className="bm-head">
          <h1 id="bm-title" className="bm-neon">
            MERCADO NEGRO
            <span className="bm-neon-sub">BECO DO CORVO DA MADRUGADA</span>
          </h1>
          <span className="bm-cash" aria-label={`Seu saldo: ${coins} moedas`}>
            <CoinCount value={coins} className="text-[14px]" />
          </span>
        </header>

        <section className="bm-alley" aria-label="Contrabandista">
          <PaintedBox name="beco" painter={paintAlley} className="bm-alley-canvas" />
          <span className="bm-neon-glow" aria-hidden="true" />
          <span className="bm-drip bm-drip-a" aria-hidden="true" />
          <span className="bm-drip bm-drip-b" aria-hidden="true" />
          <span className="bm-rain" aria-hidden="true" />
          <div className="bm-npc-wrap">
            <RivalSpeech key={line.key} text={line.text} voice="corvo" tail="down" tailX="50%" linger={false} onMouth={setTalking} className="bm-speech" />
            <div className="bm-npc" aria-hidden="true">
              <NpcPortrait who="corvo" size={144} speaking={talking} />
            </div>
          </div>
          <span className="bm-fog" aria-hidden="true" />
        </section>

        <section className="bm-coat" aria-label="Talismãs Necróticos à venda">
          <PaintedBox name="forro" painter={paintCoatLining} className="bm-coat-canvas" />
          <p className="bm-coat-label">FORRO DO SOBRETUDO · SEGURE PARA LER</p>
          <ul className="bm-goods">
            {market.offers.map((offer, index) => {
              const relic = getRelic(offer.id);
              const tier = getRarity(relic.rarity);
              const block = marketBuyBlock(state, offer);
              return (
                <li key={offer.id} className="bm-good" style={{ '--rarity': tier.color }}>
                  <button
                    type="button"
                    className={`scene-tap bm-good-btn ${offer.sold ? 'is-sold' : ''} ${block === 'coins' && !offer.sold ? 'is-short' : ''}`}
                    onClick={() => buy(index)}
                    aria-label={offer.sold ? `${relic.name}: vendido` : `Comprar ${relic.name} (necrótico) por ${offer.price} moedas: ${relic.description}`}
                    {...press({ kind: 'relic', id: offer.id, owner: 'market' })}
                  >
                    {/* a presilha de couro e o barbante de onde o talismã pende */}
                    <span className="bm-hook" aria-hidden="true" />
                    <span className="bm-good-art">{!offer.sold && <RelicIcon relic={relic} size={46} />}</span>
                    <span className="bm-tag">
                      <span className="bm-tag-rarity">{tier.label}</span>
                      <span className="bm-tag-name">{relic.short}</span>
                      {offer.sold ? (
                        <span className="bm-tag-sold">VENDIDO</span>
                      ) : (
                        <span className="bm-price">
                          <CoinGlyph size={12} />${offer.price}
                        </span>
                      )}
                    </span>
                  </button>
                  {!offer.sold && <p className="bm-good-desc">{relic.description}</p>}
                </li>
              );
            })}
          </ul>
          <div key={`pouch-${alert}`} className={`bm-pouch ${alert ? 'animate-hotbar-full' : ''}`} aria-label="Seus talismãs">
            <span className="bm-pouch-label">
              BOLSA {state.relics.player.length}/{relicSlotsFor(state)}
            </span>
            {Array.from({ length: relicSlotsFor(state) }, (_, i) => {
              const relic = getRelic(state.relics.player[i]);
              if (!relic)
                return (
                  <span key={`empty-${i}`} className="bm-niche bm-niche-empty" aria-hidden="true">
                    <ShopSprite name="nicho" scale={1.5} className="bm-niche-px" />
                  </span>
                );
              return (
                <span key={relic.id} className="bm-niche" {...press({ kind: 'relic', id: relic.id, owner: 'player' })}>
                  <ShopSprite name="nicho" scale={1.5} className="bm-niche-px" />
                  <span className="bm-niche-relic">
                    <RelicIcon relic={relic} size={26} />
                  </span>
                </span>
              );
            })}
          </div>
          {alert > 0 && (
            <p key={`alert-${alert}`} className="shop-alert animate-shop-alert mt-2 px-2 py-1.5 text-center font-pixel text-[8px] leading-relaxed" role="alert">
              BOLSA CHEIA! VENDA UM TALISMÃ NA LOJA DO VALTINHO
            </p>
          )}
        </section>

        <footer className="bm-controls">
          <button type="button" className="scene-tap shop-plank bm-plank" onClick={onLeave}>
            <PaintedBox name="placa-beco" painter={paintRoughPlank} seed={85} className="shop-plank-canvas" />
            <span className="shop-plank-title">{leaveTitle}</span>
            <span className="shop-plank-next">
              <span>{leaveNote}</span>
            </span>
          </button>
        </footer>
        </div>
      </div>
    </div>
  );
}
