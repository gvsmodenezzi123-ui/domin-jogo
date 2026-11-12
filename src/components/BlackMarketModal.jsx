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
import DominoKey from './DominoKey.jsx';
import { useNovo } from './useVisual.js';
import { NovoHearts, NovoLogo, NovoStage, PaintBack } from './novo/NovoKit.jsx';
import LandStage from './LandStage.jsx';
import { useLandscape } from './useLandscape.js';
import { ALLEY_PAD, paintAlleyBack } from './art/landAlley.js';

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
  // versão 2.24, visual novo: o talismã escolhido no forro (o painel de baixo mostra e compra)
  const novo = useNovo();
  const [pick, setPick] = useState(0);
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

  const landscape = useLandscape();
  if (landscape && novo) {
    const slots = relicSlotsFor(state);
    const offers = market.offers;
    const at = offers[pick] ? pick : 0;
    const selOffer = offers[at];
    const selRelic = selOffer ? getRelic(selOffer.id) : null;
    const step = offers.length > 1 ? Math.min(162, Math.floor(420 / offers.length)) : 0;
    return (
      <NovoStage kind="black" bleed="#07060a" label="Mercado Negro" className={`map-atmo-${region.atmosphere}`}>
        <PaintBack paint={() => paintAlleyBack(7, region.atmosphere, 'market')} cacheKey={`land-beco-${region.atmosphere}`} pad={ALLEY_PAD} size={896} y={-30} filter="brightness(1.25) saturate(1.3)" />
        <div className="q-glowlayer" style={{ background: 'radial-gradient(circle at 130px 120px, rgba(255, 40, 30, 0.38), transparent 210px), radial-gradient(circle at 650px 60px, rgba(150, 60, 255, 0.22), transparent 260px)' }} />
        <div className="q-rain" />
        <div className="q-floor" />
        <div className="q-keeper" aria-hidden="true">
          <NpcPortrait who="corvo" size={184} speaking={talking} />
        </div>
        <div className="q-counter" />
        <RivalSpeech key={line.key} text={line.text} voice="corvo" tail="left" linger={false} onMouth={setTalking} className="q-bubble" />

        <div className="q-topbar">
          <NovoLogo />
          <div className="q-wood q-title">
            <span className="q-nail" style={{ left: 4, top: 4 }} />
            <span className="q-nail" style={{ right: 4, top: 4 }} />
            <NovoHearts current={state.hearts.player} max={state.maxHearts.player} />
            <div className="q-money" style={{ fontFamily: 'var(--font-pixel)', fontSize: 11, color: '#ffe9a8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="q-coin" />${coins}
            </div>
            <h2 id="bm-title">MERCADO NEGRO</h2>
          </div>
          <button type="button" className="q-wood q-btn q-back" onClick={onLeave}>
            ◀ {leaveTitle.replace(/\s*→$/, '')}
          </button>
        </div>

        <div className="q-velvet">
          {offers.map((offer, index) => {
            const relic = getRelic(offer.id);
            const block = marketBuyBlock(state, offer);
            return (
              <button
                key={offer.id}
                type="button"
                className={`q-hang ${index === at ? 'q-sel' : ''} ${offer.sold ? 'q-sold' : ''} ${block === 'coins' && !offer.sold ? 'q-short' : ''}`}
                style={{ left: 10 + index * step }}
                onClick={() => setPick(index)}
                aria-pressed={index === at}
                aria-label={`${relic.name}: ${offer.sold ? 'vendido' : `${offer.price} moedas`}`}
                {...press({ kind: 'relic', id: offer.id, owner: 'market' })}
              >
                <div className="q-niche">{!offer.sold && <RelicIcon relic={relic} size={56} />}</div>
                <h4>
                  <span className="q-kind">{getRarity(relic.rarity).label}</span>
                  {relic.short}
                </h4>
                {offer.sold ? (
                  <span className="bm-tag-sold">VENDIDO</span>
                ) : (
                  <span className="q-price">
                    <span className="q-coin" />${offer.price}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {alert > 0 && (
          <p key={`alert-${alert}`} className="q-alert animate-shop-alert" role="alert">
            BOLSA CHEIA! VENDA UM TALISMÃ NA LOJA DO VALTINHO
          </p>
        )}

        {selRelic && (
          <div className="q-wood q-detail">
            {['tl', 'tr', 'bl', 'br'].map((c) => (
              <span key={c} className={`q-brass q-${c}`} style={{ borderColor: '#c8141c' }} />
            ))}
            <div className="q-big">{!selOffer.sold && <RelicIcon relic={selRelic} size={88} />}</div>
            <div className="q-text">
              <h3 className="q-inset">{selRelic.name.toUpperCase()}</h3>
              <span className="q-chip">TALISMÃ</span>
              <span className="q-chip" style={{ background: '#ff5a4a', color: '#2a0406' }}>
                {getRarity(selRelic.rarity).label}
              </span>
              <p>{selRelic.description}</p>
            </div>
            <div className="q-inset q-buy">
              <small>VAI PARA A BOLSA</small>
              <p className="q-slots">
                {state.relics.player.length} de {slots} espaços usados
              </p>
              <div className="q-inset q-total">
                <span className="q-coin" />${selOffer.price}
              </div>
              <button type="button" className="q-blood" disabled={selOffer.sold} onClick={() => buy(at)}>
                {selOffer.sold ? 'VENDIDO' : 'COMPRAR'}
              </button>
            </div>
          </div>
        )}

        <div key={`pouch-${alert}`} className={`q-wood q-bag ${alert ? 'animate-hotbar-full' : ''}`} aria-label="Seus talismãs">
          <h3>
            SUA BOLSA · {state.relics.player.length}/{slots}
          </h3>
          <div className="q-inset q-grid" style={{ gridTemplateColumns: `repeat(${Math.max(slots, 4)}, minmax(0, 1fr))` }}>
            {Array.from({ length: Math.max(slots, 4) }, (_, i) => {
              const relic = getRelic(state.relics.player[i]);
              return (
                <div key={relic?.id ?? `empty-${i}`} className="q-inset q-cell" {...(relic ? press({ kind: 'relic', id: relic.id, owner: 'player' }) : {})}>
                  {relic && <RelicIcon relic={relic} size={30} />}
                </div>
              );
            })}
          </div>
          <p>O Corvo não compra nada.</p>
        </div>
      </NovoStage>
    );
  }
  if (landscape) {
    const slots = relicSlotsFor(state);
    return (
      <div className={`bm-land map-atmo-${region.atmosphere}`} role="dialog" aria-modal="true" aria-labelledby="bm-title">
        <LandStage paint={() => paintAlleyBack(7, region.atmosphere, 'market')} cacheKey={`land-beco-${region.atmosphere}`} pad={ALLEY_PAD} bleed="#07060a" label="Mercado Negro" role="presentation">
          <span className="bl-rain" aria-hidden="true" />
          <h1 id="bm-title" className="bl-neon">
            MERCADO NEGRO
            <span>BECO DO CORVO DA MADRUGADA</span>
          </h1>
          <span className="sl-cash" aria-label={`Seu saldo: ${coins} moedas`}>
            <CoinCount value={coins} className="text-[16px]" />
          </span>

          {/* o Corvo na porta, de olhos vermelhos */}
          <div className="bl-npc" aria-hidden="true">
            <NpcPortrait who="corvo" size={204} speaking={talking} />
          </div>
          <RivalSpeech key={line.key} text={line.text} voice="corvo" tail="down" tailX="50%" linger={false} onMouth={setTalking} className="bl-speech" />
          <span className="bl-fog" aria-hidden="true" />

          {/* o forro do sobretudo: os talismãs pendurados nas presilhas */}
          <ul className="bl-goods" aria-label="Talismãs Necróticos à venda">
            {market.offers.map((offer, index) => {
              const relic = getRelic(offer.id);
              const tier = getRarity(relic.rarity);
              const block = marketBuyBlock(state, offer);
              return (
                <li key={offer.id} style={{ '--rarity': tier.color, '--swing-delay': `${-index * 0.7}s` }}>
                  <button
                    type="button"
                    className={`scene-tap bl-good ${offer.sold ? 'is-sold' : ''} ${block === 'coins' && !offer.sold ? 'is-short' : ''}`}
                    onClick={() => buy(index)}
                    aria-label={offer.sold ? `${relic.name}: vendido` : `Comprar ${relic.name} (necrótico) por ${offer.price} moedas: ${relic.description}`}
                    {...press({ kind: 'relic', id: offer.id, owner: 'market' })}
                  >
                    <span className="bl-string" aria-hidden="true" />
                    <span className="bl-good-art" aria-hidden="true">
                      {!offer.sold && <RelicIcon relic={relic} size={58} />}
                    </span>
                    <span className="bl-tag">
                      <span className="bl-tag-rarity">{tier.label}</span>
                      <span className="bl-tag-name">{relic.short}</span>
                      {offer.sold ? (
                        <span className="bm-tag-sold">VENDIDO</span>
                      ) : (
                        <span className="bl-price">
                          <CoinGlyph size={12} />${offer.price}
                        </span>
                      )}
                    </span>
                  </button>
                  {!offer.sold && <p className="bl-desc">{relic.description}</p>}
                </li>
              );
            })}
          </ul>

          {/* a sua bolsa (aqui só se compra) e a saída */}
          <div key={`pouch-${alert}`} className={`sl-pouch bl-pouch ${alert ? 'animate-hotbar-full' : ''}`} aria-label="Seus talismãs">
            <p className="sl-pouch-label">
              SUA BOLSA {state.relics.player.length}/{slots} <span>· o Corvo não compra nada</span>
            </p>
            <div className="sl-niches">
              {Array.from({ length: slots }, (_, i) => {
                const relic = getRelic(state.relics.player[i]);
                return (
                  <span key={relic?.id ?? `empty-${i}`} className={`sl-niche ${relic ? '' : 'is-empty'}`} {...(relic ? press({ kind: 'relic', id: relic.id, owner: 'player' }) : {})}>
                    <ShopSprite name="nicho" scale={2.2} />
                    {relic && (
                      <span className="sl-niche-relic">
                        <RelicIcon relic={relic} size={36} />
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
          {alert > 0 && (
            <p key={`alert-${alert}`} className="shop-alert animate-shop-alert sl-alert" role="alert">
              BOLSA CHEIA! VENDA UM TALISMÃ NA LOJA DO VALTINHO
            </p>
          )}
          <DominoKey label={leaveTitle.replace(/\s*→$/, '')} note={leaveNote?.toLowerCase()} pips={2} tone="blood" w={290} h={62} className="sl-leave" onClick={onLeave} />
        </LandStage>
      </div>
    );
  }

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
