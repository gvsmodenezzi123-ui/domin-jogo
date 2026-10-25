import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PRIVACY, PRIVACY_EMAIL, PRIVACY_URL, plainOf } from '../../data/privacy.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (file) => readFileSync(join(root, file), 'utf8');

/** O texto que a página mostra (sem tags, entidades decodificadas, espaços normalizados). */
const textOf = (html) =>
  html
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<\/?(strong|code|a)\b[^>]*>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
const norm = (s) => s.replace(/\s+/g, ' ').trim();

describe('Patch 0.9.7: Política de Privacidade', () => {
  const pages = ['public/privacy.html', 'public/privacidade/index.html'].map((file) => [file, read(file)]);

  it('as duas páginas públicas dizem palavra por palavra o que o jogo mostra', () => {
    const pieces = [PRIVACY.title, PRIVACY.updated, plainOf(PRIVACY.intro)];
    for (const s of PRIVACY.sections) {
      pieces.push(s.title, ...(s.paragraphs ?? []).map(plainOf), ...(s.items ?? []).map(plainOf));
    }
    for (const [file, html] of pages) {
      const text = textOf(html);
      for (const piece of pieces) expect(text.includes(norm(piece)), `${file}: ${piece.slice(0, 50)}`).toBe(true);
      expect(html).toContain(`href="mailto:${PRIVACY_EMAIL}"`);
    }
    expect(pages[0][1].replaceAll('href="./', 'href="../')).toBe(pages[1][1]);
  });

  it('página leve: UTF-8, viewport, fundo #121212, texto #e0e0e0, sem script nem nada externo', () => {
    for (const [file, html] of pages) {
      expect(html, file).toMatch(/<meta charset="utf-8"/);
      expect(html, file).toMatch(/<meta name="viewport" content="width=device-width/);
      expect(html, file).toContain('--bg: #121212');
      expect(html, file).toContain('--text: #e0e0e0');
      expect(html, file).not.toMatch(/<script/i);
      expect(html, file).not.toMatch(/(src|href)="https?:/i);
      expect(html, file).toContain('lang="pt-BR"');
    }
  });

  it('o endereço público é o da página no GitHub Pages do jogo, e o e-mail de suporte é o certo', () => {
    expect(PRIVACY_URL).toMatch(/^https:\/\/[a-z0-9-]+\.github\.io\/domin-jogo\/privacy\.html$/);
    expect(PRIVACY.sections).toHaveLength(7);
    // versão 1.2: a mesa online (o que sai do aparelho e o servidor do PeerJS) está explicada
    expect(PRIVACY.sections[2].title).toBe('3. Mesa Online (opcional)');
    expect(PRIVACY.sections[2].items.map(plainOf).join(' ')).toContain('0.peerjs.com');
    expect(PRIVACY_EMAIL).toBe('gabrielmodenezzi10@gmail.com');
  });

  it('o service worker não troca o jogo pela página da política no cache', () => {
    const sw = read('public/sw.js');
    expect(sw).toContain("const key = shell ? './index.html' : request;");
    expect(sw).toContain('if (response.ok)');
  });
});
