import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RELICS } from '../../data/relics.js';
import { RIVALS } from '../../data/rivals.js';
import { ART_EMBER, RELIC_ART, RIVAL_ART } from '../artRegistry.js';
import { CanecaChoppIcon, DadoViciadoIcon, OlhoVidroIcon, TioZeAvatar } from '../HighDensitySprites.jsx';
import { RetroCard } from '../RetroCard.jsx';

describe('sprites de alta densidade', () => {
  it('aplicam o tamanho pedido (className chega no <svg>)', () => {
    for (const Art of [TioZeAvatar, CanecaChoppIcon, DadoViciadoIcon, OlhoVidroIcon]) {
      const html = renderToStaticMarkup(<Art className="w-14 h-14" />);
      expect(html).toContain('class="w-14 h-14 inline-block select-none"');
      expect(html).toContain('viewBox="0 0 40 40"');
    }
  });

  it('os 40 talismãs e os 18 rivais têm arte 40x40 própria', () => {
    const relicArt = new Set();
    for (const relic of Object.values(RELICS)) {
      expect(RELIC_ART[relic.art], relic.id).toBeTruthy();
      relicArt.add(RELIC_ART[relic.art]);
    }
    expect(relicArt.size).toBe(Object.keys(RELICS).length);
    const rivalArt = new Set();
    for (const rival of Object.values(RIVALS)) {
      expect(RIVAL_ART[rival.art], rival.id).toBeTruthy();
      rivalArt.add(RIVAL_ART[rival.art]);
      // todo retrato desenha os 4 humores e a boca falando, em 40x40
      for (const mood of ['idle', 'thinking', 'smug', 'hurt']) {
        const Art = RIVAL_ART[rival.art];
        const html = renderToStaticMarkup(<Art className="w-12 h-12" mood={mood} isSpeaking={mood === 'idle'} />);
        expect(html, `${rival.id}.${mood}`).toContain('viewBox="0 0 40 40"');
      }
    }
    expect(rivalArt.size).toBe(Object.keys(RIVALS).length);
    expect(RELICS.caneca.art).toBe('canecaChopp');
    expect(RELICS.dadoViciado.art).toBe('dadoViciado');
    expect(RELICS.olhoDeVidro.art).toBe('olhoVidro');
    expect(RIVALS.tioZe.art).toBe('tioZe');
  });

  it('Tio Zé: boca abre falando, cigarro cai quando ferido (e a fumaça para)', () => {
    const closed = renderToStaticMarkup(<TioZeAvatar />);
    const open = renderToStaticMarkup(<TioZeAvatar isSpeaking />);
    expect(open).toContain('height="4" fill="#220b0b"');
    expect(closed).not.toContain('fill="#220b0b"');
    expect(renderToStaticMarkup(<TioZeAvatar mood="hurt" />)).not.toContain('#ea580c'); // brasa
    expect(closed).toContain('#ea580c');
    expect(ART_EMBER.tioZe.moods).not.toContain('hurt');
  });
});

describe('RetroCard', () => {
  it('pinta a borda pela raridade do jogo e aceita outra tag e atributos', () => {
    const html = renderToStaticMarkup(
      <RetroCard as="li" rarity="lendario" data-x="1">
        oi
      </RetroCard>,
    );
    expect(html.startsWith('<li')).toBe(true);
    expect(html).toContain('border-purple-500');
    expect(html).toContain('active:translate-y-1');
    expect(html).toContain('data-x="1"');
    expect(renderToStaticMarkup(<RetroCard rarity="mitico" />)).toContain('border-amber-400');
    expect(renderToStaticMarkup(<RetroCard rarity="comum" />)).toContain('border-emerald-600');
    expect(renderToStaticMarkup(<RetroCard rarity="qualquer" />)).toContain('border-zinc-600');
  });
});
