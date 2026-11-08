/**
 * Versão 2.12: a abertura deitada, "Efeito Dominó" (o roteiro em openingPlan.js, a pintura em
 * openingArt.js, cada quadro em openingFrame.js, o som em openingAudio.js). Um canvas do tamanho
 * do quadro em pixels da pintura (548 × 313, com a sobra) ampliado no palco 16:9 (LandStage). Tudo é função do tempo da cena, então o
 * PULAR, a pausa (app em segundo plano, celular em pé) e o som ficam sempre casados.
 *
 * Quem abre a abertura é o toque de entrada (AccessGate): o som já está destravado.
 */
import { useCallback, useRef, useState } from 'react';
import LandStage from '../components/LandStage.jsx';
import { prefersReducedMotion } from '../components/motion.js';
import { sound } from '../engine/audioSynth.js';
import { HANDOFF, NEON_ON, PAD, SCENE_SECONDS } from './openingPlan.js';
import { VH, VW, buildArt, drawFrame } from './openingFrame.js';
import { OPENING_TRACK, scheduleOpeningSound } from './openingAudio.js';

const PORTRAIT = '(orientation: portrait) and (pointer: coarse)';

/**
 * `skippable`: mostra o PULAR (da 2ª abertura em diante). `onDone()` no fim ou no PULAR.
 */
export default function OpeningScene({ skippable = false, onDone }) {
  const [leaving, setLeaving] = useState(false);
  const api = useRef({ skip: () => {} });

  const canvasRef = useCallback(
    (canvas) => {
      if (!canvas) return undefined;
      const g = canvas.getContext('2d', { alpha: false });
      g.imageSmoothingEnabled = false;
      const reduced = prefersReducedMotion();
      const mountAt = performance.now();
      let art = null;
      let sceneStart = null;
      let raf = 0;
      let disposed = false;
      let finished = false;
      let leavingShown = false;
      let pausedAt = null;
      let audioOn = false;
      let skipped = false;
      let stops = [];
      let musicTimer = 0;
      const timers = new Set();
      const portrait = window.matchMedia?.(PORTRAIT);

      const sceneTime = () => (sceneStart == null ? -1 : (performance.now() - sceneStart) / 1000);

      const stopAudio = () => {
        for (const stop of stops) stop();
        stops = [];
        clearTimeout(musicTimer);
        audioOn = false;
      };

      const titleMusic = () => {
        if (sound.isMuted || !sound.ctx || sound.ctx.state !== 'running') return;
        sound.playTrack(OPENING_TRACK);
      };

      const startAudio = () => {
        if (audioOn || skipped || disposed || finished || reduced || sound.isMuted || !art || sceneStart == null || pausedAt != null) return;
        const ctx = sound.ctx;
        if (!ctx || ctx.state !== 'running' || !sound.master) return;
        const now = sceneTime();
        if (now >= SCENE_SECONDS) return;
        audioOn = true;
        stops.push(scheduleOpeningSound({ ctx, out: sound.master, t0: ctx.currentTime - now + 0.03, from: Math.max(0, now), sfx: sound.sfxVolume }));
        if (now < NEON_ON) musicTimer = setTimeout(titleMusic, Math.max(0, (NEON_ON - now) * 1000));
        else if (!sound.isPlayingMusic) titleMusic();
      };

      // se o sistema ainda segurar o áudio, qualquer toque destrava
      const wake = () => {
        sound.init();
        startAudio();
      };
      const onState = () => startAudio();
      sound.init();
      sound.ctx?.addEventListener?.('statechange', onState);
      window.addEventListener('pointerdown', wake, { passive: true });

      const finish = () => {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(raf);
        onDone?.();
      };

      // em segundo plano ou com o celular em pé (o aviso de girar por cima), a cena espera
      const pause = () => {
        if (pausedAt == null) pausedAt = performance.now();
        stopAudio();
      };
      const resume = () => {
        if (pausedAt == null) return;
        if (sceneStart != null) sceneStart += performance.now() - pausedAt;
        pausedAt = null;
        sound.init();
        startAudio();
      };
      const shouldWait = () => document.visibilityState === 'hidden' || Boolean(portrait?.matches);
      const onPauseChange = () => (shouldWait() ? pause() : resume());
      document.addEventListener('visibilitychange', onPauseChange);
      portrait?.addEventListener?.('change', onPauseChange);

      api.current.skip = () => {
        if (finished) return;
        skipped = true;
        stopAudio();
        titleMusic();
        setLeaving(true);
        const id = setTimeout(finish, 260);
        timers.add(id);
      };

      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (pausedAt != null) return;
        const T = sceneTime();
        if (!art || T < 0) {
          g.fillStyle = '#000';
          g.fillRect(0, 0, VW, VH);
          return;
        }
        if (T >= SCENE_SECONDS - HANDOFF && !leavingShown) {
          leavingShown = true;
          setLeaving(true);
        }
        drawFrame(g, art, Math.min(T, SCENE_SECONDS));
        if (T >= SCENE_SECONDS) finish();
      };
      raf = requestAnimationFrame(loop);
      if (shouldWait()) pause();

      // pinta o salão fora do commit do React, já na tela preta
      const paintId = setTimeout(() => {
        if (disposed) return;
        try {
          art = buildArt();
        } catch (error) {
          console.error('abertura', error);
          finish();
          return;
        }
        // animações reduzidas: só o quadro final, com o neon aceso, por um instante
        sceneStart = reduced ? performance.now() - (SCENE_SECONDS - 1.6) * 1000 : Math.max(mountAt + 350, performance.now());
        if (pausedAt != null) pausedAt = performance.now();
        startAudio();
      }, 30);
      timers.add(paintId);

      return () => {
        disposed = true;
        cancelAnimationFrame(raf);
        timers.forEach(clearTimeout);
        if (!finished) stopAudio();
        else clearTimeout(musicTimer);
        sound.ctx?.removeEventListener?.('statechange', onState);
        window.removeEventListener('pointerdown', wake);
        document.removeEventListener('visibilitychange', onPauseChange);
        portrait?.removeEventListener?.('change', onPauseChange);
      };
    },
    [onDone],
  );

  return (
    <div className={`opening ${leaving ? 'is-leaving' : ''}`} role="img" aria-label="Abertura: de madrugada, no boteco fechado, uma fileira de dominó cai pelo salão inteiro e acende o neon do Buxaria">
      <LandStage bleed="#000" className="opening-stage" role="presentation">
        <canvas ref={canvasRef} width={VW} height={VH} className="opening-canvas" aria-hidden="true" style={{ left: -PAD.x * 2, top: -PAD.y * 2, width: VW * 2, height: VH * 2 }} />
      </LandStage>
      {skippable && (
        <button type="button" className="opening-skip" onClick={() => api.current.skip()}>
          PULAR ›
        </button>
      )}
    </div>
  );
}
