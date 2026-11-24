// A leitura e a gravação dos quadros de um personagem, em dois pedaços: <dir>/<key>.js (o parado,
// os humores e os pontos) e <dir>/<key>.g.js (os emotes: o braço subindo e o gesto).
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const header = (key, what) => `// gerado por tools/volume (não editar à mão): o ${key} em volume, ${what}.\n`;

/** Os dados inteiros de `key` (os dois pedaços juntos), ou null se ainda não existem. */
export async function readCast(dir, key) {
  const base = resolve(dir, `${key}.js`);
  if (!existsSync(base)) return null;
  const t = Date.now();
  const data = { ...(await import(`${base}?t=${t}`)).default };
  const g = resolve(dir, `${key}.g.js`);
  if (existsSync(g)) Object.assign(data, (await import(`${g}?t=${t}`)).default);
  return data;
}

/** Grava os dois pedaços de `key`; devolve o tamanho total (bytes). */
export function writeCast(dir, key, data) {
  const { frontG, frontR, sideG, sideR, ...rest } = data;
  const a = `${header(key, 'de frente e sentado: o parado, os humores e os pontos')}export default ${JSON.stringify(rest)};\n`;
  const b = `${header(key, 'os emotes (o braço subindo e o gesto), de frente e sentado')}export default ${JSON.stringify({ frontG, frontR, sideG, sideR })};\n`;
  writeFileSync(resolve(dir, `${key}.js`), a);
  writeFileSync(resolve(dir, `${key}.g.js`), b);
  return a.length + b.length;
}
