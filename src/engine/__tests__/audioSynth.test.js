import { afterEach, describe, expect, it, vi } from 'vitest';
import { RIVAL_IDS } from '../../data/rivals.js';
import { SoundEngine, voiceProfile } from '../audioSynth.js';

describe('vozes dos rivais', () => {
  it('cada um dos 18 rivais tem voz própria (nenhum cai no perfil padrão)', () => {
    const fallback = voiceProfile('ninguém');
    const signatures = new Set();
    for (const id of RIVAL_IDS) {
      const voice = voiceProfile(id);
      expect(voice, id).not.toBe(fallback);
      expect(voice.speed, id).toBeGreaterThanOrEqual(50);
      signatures.add(`${voice.baseFreq}/${voice.type}/${voice.speed}`);
    }
    expect(signatures.size).toBe(RIVAL_IDS.length);
    expect(voiceProfile('neide')).toBe(voiceProfile('donaNeide'));
    expect(voiceProfile('arlindo')).toBe(voiceProfile('seuArlindo'));
  });
});

describe('fala letra a letra', () => {
  afterEach(() => vi.useRealTimers());

  it('mostra a frase aos poucos no ritmo do personagem, mesmo sem áudio', () => {
    vi.useFakeTimers();
    const engine = new SoundEngine();
    const seen = [];
    engine.speakPhrase('Oi, você!', 'tioZe', (text) => seen.push(text));
    vi.advanceTimersByTime(voiceProfile('tioZe').speed * 3);
    expect(seen).toEqual(['O', 'Oi', 'Oi,']);
    vi.advanceTimersByTime(5000);
    expect(seen.at(-1)).toBe('Oi, você!');
  });

  it('uma fala nova corta a anterior; a função devolvida também corta', () => {
    vi.useFakeTimers();
    const engine = new SoundEngine();
    const first = [];
    const second = [];
    engine.speakPhrase('primeira fala comprida', 'tonho', (t) => first.push(t));
    vi.advanceTimersByTime(voiceProfile('tonho').speed * 2);
    const stop = engine.speakPhrase('segunda', 'tonho', (t) => second.push(t));
    vi.advanceTimersByTime(5000);
    expect(first).toHaveLength(2);
    expect(second.at(-1)).toBe('segunda');
    const third = [];
    engine.speakPhrase('terceira', 'tonho', (t) => third.push(t))();
    vi.advanceTimersByTime(5000);
    expect(third).toEqual([]);
    stop();
  });
});

describe('trilha', () => {
  it('sem áudio disponível nada quebra, e a faixa pedida fica guardada para quando desmutar', () => {
    const engine = new SoundEngine();
    engine.isMuted = true;
    engine.playTrack('sinucaFunk');
    expect(engine.currentTrack).toBe('sinucaFunk');
    expect(engine.isPlayingMusic).toBe(false);
    engine.isMuted = false;
    expect(() => engine.playTrack('bossFight')).not.toThrow();
    expect(() => engine.playTileSlam(true, 'chumbo')).not.toThrow();
    expect(engine.currentTrack).toBe('bossFight');
  });
});
