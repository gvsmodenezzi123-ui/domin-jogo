// Abertura do jogo: 2 s de tela preta e ~9 s de cena em primeira pessoa, chegando no boteco de
// madrugada (rua chuvosa → cortina de fitas → o Tio Zé na mesa → a bucha → o logo). Tudo é
// desenhado num canvas por `renderer.js`; aqui ficam o relógio, o som e o PULAR.
//
// Som: tenta tocar sozinho (no app Android o WebView deixa). Se o sistema segurar o áudio até
// um toque (navegador), a cena segue e o som entra no ponto certo assim que alguém tocar.
// No fim, a abertura some por cima da tela inicial: a lâmpada e o logo do último quadro ficam
// exatamente onde estão os da tela inicial (`measureTarget`).
import { useCallback, useRef, useState } from 'react';
import { prefersReducedMotion } from '../components/motion.js';
import { sound } from '../engine/audioSynth.js';
import { INTRO_TRACK, scheduleIntroSound, scheduleRadio } from './introAudio.js';
import { BEATS, SCENE_SECONDS, SHOTS, createIntroRenderer } from './renderer.js';
import { loadIntroSprites } from './sprites.jsx';

export const INTRO_BLACK_MS = 2000;
/** Os últimos segundos em que a abertura se desfaz por cima da tela inicial. */
const HANDOFF = 0.45;

function backingSize(el) {
  const w = Math.max(1, el.clientWidth);
  const h = Math.max(1, el.clientHeight);
  // até 900 px de largura: a pixel art não ganha nada acima disso e o celular fraco agradece
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5, 900 / w);
  return [Math.round(w * dpr), Math.round(h * dpr)];
}

async function loadFonts() {
  if (!document.fonts?.load) return;
  const wait = new Promise((resolve) => setTimeout(resolve, 1500));
  await Promise.race([Promise.all([document.fonts.load('20px "VT323"'), document.fonts.load('10px "Press Start 2P"')]).catch(() => {}), wait]);
}

/**
 * `skippable`: mostra o PULAR (da 2ª abertura em diante). `onDone()` no fim ou no PULAR.
 * `measureTarget()`: devolve os retângulos (px da tela) do logo e da lâmpada da tela inicial.
 */
