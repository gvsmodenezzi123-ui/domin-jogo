// Versão 2.0: o "juice" da partida, direto no DOM (fora do React, para não redesenhar a mesa):
// números dourados gigantes, chuva de moedas voando até o contador, faíscas da tranca, clarão
// da bucha, tremida lateral, congelamento (hitstop) e a explosão de moedas da vitória.
// Só transform e opacity animam (Web Animations API, na GPU): segura os 60 FPS do iPhone.
import { prefersReducedMotion } from './motion.js';
import { paintCoin, paintSpark } from './art/tablePixels.js';

let layer = null;
/** A camada fixa, sem toque, por cima de tudo, onde os efeitos voam. */
function juiceLayer() {
  if (typeof document === 'undefined') return null;
  if (layer?.isConnected) return layer;
  layer = document.createElement('div');
  layer.className = 'juice-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  return layer;
}

const urls = {};
/** A moeda e a faísca em pixel art viram PNG uma vez só (data URL). */
function spriteUrl(name) {
  if (urls[name] !== undefined) return urls[name];
  urls[name] = '';
  try {
    const painted = name === 'coin' ? paintCoin() : paintSpark();
    const canvas = document.createElement('canvas');
    canvas.width = painted.w;
    canvas.height = painted.h;
    canvas.getContext('2d').putImageData(new ImageData(painted.data, painted.w, painted.h), 0, 0);
    urls[name] = canvas.toDataURL('image/png');
  } catch {
    // sem canvas: o efeito sai sem a moeda (o número dourado ainda aparece)
  }
  return urls[name];
}

const off = () => typeof document === 'undefined' || prefersReducedMotion();

function sprite(name, size, x, y) {
  const el = document.createElement('span');
  el.className = `juice-sprite juice-${name}`;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.left = `${x - size / 2}px`;
  el.style.top = `${y - size / 2}px`;
  const url = spriteUrl(name);
  if (url) el.style.backgroundImage = `url(${url})`;
  return el;
}

/** Some com o elemento quando a animação acaba (ou cancela). */
function dropAfter(anim, el) {
  const remove = () => el.remove();
  anim.onfinish = remove;
  anim.oncancel = remove;
}

/** Tremida só para os lados (a bucha): `px` de amplitude, curtinha. */
export function lateralShake(el, px = 3, ms = 200) {
  if (!el?.animate || off()) return;
  el.animate(
    [
      { transform: 'translate3d(0, 0, 0)' },
      { transform: `translate3d(${-px}px, 0, 0)` },
      { transform: `translate3d(${px}px, 0, 0)` },
      { transform: `translate3d(${-px * 0.66}px, 0, 0)` },
      { transform: `translate3d(${px * 0.33}px, 0, 0)` },
      { transform: 'translate3d(0, 0, 0)' },
    ],
    { duration: ms, easing: 'steps(5, end)' },
  );
}

/** Clarão rápido por cima de `el` (a mesa): uma camada branca/dourada que some em `ms`. */
export function flashOver(el, { color = 'rgba(255, 246, 214, 0.55)', ms = 170 } = {}) {
  if (!el || off()) return;
  const flash = document.createElement('span');
  flash.className = 'juice-flash';
  flash.style.background = color;
  el.appendChild(flash);
  const anim = flash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: 'ease-out' });
  dropAfter(anim, flash);
}

/** O número dourado gigante que pula na pedra (escala 1,5 → 1,0) e sobe sumindo. */
export function goldPop(at, text, { tone = 'player' } = {}) {
  const root = juiceLayer();
  if (!root || !at || off()) return;
  const el = document.createElement('span');
  el.className = 'juice-gold';
  el.dataset.tone = tone;
  el.textContent = text;
  el.style.left = `${at.x}px`;
  el.style.top = `${at.y}px`;
  root.appendChild(el);
  const anim = el.animate(
    [
      { transform: 'translate(-50%, -50%) scale(1.5)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(1.5)', opacity: 1, offset: 0.06 },
      { transform: 'translate(-50%, -50%) scale(0.94)', opacity: 1, offset: 0.24 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.34 },
      { transform: 'translate(-50%, calc(-50% - 10px)) scale(1)', opacity: 1, offset: 0.72 },
      { transform: 'translate(-50%, calc(-50% - 30px)) scale(0.9)', opacity: 0 },
    ],
    { duration: 950, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
  );
  dropAfter(anim, el);
}

/** O contador que recebe as moedas dá um pulo dourado. */
export function pulse(el) {
  if (!el?.animate || off()) return;
  el.animate(
    [
      { transform: 'scale(1)', filter: 'brightness(1)' },
      { transform: 'scale(1.28)', filter: 'brightness(1.6)', offset: 0.35 },
      { transform: 'scale(1)', filter: 'brightness(1)' },
    ],
    { duration: 260, easing: 'ease-out' },
  );
}

/**
 * Chuva de moedas: `count` moedas giram para fora da pedra (`from`) e voam em arco até o
 * contador (`to`), uma atrás da outra; cada uma que chega chama `onArrive(i)` e, na última,
 * o contador (`targetEl`) pulsa.
 */
export function coinRain(from, to, { count = 8, targetEl = null, onArrive = null } = {}) {
  const root = juiceLayer();
  if (!root || !from || !to || off()) return;
  const n = Math.max(1, Math.min(14, count));
  for (let i = 0; i < n; i += 1) {
    const el = sprite('coin', 20, from.x, from.y);
    const spin = document.createElement('span');
    spin.className = 'juice-coin-spin';
    spin.style.animationDelay = `${-i * 90}ms`;
    // a moeda é o fundo do giro (o giro em scaleX dá o 3D da moeda virando)
    spin.style.backgroundImage = el.style.backgroundImage;
    el.style.backgroundImage = '';
    el.appendChild(spin);
    root.appendChild(el);
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
    const burst = 26 + Math.random() * 22;
    const bx = Math.cos(a) * burst;
    const by = Math.sin(a) * burst * 0.7 - 18;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const anim = el.animate(
      [
        { transform: 'translate3d(0, 0, 0) scale(0.4)', opacity: 0 },
        { transform: `translate3d(${bx}px, ${by}px, 0) scale(1.15)`, opacity: 1, offset: 0.28 },
        { transform: `translate3d(${bx * 0.6 + dx * 0.45}px, ${Math.min(by, dy) - 40 + dy * 0.2}px, 0) scale(1)`, opacity: 1, offset: 0.62 },
        { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.55)`, opacity: 1, offset: 0.97 },
        { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.4)`, opacity: 0 },
      ],
      { duration: 720 + i * 14, delay: i * 55, easing: 'cubic-bezier(0.35, 0.1, 0.4, 1)', fill: 'backwards' },
    );
    anim.onfinish = () => {
      el.remove();
      onArrive?.(i);
      if (i === n - 1) pulse(targetEl);
    };
    anim.oncancel = () => el.remove();
  }
}

