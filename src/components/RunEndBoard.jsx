import { useSyncExternalStore } from 'react';
import { UPGRADES, UPGRADE_IDS } from '../data/meta.js';
import { sound } from '../engine/audioSynth.js';
import { buyUpgrade, loadGoldCaps, loadUpgrades, subscribeMeta } from '../engine/meta.js';
import { haptic } from '../engine/progress.js';
import { BottleCapIcon } from './ArtSprites.jsx';

const upgradesKey = () => loadUpgrades().join(',');

function Caps({ value, className = '' }) {
  return (
    <span className={`caps-count ${className}`}>
      <BottleCapIcon className="caps-icon" />
      {value}
    </span>
  );
}

/**
 * "A Conta do Boteco" (Patch 0.8.0): a lousa que abre sozinha no fim de toda run, perdida
 * ou vencida. Mostra as Tampinhas Douradas que a run rendeu, o saldo e as 4 melhorias
 * permanentes para comprar ali mesmo (engine/meta.js grava). TENTAR NOVAMENTE leva direto ao
 * Balcão de Maletas, já com os bônus valendo.
 */
export default function RunEndBoard({ runCaps = 0, onRetry, onMenu }) {
  const caps = useSyncExternalStore(subscribeMeta, loadGoldCaps, () => 0);
  const ownedKey = useSyncExternalStore(subscribeMeta, upgradesKey, () => '');
  const owned = ownedKey ? ownedKey.split(',') : [];

  const buy = (id) => {
    const result = buyUpgrade(id);
    if (!result.ok) return;
    sound.playPurchase();
    haptic([20, 30, 40]);
  };

  return (
    <section className="run-tab mt-4" aria-labelledby="tab-title">
      <div className="run-tab-earned">
        <span className="chalk-dim font-pixel text-[7px]">TAMPINHAS DESTA RUN</span>
        <Caps value={`+${runCaps}`} className="run-tab-gain" />
      </div>
      <div className="chalkboard run-tab-board px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 id="tab-title" className="chalk-text font-pixel text-[11px]">
            A CONTA DO BOTECO
          </h3>
          <Caps value={caps} className="run-tab-balance" />
        </div>
        <div className="chalk-line mt-2" aria-hidden="true" />
        <ul className="mt-2 grid gap-2">
          {UPGRADE_IDS.map((id) => {
            const upgrade = UPGRADES[id];
            const has = owned.includes(id);
            const short = !has && caps < upgrade.cost;
            return (
              <li key={id} className={`run-tab-item ${has ? 'is-owned' : ''}`}>
                <div className="min-w-0 flex-1 text-left">
                  <p className="chalk-text font-pixel text-[8px] leading-snug">{upgrade.name.toUpperCase()}</p>
                  <p className="chalk-dim font-term text-[16px] leading-[1.05]">{upgrade.description}</p>
                </div>
                {has ? (
                  <span className="run-tab-owned font-pixel">NA CONTA ✓</span>
                ) : (
                  <button
                    type="button"
                    data-tone="brass"
                    className="btn-pixel btn-mini run-tab-buy"
                    disabled={short}
                    onClick={() => buy(id)}
                    aria-label={`Comprar ${upgrade.name} por ${upgrade.cost} tampinhas`}
                  >
                    <Caps value={upgrade.cost} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <button type="button" data-tone="play" className="btn-pixel mt-4 w-full" onClick={onRetry}>
        TENTAR NOVAMENTE
      </button>
      <button type="button" className="text-action mt-2 font-pixel text-[9px] text-bone-300" onClick={onMenu}>
        MENU
      </button>
    </section>
  );
}
