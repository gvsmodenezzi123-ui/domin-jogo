// Gera a página pública da Política de Privacidade a partir de src/data/privacy.js:
//   public/privacy.html           → .../domin-jogo/privacy.html
//   public/privacidade/index.html → .../domin-jogo/privacidade/
// HTML estático, sem script nem recurso externo (abre na hora, sem rastreador).
// Uso: node scripts/privacy-page.mjs (rode de novo sempre que mudar o texto).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRIVACY, PRIVACY_EMAIL } from '../src/data/privacy.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function chunks(list) {
  return list
    .map((c) => {
      if (typeof c === 'string') return esc(c);
      if (c.code) return `<code>${esc(c.code)}</code>`;
      if (c.b === PRIVACY_EMAIL) return `<strong><a href="mailto:${esc(PRIVACY_EMAIL)}">${esc(PRIVACY_EMAIL)}</a></strong>`;
      return `<strong>${esc(c.b)}</strong>`;
    })
    .join('');
}

function page(base) {
  const sections = PRIVACY.sections
    .map((s) => {
      const paras = (s.paragraphs ?? []).map((p) => `      <p>${chunks(p)}</p>`).join('\n');
      const items = s.items ? `\n      <ul>\n${s.items.map((i) => `        <li>${chunks(i)}</li>`).join('\n')}\n      </ul>` : '';
      return `    <section>\n      <h2>${esc(s.title)}</h2>\n${paras}${items}\n    </section>`;
    })
    .join('\n\n');
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Política de Privacidade — Buxaria</title>
  <meta name="description" content="Política de Privacidade do jogo Buxaria: nenhum dado pessoal é coletado; o progresso fica só no seu aparelho." />
  <meta name="robots" content="index, follow" />
  <meta name="color-scheme" content="dark" />
  <meta name="theme-color" content="#121212" />
  <link rel="icon" href="${base}icons/icon-192.png" />
  <style>
    :root {
      --bg: #121212;
      --text: #e0e0e0;
      --dim: #a7a29a;
      --brass: #d9b56a;
      --brass-hi: #ffd27a;
      --line: #2a2622;
      --card: #191714;
    }
    * { box-sizing: border-box; }
    html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 17px/1.65 system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    main {
      max-width: 720px;
      margin: 0 auto;
      padding: max(env(safe-area-inset-top), 28px) 16px max(env(safe-area-inset-bottom), 40px);
    }
    .kicker {
      margin: 0 0 6px;
      font: 700 12px/1.2 ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
      letter-spacing: 0.32em;
      color: var(--brass);
    }
    h1 { margin: 0; font-size: 1.7rem; line-height: 1.2; color: #fff; }
    .updated { margin: 8px 0 0; color: var(--dim); font-size: 0.95rem; }
    .intro {
      margin: 22px 0 8px;
      padding: 14px 16px;
      background: var(--card);
      border: 1px solid var(--line);
      border-left: 3px solid var(--brass);
      border-radius: 6px;
    }
    section { margin-top: 26px; }
    h2 { margin: 0 0 8px; font-size: 1.15rem; line-height: 1.3; color: var(--brass-hi); }
    p { margin: 0 0 10px; }
    ul { margin: 0 0 10px; padding-left: 1.25em; }
    li { margin: 0 0 8px; }
    strong { color: #fff; }
    code {
      padding: 0.08em 0.36em;
      background: #24211d;
      border: 1px solid var(--line);
      border-radius: 4px;
      font: 0.9em ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
      color: var(--brass-hi);
    }
    a { color: var(--brass-hi); text-underline-offset: 3px; overflow-wrap: anywhere; }
    a:focus-visible { outline: 2px solid var(--brass-hi); outline-offset: 2px; }
    footer {
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
      color: var(--dim);
      font-size: 0.92rem;
    }
  </style>
</head>
<body>
  <main>
    <p class="kicker">BUXARIA</p>
    <h1>${esc(PRIVACY.title)}</h1>
    <p class="updated"><strong>${esc(PRIVACY.updated)}</strong></p>

    <p class="intro">${chunks(PRIVACY.intro)}</p>

${sections}

    <footer>
      <p><a href="${base}">Voltar para o Buxaria</a></p>
    </footer>
  </main>
</body>
</html>
`;
}

for (const [file, base] of [
  ['public/privacy.html', './'],
  ['public/privacidade/index.html', '../'],
]) {
  const out = join(root, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, page(base));
  console.log(`ok ${file}`);
}