/** Faíscas da tranca: estilhaços em pixel saindo em leque de `at`, caindo com gravidade. */
export function sparkBurst(at, { count = 16, spread = 90 } = {}) {
  const root = juiceLayer();
  if (!root || !at || off()) return;
  for (let i = 0; i < count; i += 1) {
    const size = 10 + Math.round(Math.random() * 6);
    const el = sprite('spark', size, at.x, at.y);
    root.appendChild(el);
    const a = Math.random() * Math.PI * 2;
    const d = spread * (0.45 + Math.random() * 0.55);
    const ex = Math.cos(a) * d;
    const ey = Math.sin(a) * d * 0.75;
    const anim = el.animate(
      [
        { transform: 'translate3d(0, 0, 0) scale(1.2) rotate(0deg)', opacity: 1 },
        { transform: `translate3d(${ex * 0.7}px, ${ey * 0.7 - 10}px, 0) scale(1) rotate(${a * 60}deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate3d(${ex}px, ${ey + 24}px, 0) scale(0.3) rotate(${a * 120}deg)`, opacity: 0 },
      ],
      { duration: 420 + Math.random() * 240, easing: 'cubic-bezier(0.1, 0.7, 0.4, 1)' },
    );
    dropAfter(anim, el);
  }
}

/** Explosão de moedas (vitória na rodada): moedas para todo lado, subindo e caindo. */
export function coinBurst(at, { count = 18 } = {}) {
  const root = juiceLayer();
  if (!root || !at || off()) return;
  for (let i = 0; i < count; i += 1) {
    const el = sprite('coin', 18 + Math.round(Math.random() * 6), at.x, at.y);
    const spin = document.createElement('span');
    spin.className = 'juice-coin-spin';
    spin.style.backgroundImage = el.style.backgroundImage;
    spin.style.animationDelay = `${-i * 70}ms`;
    el.style.backgroundImage = '';
    el.appendChild(spin);
    root.appendChild(el);
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
    const v = 80 + Math.random() * 90;
    const ex = Math.cos(a) * v;
    const peak = Math.sin(a) * v;
    const anim = el.animate(
      [
        { transform: 'translate3d(0, 0, 0) scale(0.5)', opacity: 0 },
        { transform: `translate3d(${ex * 0.5}px, ${peak}px, 0) scale(1.1)`, opacity: 1, offset: 0.35 },
        { transform: `translate3d(${ex}px, ${peak * 0.3 + 120}px, 0) scale(0.9)`, opacity: 0 },
      ],
      { duration: 900 + Math.random() * 300, delay: Math.random() * 90, easing: 'cubic-bezier(0.2, 0.6, 0.5, 1)', fill: 'backwards' },
    );
    dropAfter(anim, el);
  }
}

/**
 * Congelamento dramático (hitstop): pausa todas as animações da página por `ms` e solta.
 * Devolve uma promessa que resolve quando o jogo volta a andar.
 */
export function hitstop(ms = 100) {
  return new Promise((resolve) => {
    if (off() || typeof document.getAnimations !== 'function') {
      setTimeout(resolve, ms);
      return;
    }
    const running = document.getAnimations().filter((a) => a.playState === 'running');
    running.forEach((a) => a.pause());
    document.documentElement.classList.add('is-hitstop');
    setTimeout(() => {
      document.documentElement.classList.remove('is-hitstop');
      running.forEach((a) => {
        try {
          a.play();
        } catch {
          // a animação já foi removida
        }
      });
      resolve();
    }, ms);
  });
}
