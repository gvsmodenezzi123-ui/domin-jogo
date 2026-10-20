import { useState } from 'react';
import { regionOf } from '../data/campaign.js';
import { ENHANCEMENTS } from '../data/enhancedTiles.js';
import { getRarity } from '../data/rarities.js';
import { RELIC_SLOTS, getRelic } from '../data/relics.js';
import { getRival } from '../data/rivals.js';
import { haptic } from '../engine/progress.js';
import { relicBuyBlock, sellPriceOf, tileBuyBlock } from '../engine/shop.js';
import CoinCount from './CoinCount.jsx';
import DominoTile from './DominoTile.jsx';
import Hotbar from './Hotbar.jsx';
import PixelSprite from './PixelSprite.jsx';
import RivalAvatar from './RivalAvatar.jsx';

function RarityBadge({ rarity }) {
  const tier = getRarity(rarity);
  return (
    <span className={`rarity-badge ${tier.id === 'mitico' ? 'rarity-badge-mythic' : ''}`} style={{ '--rarity': tier.color }}>
      {tier.label}
    </span>
  );
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

const tileLabel = (tileId) => {
  const [a, b] = tileId.split('-');
  return `[${a}|${b}]`;
};

/**
 * Loja Clandestina (depois de cada nó vencido), em grade:
 *   topo      saldo + a sua hotbar (toque para vender)
 *   em cima   3 talismãs em cartas quadradas
 *   embaixo   2 peças de grife em cartas largas, com o material animado
 * Segurar uma carta mostra o efeito. Reembaralhar sobe de preço a cada uso.
 */
export default function Shop({ state, onBuyRelic, onBuyTile, onSell, onReroll, onLeave, press }) {
  const [sellId, setSellId] = useState(null);
  const [alert, setAlert] = useState(0);
  const { shop } = state;
  const coins = state.coins.player;
  const full = state.relics.player.length >= RELIC_SLOTS;
  const nextRival = getRival(shop.nextRivalId);
  const region = regionOf(state.run.node);
  const coinFx = lastShopCoins(state.events);
  const upgraded = Object.entries(state.decks.player);
  const selling = sellId ? getRelic(sellId) : null;

  const buyRelic = (index) => {
    const block = relicBuyBlock(state, shop.relics[index]);
    if (block === 'full') {
      setAlert((n) => n + 1);
      haptic([30, 40, 30]);
      return;
    }
    if (!block) onBuyRelic(index);
  };

  const confirmSell = () => {
    onSell(sellId);
    setSellId(null);
  };

  return (
    <div className={`shop-screen map-atmo-${region.atmosphere} fixed inset-0 z-[55] overflow-y-auto`} role="dialog" aria-modal="true" aria-labelledby="shop-title">
      <div
        className="mx-auto flex min-h-full w-full max-w-[460px] flex-col px-3"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 10px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
        }}
      >
        {/* topo: título, saldo e hotbar */}
        <div className="shop-panel px-3 pb-2.5 pt-2.5">
          <div className="flex items-center justify-between gap-2">
            <h1 id="shop-title" className="font-pixel text-[11px] leading-snug text-bone-50 text-shadow-pixel">
              LOJA CLANDESTINA
              <span className="block text-[7px] text-brass-300">{region.name}</span>
            </h1>
            <span className="relative shrink-0">
              <CoinCount value={coins} className="text-[14px]" />
              {coinFx && (
                <span
                  key={coinFx.seq}
                  className={`coin-float absolute right-0 top-0 font-pixel text-[10px] ${coinFx.amount > 0 ? 'text-[#9fe08a]' : 'text-blood-400'}`}
                >
                  {coinFx.amount > 0 ? `+$${coinFx.amount}` : `−$${-coinFx.amount}`}
                </span>
              )}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="font-pixel text-[7px] leading-relaxed text-bone-400">
              SEUS TALISMÃS {state.relics.player.length}/{RELIC_SLOTS}
              <span className="block text-bone-200">TOQUE PARA VENDER</span>
            </p>
            <Hotbar
              key={`hotbar-${alert}`}
              relics={state.relics.player}
              size={38}
              press={press}
              onTap={setSellId}
              label="Seus talismãs (toque para vender)"
              className={alert ? 'animate-hotbar-full' : ''}
            />
          </div>
          {alert > 0 && (
            <p key={`alert-${alert}`} className="shop-alert animate-shop-alert mt-2 px-2 py-1.5 text-center font-pixel text-[8px] leading-relaxed" role="alert">
              HOTBAR CHEIA! VENDA UM TALISMÃ ANTES
            </p>
          )}
        </div>

        {/* talismãs: 3 cartas quadradas */}
        <section className="mt-2.5" aria-labelledby="shop-relics">
          <h2 id="shop-relics" className="shop-label">
            TALISMÃS
          </h2>
          <ul className="mt-1.5 grid grid-cols-3 gap-2">
            {shop.relics.map((offer, index) => {
              const relic = getRelic(offer.id);
              const block = relicBuyBlock(state, offer);
              const tier = getRarity(relic.rarity);
              return (
                <li
                  key={`${offer.id}-${shop.rerolls}`}
                  className={`shop-card ${offer.sold ? 'shop-item-sold' : ''} ${tier.id === 'mitico' ? 'shop-item-mythic' : ''}`}
                  style={{ '--rarity': tier.color }}
                  {...press({ kind: 'relic', id: offer.id, owner: 'shop' })}
                >
                  <span className="shop-card-icon">
                    <PixelSprite rows={relic.icon} palette={relic.palette} pixel={3} />
                  </span>
                  <p className="shop-card-name font-pixel">{relic.short}</p>
                  <RarityBadge rarity={relic.rarity} />
                  <button
                    type="button"
                    data-tone={block === 'coins' || offer.sold ? undefined : 'brass'}
                    className="btn-pixel btn-buy mt-auto w-full"
                    disabled={offer.sold || block === 'coins'}
                    onClick={() => buyRelic(index)}
                    aria-label={offer.sold ? `${relic.name}: vendido` : `Comprar ${relic.name} por ${offer.price} moedas`}
                  >
                    {offer.sold ? 'VENDIDO' : `$${offer.price}`}
                    {!offer.sold && full && <span className="block text-[6px] text-blood-700">CHEIA</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* peças de grife: 2 cartas largas */}
        <section className="mt-2.5" aria-labelledby="shop-tiles">
          <h2 id="shop-tiles" className="shop-label">
            PEÇAS DE GRIFE
          </h2>
          <ul className="mt-1.5 grid grid-cols-2 gap-2">
            {shop.tiles.map((offer, index) => {
              const enhancement = ENHANCEMENTS[offer.enhancement];
              const [a, b] = offer.tileId.split('-').map(Number);
              const block = tileBuyBlock(state, offer);
              const tier = getRarity(enhancement.rarity);
              const label = tileLabel(offer.tileId);
              return (
                <li
                  key={`${offer.tileId}-${shop.rerolls}`}
                  className={`shop-card shop-card-wide ${offer.sold ? 'shop-item-sold' : ''} ${tier.id === 'mitico' ? 'shop-item-mythic' : ''}`}
                  style={{ '--rarity': tier.color }}
                  {...press({ kind: 'offerTile', tileId: offer.tileId, enhancement: offer.enhancement })}
                >
                  <div className="flex w-full items-center gap-2.5">
                    <span className="shop-tile-stage">
                      <DominoTile values={[a, b]} unit={21} depth={3} enhancement={offer.enhancement} />
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="font-pixel text-[8px] leading-snug text-bone-50">{enhancement.name.toUpperCase()}</p>
                      <RarityBadge rarity={enhancement.rarity} />
                      <p className="mt-1 font-term text-[15px] leading-[1.05] text-brass-300">Substitui {label}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-tone={block ? undefined : 'brass'}
                    className="btn-pixel btn-buy mt-2 w-full"
                    disabled={Boolean(block)}
                    onClick={() => onBuyTile(index)}
                    aria-label={offer.sold ? `${label} de ${enhancement.name}: vendido` : `Comprar ${label} de ${enhancement.name} por ${offer.price} moedas`}
                  >
                    {offer.sold ? 'VENDIDO' : `$${offer.price}`}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <button type="button" className="btn-pixel mt-2.5 w-full" disabled={coins < shop.rerollCost} onClick={onReroll}>
          REEMBARALHAR · ${shop.rerollCost}
        </button>

        <div className="mt-2.5 flex items-center gap-2">
          <span className="shrink-0 font-pixel text-[7px] leading-relaxed text-bone-400">
            SEU BARALHO
            <span className="block text-bone-200">28 · {upgraded.length} DE GRIFE</span>
          </span>
          <div className="flex min-w-0 flex-wrap gap-1">
            {upgraded.map(([tileId, enhancement]) => {
              const [a, b] = tileId.split('-').map(Number);
              return (
                <span key={tileId} {...press({ kind: 'offerTile', tileId, enhancement })}>
                  <DominoTile values={[a, b]} unit={10} depth={1} enhancement={enhancement} />
                </span>
              );
            })}
          </div>
        </div>

        <div className="mt-auto pt-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className="avatar-frame shrink-0">
              <RivalAvatar rival={nextRival} mood="smug" pixel={2} />
            </div>
            <div className="min-w-0">
              <p className="font-pixel text-[7px] text-bone-400">PRÓXIMO NÓ{nextRival.boss ? ' · CHEFE' : ''}</p>
              <p className="mt-1 truncate font-pixel text-[9px] text-bone-50">{nextRival.name.toUpperCase()}</p>
              <p className="truncate font-term text-[15px] leading-none text-bone-300">
                {nextRival.title} · {nextRival.hearts}♥
              </p>
            </div>
          </div>
          <button type="button" data-tone="blood" className="btn-pixel mt-2.5 w-full text-[11px]" onClick={onLeave}>
            VOLTAR AO MAPA →
          </button>
        </div>
      </div>

      {selling && (
        <div className="overlay-backdrop fixed inset-0 z-[70] flex items-center justify-center px-8" role="dialog" aria-modal="true" aria-labelledby="sell-title">
          <div className="overlay-card w-full max-w-[280px] px-4 py-4 text-center">
            <div className="mx-auto w-fit">
              <PixelSprite rows={selling.icon} palette={selling.palette} pixel={3} />
            </div>
            <p id="sell-title" className="mt-2 font-pixel text-[9px] leading-snug text-bone-50">
              {selling.name.toUpperCase()}
            </p>
            <p className="mt-1">
              <RarityBadge rarity={selling.rarity} />
            </p>
            <div className="mt-3 grid gap-2">
              <button type="button" data-tone="blood" className="btn-pixel" onClick={confirmSell}>
                VENDER POR ${sellPriceOf(selling.id)}?
              </button>
              <button type="button" className="btn-pixel" onClick={() => setSellId(null)}>
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
