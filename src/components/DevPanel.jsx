import { useState } from 'react';
import { ENHANCEMENTS, ENHANCEMENT_IDS } from '../data/enhancedTiles.js';
import { getRarity } from '../data/rarities.js';
import { RELICS, RELIC_IDS } from '../data/relics.js';
import { maletaOf } from '../data/maletas.js';
import { challengeOf } from '../data/meta.js';
import { relicSlotsFor } from '../engine/loadout.js';
import { REGIONS } from '../data/campaign.js';
import { RIVALS } from '../data/rivals.js';
import DominoTile from './DominoTile.jsx';
import RelicIcon from './RelicIcon.jsx';

const PIPS = [0, 1, 2, 3, 4, 5, 6];

function PipPicker({ label, value, onChange }) {
  return (
    <div>
      <span className="dev-label">{label}</span>
      <div className="mt-1 grid grid-cols-7 gap-1" role="group" aria-label={label}>
        {PIPS.map((n) => (
          <button key={n} type="button" className="dev-num" aria-pressed={value === n} onClick={() => onChange(n)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Painel de testes (secreto). Abre com 3 toques em "VOCÊ" (ou no título da tela
 * inicial, que libera o botão DEV ao lado da sua hotbar). O rival espera
 * enquanto o painel está aberto.
 */
export default function DevPanel({ state, onAction, onClose, blackUnlocked = false, onToggleBlack }) {
  const [a, setA] = useState(6);
  const [b, setB] = useState(6);
  const [enhancement, setEnhancement] = useState('nenhuma');
  const playing = state.phase === 'playing';
  const dev = (op, extra = {}) => onAction({ type: 'DEV', op, ...extra });
  const mine = state.relics.player;
  const slots = relicSlotsFor(state);
  const full = mine.length >= slots;

  return (
    <div className="overlay-backdrop fixed inset-0 z-[80] flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby="dev-title">
      <div
        className="dev-card w-full max-w-[460px] overflow-y-auto px-4 pt-4"
        style={{ maxHeight: '90%', paddingBottom: 'max(env(safe-area-inset-bottom), 14px)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="dev-title" className="font-pixel text-[12px] text-[#bdf5da]">
              PAINEL DEV
            </h2>
            <p className="mt-1 font-term text-base leading-none text-bone-400">
              nó {state.run.node ?? '—'} · partida {state.run.match} · rodada {state.round} · vez: {state.turn === 'player' ? 'você' : 'rival'} · {state.phase}
            </p>
          </div>
          <button type="button" className="btn-pixel btn-mini" onClick={onClose}>
            FECHAR
          </button>
        </div>

        <section className="dev-section mt-3 pt-3" aria-labelledby="dev-tiles">
          <h3 id="dev-tiles" className="dev-label">
            GERAR PEDRA
          </h3>
          <div className="mt-2 flex gap-3">
            <div className="grid flex-1 gap-2">
              <PipPicker label="LADO A" value={a} onChange={setA} />
              <PipPicker label="LADO B" value={b} onChange={setB} />
            </div>
            <div className="flex w-[64px] shrink-0 items-center justify-center">
              <DominoTile
                values={[a, b]}
                unit={26}
                depth={3}
                enhancement={enhancement === 'nenhuma' ? null : enhancement}
              />
            </div>
          </div>
          <label className="mt-2 block">
            <span className="dev-label">APRIMORAMENTO</span>
            <select className="dev-select mt-1" value={enhancement} onChange={(e) => setEnhancement(e.target.value)}>
              <option value="nenhuma">Nenhuma</option>
              {ENHANCEMENT_IDS.map((id) => (
                <option key={id} value={id}>
                  {ENHANCEMENTS[id].name}
                </option>
              ))}
            </select>
          </label>
          {enhancement !== 'nenhuma' && (
            <p className="mt-1 font-term text-[15px] leading-tight text-bone-300">{ENHANCEMENTS[enhancement].description}</p>
          )}
          <button
            type="button"
            data-tone="brass"
            className="btn-pixel mt-2 w-full"
            disabled={!playing}
            onClick={() => dev('addTile', { a, b, enhancement })}
          >
            ADICIONAR À MÃO
          </button>
        </section>

        <section className="dev-section mt-3 pt-3" aria-labelledby="dev-relics">
          <h3 id="dev-relics" className="dev-label">
            TALISMÃS {mine.length}/{slots}
          </h3>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {RELIC_IDS.map((id) => {
              const relic = RELICS[id];
              const on = mine.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  className="dev-relic"
                  style={{ '--rarity': getRarity(relic.rarity).color }}
                  aria-pressed={on}
                  disabled={!on && full}
                  title={relic.description}
                  onClick={() => dev('toggleRelic', { id })}
                >
                  <RelicIcon relic={relic} size={24} className="shrink-0" />
                  <span className="min-w-0">{relic.short}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="dev-section mt-3 pt-3" aria-labelledby="dev-rival">
          <h3 id="dev-rival" className="dev-label">
            PULAR PARA O NÓ (RIVAL)
          </h3>
          <label className="mt-1 block">
            <span className="sr-only">Trocar rival</span>
            <select
              className="dev-select"
              value={state.rivalId}
              onChange={(e) => onAction({ type: 'DEV', op: 'setRival', rivalId: e.target.value })}
            >
              {REGIONS.map((region) => (
                <optgroup key={region.id} label={`${region.id}. ${region.name}`}>
                  {region.nodes.map((id, i) => (
                    <option key={id} value={id}>
                      {i + 1}. {RIVALS[id].name} — {RIVALS[id].title}
                      {i === region.nodes.length - 1 ? ' (CHEFE)' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
              <optgroup label="Secreto">
                <option value="donoDaNoite">19. {RIVALS.donoDaNoite.name} — {RIVALS.donoDaNoite.title}</option>
              </optgroup>
            </select>
          </label>
          <button type="button" data-tone="brass" className="btn-pixel mt-2 w-full" disabled={!playing} onClick={() => dev('winMatch')}>
            VENCER O NÓ (VOLTA AO MAPA)
          </button>
        </section>

        <section className="dev-section mt-3 pt-3" aria-labelledby="dev-stops">
          <h3 id="dev-stops" className="dev-label">
            ENTRAR DIRETO (REGIÃO ATUAL)
          </h3>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button type="button" data-tone="shop" className="btn-pixel btn-mini" onClick={() => dev('openStop', { kind: 'shop' })}>
              LOJA DO VALTINHO
            </button>
            <button type="button" data-tone="blood" className="btn-pixel btn-mini" onClick={() => dev('openStop', { kind: 'black' })}>
              MERCADO NEGRO
            </button>
            <button type="button" data-tone="play" className="btn-pixel btn-mini" onClick={() => dev('openStop', { kind: 'coins' })}>
              SEU TIÃO
            </button>
          </div>
        </section>

        <section className="dev-section mt-3 pt-3" aria-labelledby="dev-mode">
          <h3 id="dev-mode" className="dev-label">
            ESTA RUN: {maletaOf(state.maleta).short} · {state.mode === 'hard' ? 'PEÇAS PRETAS' : 'PEÇAS BRANCAS'}
            {state.challenge ? ` · ${challengeOf(state.challenge).name.toUpperCase()}` : ''}
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" data-tone={blackUnlocked ? 'blood' : 'brass'} className="btn-pixel btn-mini" onClick={onToggleBlack}>
              {blackUnlocked ? 'TRANCAR PEÇAS PRETAS' : 'LIBERAR PEÇAS PRETAS'}
            </button>
            <button type="button" data-tone="brass" className="btn-pixel btn-mini" onClick={() => onAction({ op: 'capsAdd' })}>
              +10 TAMPINHAS
            </button>
            <button type="button" data-tone="play" className="btn-pixel btn-mini" onClick={() => onAction({ op: 'metaUnlockAll' })}>
              LIBERAR MALETAS E DESAFIOS
            </button>
            <button type="button" data-tone="blood" className="btn-pixel btn-mini" onClick={() => onAction({ op: 'metaReset' })}>
              ZERAR TAMPINHAS E META
            </button>
          </div>
          <button type="button" data-tone="blood" className="btn-pixel btn-mini mt-2 w-full" onClick={() => dev('secretReveal')}>
            REVELAR O DONO DA NOITE (NÓ 19)
          </button>
        </section>

        <section className="dev-section mt-3 pt-3" aria-labelledby="dev-ach">
          <h3 id="dev-ach" className="dev-label">
            CONQUISTAS · {state.unlocks.length}/10 TALISMÃS LIBERADOS
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" data-tone="brass" className="btn-pixel btn-mini" disabled={state.unlocks.length >= 10} onClick={() => onAction({ op: 'achievementNext' })}>
              LIBERAR A PRÓXIMA
            </button>
            <button type="button" data-tone="blood" className="btn-pixel btn-mini" onClick={() => onAction({ op: 'achievementReset' })}>
              ZERAR CONQUISTAS
            </button>
          </div>
        </section>

        <section className="dev-section mt-3 pt-3" aria-labelledby="dev-res">
          <h3 id="dev-res" className="dev-label">
            RECURSOS E MESA
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" className="btn-pixel" onClick={() => dev('addCoins', { amount: 10 })}>
              +10 MOEDAS
            </button>
            <button type="button" className="btn-pixel" onClick={() => dev('resetHearts')}>
              RESETAR VIDAS
            </button>
            <button type="button" data-tone="blood" className="btn-pixel" disabled={!playing} onClick={() => dev('damageTioZe')}>
              −1 VIDA RIVAL
            </button>
            <button type="button" className="btn-pixel" disabled={!playing} onClick={() => dev('emptyTioZeHand')}>
              ESVAZIAR MÃO DO RIVAL
            </button>
            <button type="button" className="btn-pixel" disabled={!playing} onClick={() => dev('clearBoard')}>
              LIMPAR MESA
            </button>
            <button type="button" data-tone="blood" className="btn-pixel" disabled={!playing} onClick={() => dev('forceTranca')}>
              FORÇAR TRANCA
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