export default function IntroScene({ skippable = false, onDone, measureTarget }) {
  const [leaving, setLeaving] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const api = useRef({ skip: () => {} });

  const canvasRef = useCallback(
    (canvas) => {
      if (!canvas) return undefined;
      const g = canvas.getContext('2d', { alpha: false });
      const mountAt = performance.now();
      const reduced = prefersReducedMotion();
      let renderer = null;
      let sceneStart = null;
      let raf = 0;
      let disposed = false;
      let finished = false;
      let leavingShown = false;
      let pausedAt = null;
      let audioOn = false;
      let stops = [];
      let musicTimer = 0;
      let hintTimer = 0;
      let target = null;
      const timers = new Set();

      const sceneTime = () => (sceneStart == null ? -1 : (performance.now() - sceneStart) / 1000);

      /** Retângulos da tela inicial → pixels do canvas. */
      const measure = () => {
        const r = measureTarget?.();
        if (!r?.logo || !r?.lamp) return null;
        const k = canvas.width / Math.max(1, canvas.clientWidth);
        const box = canvas.getBoundingClientRect();
        return {
          logo: { x: (r.logo.left - box.left + r.logo.width / 2) * k, y: (r.logo.top - box.top + r.logo.height / 2) * k, w: r.logo.width * k },
          lamp: { x: (r.lamp.left - box.left + r.lamp.width / 2) * k, y: (r.lamp.top - box.top) * k, size: r.lamp.width * k },
        };
      };

      const stopAudio = () => {
        for (const stop of stops) stop();
        stops = [];
        clearTimeout(musicTimer);
        audioOn = false;
      };

      /** A trilha de verdade entra com a batida do logo e segue tocando no menu. */
      const titleMusic = (hard) => {
        if (sound.isMuted || !sound.ctx || sound.ctx.state !== 'running') return;
        sound.playTrack(INTRO_TRACK);
        if (!hard || !sound.musicBus || !sound.seq) return;
        const gain = sound.musicBus.gain;
        const now = sound.ctx.currentTime;
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(0.0001, now);
        gain.setValueAtTime(Math.max(0.0001, sound.musicLevel()), Math.max(now, sound.seq.next));
      };

      const startAudio = () => {
        if (audioOn || disposed || finished || sound.isMuted || !renderer || sceneStart == null) return;
        const ctx = sound.ctx;
        if (!ctx || ctx.state !== 'running' || !sound.master) return;
        const now = sceneTime();
        if (now >= SCENE_SECONDS) return;
        audioOn = true;
        clearTimeout(hintTimer);
        setNeedsTap(false);
        const from = Math.max(0, now);
        const t0 = ctx.currentTime - now + 0.03;
        stops.push(scheduleIntroSound({ ctx, out: sound.master, t0, from, sfx: sound.sfxVolume }));
        if (from < BEATS.slam) stops.push(scheduleRadio({ ctx, out: sound.master, t0, from, music: sound.musicVolume }));
        if (now < BEATS.logo) musicTimer = setTimeout(() => titleMusic(true), Math.max(0, (BEATS.logo - 0.08 - now) * 1000));
        else if (!sound.isPlayingMusic) titleMusic(false);
      };

      // o áudio pode estar travado até um toque: tenta destravar a cada toque e entra quando rodar
      const wake = () => {
        sound.init();
        startAudio();
      };
      const onState = () => startAudio();
      sound.init();
      sound.ctx?.addEventListener?.('statechange', onState);
      window.addEventListener('pointerdown', wake, { passive: true });
      window.addEventListener('keydown', wake);

      const finish = () => {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(raf);
        onDone?.();
      };

      const onVisibility = () => {
        if (document.visibilityState === 'hidden') {
          if (pausedAt == null) pausedAt = performance.now();
          stopAudio();
        } else if (pausedAt != null) {
          if (sceneStart != null) sceneStart += performance.now() - pausedAt;
          pausedAt = null;
          sound.init();
          startAudio();
        }
      };
      document.addEventListener('visibilitychange', onVisibility);

      api.current.skip = () => {
        if (finished) return;
        stopAudio();
        titleMusic(false);
        setLeaving(true);
        const id = setTimeout(finish, 260);
        timers.add(id);
      };

      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (pausedAt != null) return;
        const [w, h] = backingSize(canvas);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          target = null;
        }
        const T = sceneTime();
        if (!renderer || T < 0) {
          g.fillStyle = '#000';
          g.fillRect(0, 0, canvas.width, canvas.height);
          return;
        }
        if (T >= SHOTS.logo[0] && !target) target = measure();
        if (T >= SCENE_SECONDS - HANDOFF && !leavingShown) {
          leavingShown = true;
          target = measure() ?? target;
          setLeaving(true);
        }
        renderer.render(Math.min(T, SCENE_SECONDS), { target });
        if (T >= SCENE_SECONDS) finish();
      };
      raf = requestAnimationFrame(loop);

      // carrega os personagens e as fontes durante a tela preta (fora do commit do React: os
      // sprites são montados numa raiz à parte)
      new Promise((resolve) => setTimeout(resolve, 0))
        .then(() => Promise.all([loadIntroSprites(), loadFonts()]))
        .then(([sprites]) => {
          if (disposed) return;
          renderer = createIntroRenderer(canvas, sprites, { reduced });
          sceneStart = Math.max(mountAt + INTRO_BLACK_MS, performance.now());
          startAudio();
          // sem som até agora (navegador segurando): avisa que um toque liga
          hintTimer = setTimeout(
            () => {
              if (!audioOn && !sound.isMuted && !disposed) setNeedsTap(true);
            },
            Math.max(0, sceneStart - performance.now()) + 400,
          );
        })
        .catch((error) => {
          console.error('abertura', error);
          finish();
        });

      return () => {
        disposed = true;
        cancelAnimationFrame(raf);
        clearTimeout(hintTimer);
        timers.forEach(clearTimeout);
        if (!finished) stopAudio();
        else clearTimeout(musicTimer);
        sound.ctx?.removeEventListener?.('statechange', onState);
        window.removeEventListener('pointerdown', wake);
        window.removeEventListener('keydown', wake);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    },
    [onDone, measureTarget],
  );

  return (
    <div className={`intro ${leaving ? 'is-leaving' : ''}`} role="img" aria-label="Abertura: chegando no boteco de madrugada">
      <canvas ref={canvasRef} className="intro-canvas" aria-hidden="true" />
      {needsTap && <p className="intro-sound">Toque na tela para ligar o som</p>}
      {skippable && (
        <button type="button" className="intro-skip" onClick={() => api.current.skip()}>
          PULAR ›
        </button>
      )}
    </div>
  );
}
