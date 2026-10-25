/**
 * Patch PvP: som, tremida e balões da mesa online (os mesmos do solo, ver App.jsx), lidos dos
 * eventos do estado que cada um vê. Fica separado do App para a mesa solo não mudar nada.
 */

import { centerOf } from '../components/useFloats.js';
import { prefersReducedMotion } from '../components/motion.js';
import { sound } from '../engine/audioSynth.js';
import { haptic } from '../engine/progress.js';

/** Atraso (ms) de cada som dentro de um mesmo lote de eventos. */
export const FX_DELAY = {
  drawTile: 0,
  drawPeek: 0,
  pass: 0,
  noMoves: 240,
  discard: 0,
  proc: 90,
  callout: 60,
  bonus5: 140,
  roundEnd: 260,
  heartLost: 560,
  duelEnd: 1300,
};

export function shake(element, strength = 6, duration = 380) {
  if (!element?.animate || prefersReducedMotion()) return;
  element.animate(
    [
      { transform: 'translate(0, 0)' },
      { transform: `translate(${-strength}px, ${strength / 3}px)` },
      { transform: `translate(${strength}px, ${-strength / 3}px)` },
      { transform: `translate(${-strength / 2}px, 0)` },
      { transform: `translate(${strength / 2}px, ${strength / 4}px)` },
      { transform: 'translate(0, 0)' },
    ],
    { duration, easing: 'steps(6, end)' },
  );
}

/** Som e tremida de cada evento (`offset`: espera o voo da pedra). Devolve os timers. */
export function runEventFx(ev, shell, offset = 0) {
  const timers = [];
  const at = (fn, extra = 0) => timers.push(setTimeout(fn, offset + (FX_DELAY[ev.type] ?? 0) + extra));
  switch (ev.type) {
    case 'drawTile':
    case 'drawPeek':
      at(() => sound.playDraw());
      break;
    case 'pass':
      if (!ev.forced) at(() => sound.playPass());
      break;
    case 'noMoves':
      at(() => {
        sound.playNoMoves();
        if (ev.by === 'player') haptic([40, 60, 40]);
      });
      break;
    case 'discard':
      at(() => sound.playPass());
      break;
    case 'bonus5':
      at(() => sound.playCoinJingle());
      break;
    case 'proc':
      at(() => sound.playChime(ev.tone));
      break;
    case 'callout':
      at(() => sound.playChime(ev.by === 'player' ? 'player' : 'enemy'));
      break;
    case 'canivete':
      at(() => sound.playAnvil());
      break;
    case 'roundEnd':
      at(() => (ev.result?.kind === 'tranca' ? sound.playLock() : sound.playTileSlam(true)));
      break;
    case 'heartLost':
      at(() => {
        sound.playHeartHit();
        if (ev.who === 'player') {
          shake(shell, ev.amount >= 2 ? 9 : 6);
          haptic(ev.amount >= 2 ? [70, 40, 90] : 60);
        }
      });
      if (ev.reason !== 'draw' && !ev.direct) at(() => (ev.who === 'tioZe' ? sound.playRoundWin() : sound.playRoundLose()), 1150 - FX_DELAY.heartLost);
      break;
    case 'duelEnd':
      at(() => (ev.winner === 'player' ? sound.playVictory() : sound.playDefeat()));
      break;
    default:
      break;
  }
  return timers;
}

/** De onde sai o aviso de um disparo: o slot do talismã, a pedra na mesa ou o retrato do outro. */
export function procOrigin(ev, tileId, table) {
  if (ev.source === 'relic') {
    const slot = centerOf(`[data-relic-slot="${ev.owner ?? 'player'}:${ev.id}"]`);
    if (slot) return { x: slot.x, y: slot.y - 14 };
  }
  if (ev.source === 'clock') {
    const chip = centerOf('[data-turn-clock]');
    if (chip) return { x: chip.x, y: chip.y + 22 };
  }
  if (ev.owner === 'tioZe') {
    const avatar = centerOf('[data-rival-avatar]');
    if (avatar) return { x: Math.min(avatar.x + 70, window.innerWidth - 90), y: avatar.y + 40 };
  }
  if (tileId) {
    const tile = centerOf(`[data-tile-id="${tileId}"]`);
    if (tile) return tile;
  }
  const felt = table?.getBoundingClientRect();
  return felt ? { x: felt.left + felt.width / 2, y: felt.top + felt.height * 0.3 } : null;
}

/** Último disparo de cada talismã no duelo, por dono: o slot pisca quando muda. */
export function deriveRelicFlashes(events) {
  const flashes = { player: {}, tioZe: {} };
  for (const ev of events) {
    if (ev.type === 'proc' && ev.source === 'relic') flashes[ev.owner === 'tioZe' ? 'tioZe' : 'player'][ev.id] = ev.seq;
  }
  return flashes;
}

export const tileName = (tileId) => {
  const [a, b] = String(tileId).split('#')[0].split('-');
  return `[${a}|${b}]`;
};

/** Contagem de dano recebido (o retrato pisca a cada um). */
export const hurtKeyOf = (events, seat) => events.filter((e) => e.type === 'heartLost' && e.who === seat).reduce((n, e) => Math.max(n, e.seq), 0);
